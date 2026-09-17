import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

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

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280, height: 860, show: false, center: true,
    title: 'DSH-DesktopX',
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  // Lock the title: web page <title> changes must not rename the app window.
  win.on('page-title-updated', (event) => event.preventDefault());
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
