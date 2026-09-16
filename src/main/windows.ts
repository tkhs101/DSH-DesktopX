import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

export function createSplash(): BrowserWindow {
  const win = new BrowserWindow({ width: 420, height: 300, frame: false, resizable: false, alwaysOnTop: true, center: true });
  void win.loadFile(join(__dirname, '../../assets/splash.html'));
  return win;
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280, height: 860, show: false, center: true,
    webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
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
