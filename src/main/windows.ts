import { app, BrowserWindow, clipboard, dialog, Menu, screen, shell } from 'electron';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

/**
 * Transparent gutter (px) kept around the splash card so its drop shadow is not
 * clipped by the window edge. MUST match the `calc(100vw - 2*GUTTER)` in
 * assets/splash.html — too small a gutter shears the blur into a hard edge.
 */
const SPLASH_SHADOW_GUTTER = 28;

export function createSplash(): BrowserWindow {
  const win = new BrowserWindow({
    // Window = card + gutter on both sides, so the visible card is 980x640.
    width: 980 + SPLASH_SHADOW_GUTTER * 2,
    height: 640 + SPLASH_SHADOW_GUTTER * 2,
    frame: false, resizable: false,
    minimizable: true, maximizable: false, closable: true,
    center: true, transparent: true,
    backgroundColor: '#00000000', show: false,
    title: 'DSH-DesktopX',
    webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  void win.loadFile(join(__dirname, '../../assets/splash.html'));
  win.once('ready-to-show', () => win.show());
  return win;
}

/** Toast card size and the shadow gutter around it (see assets/toast.html). */
const TOAST_CARD_W = 300;
const TOAST_CARD_H = 86;
const TOAST_SHADOW_GUTTER = 14;

/** Frameless, click-through toast pinned to the bottom-right of the main window. */
export function createToast(parent: BrowserWindow): BrowserWindow {
  const win = new BrowserWindow({
    width: TOAST_CARD_W + TOAST_SHADOW_GUTTER * 2,
    height: TOAST_CARD_H + TOAST_SHADOW_GUTTER * 2,
    frame: false, resizable: false, show: false,
    parent, skipTaskbar: true, focusable: false,
    transparent: true, backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.setIgnoreMouseEvents(true);
  void win.loadFile(join(__dirname, '../../assets/toast.html'));
  return win;
}

/** Keep the toast card (not the shadow gutter) inset `margin` from the parent edges. */
export function positionToast(toast: BrowserWindow, parent: BrowserWindow, margin = 20): void {
  if (parent.isDestroyed() || toast.isDestroyed()) return;
  const bounds = parent.getContentBounds();
  const [w, h] = toast.getSize();
  // Offset by the gutter so the *card* sits at `margin`, leaving shadow room outside it.
  toast.setPosition(
    Math.round(bounds.x + bounds.width - w - margin + TOAST_SHADOW_GUTTER),
    Math.round(bounds.y + bounds.height - h - margin + TOAST_SHADOW_GUTTER),
  );
}

/**
 * Save `contents` to a user-chosen path via the native save dialog.
 * Returns silently when the user cancels.
 */
async function saveBufferAs(
  parent: BrowserWindow,
  contents: Buffer,
  defaultName: string,
  filters: Electron.FileFilter[],
): Promise<void> {
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: defaultName,
    filters,
  });
  if (canceled || filePath === undefined || filePath === '') return;
  await writeFile(filePath, contents);
}

/**
 * Save a <video> element's current frame as a PNG file: draw the frame to
 * an offscreen canvas in the renderer, then save the bytes via the native
 * save dialog. Works for blob: and same-origin http(s) sources; canvases
 * tainted by cross-origin video without CORS throw and surface a message.
 */
async function saveVideoFrameAs(parent: BrowserWindow, wc: Electron.WebContents): Promise<void> {
  const dataUrl: string = await wc.executeJavaScript(`(() => {
    const v = document.elementFromPoint(__dshCtxX, __dshCtxY)?.closest?.('video');
    const video = v ?? document.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) throw new Error('no-video');
    if (video.readyState < 2 || video.videoWidth === 0) throw new Error('not-ready');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('no-2d-context');
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/png');
  })();`);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await saveBufferAs(parent, Buffer.from(base64, 'base64'), `video-frame-${Date.now().toString()}.png`, [
    { name: 'PNG 图片', extensions: ['png'] },
    { name: '所有文件', extensions: ['*'] },
  ]);
}

/** Download `url` to a Buffer inside the renderer (works for blob: too). */
async function fetchAsBuffer(
  wc: Electron.WebContents,
  url: string,
): Promise<Buffer> {
  const dataUrl: string = await wc.executeJavaScript(`(async () => {
    const res = await fetch(${JSON.stringify(url)});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return 'data:application/octet-stream;base64,' + btoa(bin);
  })();`);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Buffer.from(base64, 'base64');
}

function imageExtension(mime: string, srcURL: string): string {
  const fromMime = /^image\/([a-z0-9+]+)/u.exec(mime)?.[1]?.toLowerCase();
  if (fromMime !== undefined) {
    if (fromMime === 'jpeg') return 'jpg';
    if (fromMime === 'svg+xml') return 'svg';
    if (/^[a-z0-9]+$/u.test(fromMime)) return fromMime;
  }
  const fromPath = /\.([a-z0-9]{2,5})(?:[?#]|$)/iu.exec(srcURL)?.[1]?.toLowerCase();
  if (fromPath !== undefined) return fromPath === 'jpeg' ? 'jpg' : fromPath;
  return 'png';
}

/**
 * Serialize the SVG under the click point to source text: prefers an inline
 * <svg> element at (__dshCtxX, __dshCtxY), falls back to fetching the <img>
 * file when it is SVG (data:, blob:, http(s)). Returns null when there is
 * no SVG there. Order matters — an <img> wraps at most one file, while
 * inline SVG is the live DOM node the user is pointing at.
 */
async function readSvgSource(
  wc: Electron.WebContents,
): Promise<{ text: string } | null> {
  return wc.executeJavaScript(`(async () => {
    const x = window.__dshCtxX, y = window.__dshCtxY;
    const el = (typeof x === 'number') ? document.elementFromPoint(x, y) : null;
    const svg = el?.closest?.('svg');
    if (svg instanceof SVGSVGElement) {
      return { text: new XMLSerializer().serializeToString(svg) };
    }
    const img = el?.closest?.('img');
    const src = (img instanceof HTMLImageElement) ? (img.currentSrc || img.src) : '';
    if (src === '') return null;
    if (/^data:image\\/svg\\+xml/u.test(src)) {
      const comma = src.indexOf(',');
      const meta = src.slice(0, comma);
      const payload = src.slice(comma + 1);
      return { text: /;base64$/u.test(meta) ? atob(payload) : decodeURIComponent(payload) };
    }
    if (/\\.svg(?:[?#]|$)/iu.test(src) || src.startsWith('blob:')) {
      const res = await fetch(src);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { text: await res.text() };
    }
    return null;
  })();`);
}

/** Save the click-point SVG node (or its <img> file) as a .svg file. */
async function saveSvgAs(parent: BrowserWindow, wc: Electron.WebContents): Promise<void> {
  const found = await readSvgSource(wc);
  if (found === null) throw new Error('no-svg');
  await saveBufferAs(parent, Buffer.from(found.text, 'utf8'), `image-${Date.now().toString()}.svg`, [
    { name: 'SVG 矢量图', extensions: ['svg'] },
    { name: '所有文件', extensions: ['*'] },
  ]);
}

/**
 * Render the click-point SVG to PNG via an offscreen <img> + canvas: for
 * when the user wants pixels (chat paste, slides) rather than the vector
 * source. Throws when there is no SVG there.
 */
async function saveSvgPngAs(parent: BrowserWindow, wc: Electron.WebContents): Promise<void> {
  const found = await readSvgSource(wc);
  if (found === null) throw new Error('no-svg');
  const dataUrl: string = await wc.executeJavaScript(`(async () => {
    const svgText = ${JSON.stringify(found.text)};
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('raster-failed'));
        img.src = url;
      });
      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 1024;
      const scale = Math.min(1, 2048 / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (ctx === null) throw new Error('no-2d-context');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  })();`);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await saveBufferAs(parent, Buffer.from(base64, 'base64'), `image-${Date.now().toString()}.png`, [
    { name: 'PNG 图片', extensions: ['png'] },
    { name: '所有文件', extensions: ['*'] },
  ]);
}

/** Shared error box for the save handlers. */
function showSaveError(parent: BrowserWindow, what: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  void dialog.showMessageBox(parent, {
    type: 'error',
    title: 'DSH-DesktopX',
    message: `${what}保存失败：${msg}`,
  });
}

/**
 * Initial main-window size is derived from the primary display's work area
 * instead of hardcoded pixels. Calibration: on a 1536x824 work area the
 * 1191x776 window felt right (≈77.5% of the width, ≈94.2% of the height),
 * so those ratios are the spec — 1191/1536 = 0.775, 776/824 = 0.942.
 * The window is then fitted inside the work area (minus a margin so the
 * frame never kisses the taskbar or edges) while preserving the content
 * aspect ratio. Without the fit, an oversized centered window gets clamped
 * by Windows itself — observed: silently stretched to full work-area
 * height ("上下拉满"), which looks like a maximize bug.
 */
const MAIN_W_RATIO = 1191 / 1536;
const MAIN_H_RATIO = 776 / 824;
const WORKAREA_MARGIN = 48;

function mainInitialSize(): { width: number; height: number } {
  const area = screen.getPrimaryDisplay().workArea;
  const wantW = area.width * MAIN_W_RATIO;
  const wantH = area.height * MAIN_H_RATIO;
  const availW = Math.max(0, area.width - WORKAREA_MARGIN);
  const availH = Math.max(0, area.height - WORKAREA_MARGIN);
  const scale = Math.min(1, availW / wantW, availH / wantH);
  return {
    width: Math.floor(wantW * scale),
    height: Math.floor(wantH * scale),
  };
}

export function createMainWindow(): BrowserWindow {
  // Size comes from mainInitialSize (work-area ratios, same `center: true`
  // anchor as the splash): at handoff the window grows outward
  // symmetrically from the splash card, which reads as an intentional
  // "bloom" instead of a jump to a corner. Still resizable, so this only
  // sets the initial size.
  const { width, height } = mainInitialSize();
  const win = new BrowserWindow({
    width, height, show: false, center: true,
    title: 'DSH-DesktopX',
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  // Lock the title: web page <title> changes must not rename the app window.
  win.on('page-title-updated', (event) => event.preventDefault());
  // Chrome parity context menu: Electron ships no default right-click menu,
  // so reproduce what Chromium shows — text editing items when the click is
  // in an editable field or over a selection, link/image actions otherwise.
  win.webContents.on('context-menu', (_event, params) => {
    const wc = win.webContents;
    // Stash the click point for handlers that must locate the underlying
    // <video> element (saveVideoFrameAs) — params alone carries no node ref.
    void wc.executeJavaScript(`window.__dshCtxX = ${String(params.x)}; window.__dshCtxY = ${String(params.y)};`);
    const hasSelection = params.selectionText.trim() !== '';
    const inEditable = params.isEditable;
    const template: Electron.MenuItemConstructorOptions[] = [];
    if (inEditable) {
      // Matches Chrome's field menu order: undo/redo, cut/copy/paste, all.
      template.push(
        { label: '撤消', role: 'undo', enabled: params.editFlags.canUndo },
        { label: '重做', role: 'redo', enabled: params.editFlags.canRedo },
        { type: 'separator' },
        { label: '剪切', role: 'cut', enabled: params.editFlags.canCut },
        { label: '复制', role: 'copy', enabled: params.editFlags.canCopy },
        { label: '粘贴', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' },
      );
    } else {
      if (hasSelection) {
        template.push(
          { label: '复制', role: 'copy' },
          {
            label: '使用默认浏览器搜索',
            click: () => {
              const q = encodeURIComponent(params.selectionText.trim().slice(0, 200));
              void shell.openExternal(`https://www.bing.com/search?q=${q}`);
            },
          },
          { type: 'separator' },
        );
      }
      if (params.linkURL !== '') {
        template.push(
          {
            label: '在默认浏览器中打开链接',
            click: () => { void shell.openExternal(params.linkURL); },
          },
          {
            label: '复制链接地址',
            click: () => { clipboard.writeText(params.linkURL); },
          },
          { type: 'separator' },
        );
      }
      if (params.mediaType === 'video') {
        // Animated GIF/WebP served as <img>: covered by the image branch
        // below (fetchAsBuffer preserves the animation). Real <video>
        // elements get a video menu: save = current frame as PNG
        // (canvas snapshot; animation itself cannot be re-encoded
        // shell-side without ffmpeg — see comment above saveVideoFrameAs).
        template.push(
          {
            label: '保存当前帧为图片…',
            click: () => {
              void (async () => {
                try {
                  await saveVideoFrameAs(win, wc);
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  const hint = msg.includes('no-video') || msg.includes('not-ready')
                    ? '视频尚未加载出画面，稍后再试。'
                    : msg.includes('tainted') || msg.includes('cross-origin')
                      ? '该视频不允许跨域读取画面（站点限制），请用录屏保存。'
                      : msg;
                  void dialog.showMessageBox(win, {
                    type: msg.includes('no-video') || msg.includes('not-ready') ? 'info' : 'error',
                    title: 'DSH-DesktopX',
                    message: `无法保存视频帧：${hint}`,
                  });
                }
              })();
            },
          },
          {
            label: '复制视频地址',
            click: () => { clipboard.writeText(params.srcURL); },
          },
          { type: 'separator' },
        );
      }
      if (params.hasImageContents) {
        template.push(
          {
            label: '在新窗口中打开图片',
            click: () => {
              const img = new BrowserWindow({
                width: 900, height: 700, show: false, center: true,
                title: 'DSH-DesktopX',
                autoHideMenuBar: true,
                parent: win,
                webPreferences: { contextIsolation: true, nodeIntegration: false },
              });
              img.on('page-title-updated', (event) => event.preventDefault());
              void img.loadURL(params.srcURL);
              img.once('ready-to-show', () => img.show());
            },
          },
          {
            label: '复制图片',
            click: () => { wc.copyImageAt(params.x, params.y); },
          },
          {
            label: '图片另存为…',
            click: () => {
              void (async () => {
                // SVG first: an <img> SVG must keep its .svg extension and
                // vector source — fetchAsBuffer would misname it and the
                // bytes are text anyway. Falls through to raster bytes for
                // everything else (GIF/WebP animation preserved).
                try {
                  await saveSvgAs(win, wc);
                  return;
                } catch (error) {
                  if (!(error instanceof Error) || error.message !== 'no-svg') {
                    showSaveError(win, '图片', error);
                    return;
                  }
                }
                try {
                  const buf = await fetchAsBuffer(wc, params.srcURL);
                  const ext = imageExtension('', params.srcURL);
                  await saveBufferAs(win, buf, `image-${Date.now().toString()}.${ext}`, [
                    { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] },
                    { name: '所有文件', extensions: ['*'] },
                  ]);
                } catch (error) {
                  showSaveError(win, '图片', error);
                }
              })();
            },
          },
          {
            label: 'SVG 转存为 PNG…',
            click: () => {
              void (async () => {
                try {
                  await saveSvgPngAs(win, wc);
                } catch (error) {
                  if (error instanceof Error && (error.message === 'no-svg' || error.message === 'raster-failed')) return;
                  showSaveError(win, '图片', error);
                }
              })();
            },
          },
        );
      }
      if (template.length === 0) {
        // Chrome shows Back/Forward/Reload on a bare page click; back and
        // forward are no-ops in our single-page shell, so offer only reload.
        template.push({ label: '重新加载', role: 'reload' });
      }
      // Inline SVG has no <img> node, so the image branch above never fires
      // for it — offer the same SVG save item here; the click handler
      // no-ops (no-svg) when the click point turns out not to be SVG.
      // mediaType 'none' keeps this off links/video/audio menus; plain text
      // paragraphs (also 'none') get the item too, but it silently does
      // nothing there, which is cheaper than a DOM probe per right-click.
      if (!params.hasImageContents && params.mediaType === 'none' && params.linkURL === '') {
        template.push({
          label: 'SVG 另存为…',
          click: () => {
            void (async () => {
              try {
                await saveSvgAs(win, wc);
              } catch (error) {
                if (error instanceof Error && error.message === 'no-svg') return;
                showSaveError(win, '图片', error);
              }
            })();
          },
        });
      }
      if (params.selectionText.trim() === '' && !params.isEditable && !params.hasImageContents) {
        // Chat-first extra: dump the current viewport to a PNG file. Chrome
        // has no such item, but generated content is the shell's main use
        // case and screenshots otherwise need DevTools.
        template.push({
          label: '截取当前页面为图片…',
          click: () => {
            void (async () => {
              try {
                const shot = await wc.capturePage();
                await saveBufferAs(win, shot.toPNG(), `dsh-${Date.now().toString()}.png`, [
                  { name: 'PNG 图片', extensions: ['png'] },
                  { name: '所有文件', extensions: ['*'] },
                ]);
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                void dialog.showMessageBox(win, {
                  type: 'error',
                  title: 'DSH-DesktopX',
                  message: `截图保存失败：${msg}`,
                });
              }
            })();
          },
        });
      }
      template.push(
        { type: 'separator' },
        {
          label: '检查',
          click: () => { wc.inspectElement(params.x, params.y); },
        },
      );
    }
    Menu.buildFromTemplate(template).popup({ window: win });
  });
  // Keep the shell window on the local GUI: external links go to the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/u.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!/^http:\/\/127\.0\.0\.1:/u.test(url)) { event.preventDefault(); void shell.openExternal(url); }
  });
  return win;
}
