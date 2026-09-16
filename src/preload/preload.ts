import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopx', {
  /** Ask main to hide (tray) instead of quitting. */
  hideWindow: (): void => { ipcRenderer.send('window:hide'); },
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
});
