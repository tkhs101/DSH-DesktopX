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
