import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow, createSplash } from './windows.js';
import { startBackend, stopBackend, type BackendHandle } from './backend.js';
import { createTray } from './tray.js';

let mainWin: BrowserWindow | undefined;
let splash: BrowserWindow | undefined;
let backend: BackendHandle | undefined;
let quitting = false;

if (!app.requestSingleInstanceLock()) app.quit();

async function boot(): Promise<void> {
  await app.whenReady();
  splash = createSplash();
  mainWin = createMainWindow();
  mainWin.on('close', (event) => {
    if (!quitting) { event.preventDefault(); mainWin?.hide(); }
  });
  ipcMain.on('window:hide', () => mainWin?.hide());
  ipcMain.handle('app:version', () => app.getVersion());
  createTray({
    onShow: () => { mainWin?.show(); mainWin?.focus(); },
    onRestart: () => void reboot(),
    onDevTools: () => mainWin?.webContents.openDevTools({ mode: 'detach' }),
    onQuit: () => void quitAll(),
  });
  app.on('second-instance', () => { mainWin?.show(); mainWin?.focus(); });
  await reboot();
}

async function reboot(): Promise<void> {
  splash?.show();
  if (backend !== undefined) { await stopBackend(backend.child); backend = undefined; }
  try {
    backend = await startBackend();
    await mainWin?.loadURL(backend.url);
    mainWin?.show();
    splash?.close(); splash = undefined;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await mainWin?.loadFile(joinAssets('error.html'), { query: { msg } });
    mainWin?.show(); splash?.close(); splash = undefined;
  }
}

function joinAssets(file: string): string {
  // windows.ts loads via __dirname-relative paths; keep the same layout here.
  return `${__dirname}/../../assets/${file}`;
}

async function quitAll(): Promise<void> {
  quitting = true;
  await stopBackend(backend?.child);
  app.quit();
}

app.on('window-all-closed', () => { /* tray keeps us alive on Windows */ });
void boot();
