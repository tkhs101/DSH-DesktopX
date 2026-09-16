import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopx', {
  /** Ask main to hide (tray) instead of quitting. */
  hideWindow: (): void => { ipcRenderer.send('window:hide'); },
  /** Splash-only: minimize the frameless splash window to the taskbar. */
  minimizeSplash: (): void => { ipcRenderer.send('splash:minimize'); },
  /** Splash-only: quit the whole app (including the starting backend). */
  closeSplash: (): void => { ipcRenderer.send('splash:close'); },
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
});
