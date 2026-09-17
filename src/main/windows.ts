import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

export function createSplash(): BrowserWindow {
  const win = new BrowserWindow({
    width: 980, height: 640, frame: false, resizable: false,
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

/** Frameless, click-through toast pinned to the bottom-right of the main window. */
export function createToast(parent: BrowserWindow): BrowserWindow {
  const width = 300;
  const height = 86;
  const win = new BrowserWindow({
    width, height, frame: false, resizable: false, show: false,
    parent, skipTaskbar: true, focusable: false,
    transparent: true, backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.setIgnoreMouseEvents(true);
  void win.loadFile(join(__dirname, '../../assets/toast.html'));
  return win;
}

/** Keep the toast glued to the bottom-right inside the parent window's client area. */
export function positionToast(toast: BrowserWindow, parent: BrowserWindow, margin = 20): void {
  if (parent.isDestroyed() || toast.isDestroyed()) return;
  const bounds = parent.getContentBounds();
  const [w, h] = toast.getSize();
  toast.setPosition(
    Math.round(bounds.x + bounds.width - w - margin),
    Math.round(bounds.y + bounds.height - h - margin),
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
