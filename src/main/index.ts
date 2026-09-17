import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow, createSplash, createToast, positionToast } from './windows.js';
import { startBackend, stopBackend, type BackendHandle } from './backend.js';
import { createTray } from './tray.js';

let mainWin: BrowserWindow | undefined;
let splash: BrowserWindow | undefined;
let toast: BrowserWindow | undefined;
let backend: BackendHandle | undefined;
let quitting = false;
let booting = true;
/** True while a user-triggered restart is in flight (drives the toast). */
let restarting = false;

if (!app.requestSingleInstanceLock()) app.quit();

async function boot(): Promise<void> {
  // Fire the backend in parallel with Electron init: startBackend does not
  // touch any Electron API, and app.whenReady() plus window/tray creation
  // (~150–300ms cold) would otherwise sit on the critical path.
  const bootPromise = startBackend();
  await app.whenReady();
  splash = createSplash();
  mainWin = createMainWindow();
  mainWin.on('close', (event) => {
    if (!quitting) { event.preventDefault(); mainWin?.hide(); }
  });
  // Toast follows the window and hides with it, so it never floats over the desktop.
  const follow = (): void => { if (toast !== undefined && mainWin !== undefined) positionToast(toast, mainWin); };
  mainWin.on('move', follow);
  mainWin.on('resize', follow);
  mainWin.on('minimize', () => toast?.hide());
  mainWin.on('hide', () => toast?.hide());
  mainWin.on('restore', () => { if (restarting) toast?.showInactive(); });
  ipcMain.on('window:hide', () => mainWin?.hide());
  ipcMain.on('splash:minimize', () => splash?.minimize());
  ipcMain.on('splash:close', () => void quitAll());
  ipcMain.handle('app:version', () => app.getVersion());
  createTray({
    onShow: () => { mainWin?.show(); mainWin?.focus(); },
    onRestart: () => void reboot(),
    onDevTools: () => mainWin?.webContents.openDevTools({ mode: 'detach' }),
    onQuit: () => void quitAll(),
  });
  app.on('second-instance', () => { mainWin?.show(); mainWin?.focus(); });
  await reboot(bootPromise);
}

async function reboot(preSpawned?: Promise<BackendHandle>): Promise<void> {
  const isRestart = !booting;
  booting = false;
  if (isRestart) {
    restarting = true;
    await showToast();
  }
  splash?.show();
  if (backend !== undefined) { await stopBackend(backend.child); backend = undefined; }
  try {
    backend = await (preSpawned ?? startBackend());
    const url = backend.url;
    // Load first, then show on first paint: the window no longer pops a
    // blank frame while the web UI finishes its own ~0.5–1.5s client boot
    // (measured: ready-to-show lands well before did-finish-load).
    const shown = new Promise<void>((resolve) => { mainWin?.once('ready-to-show', () => resolve()); });
    const painted = new Promise<void>((resolve) => {
      // Belt-and-suspenders: never trap the user on the splash if the page
      // paints without emitting ready-to-show.
      const fallback = setTimeout(resolve, 15_000);
      mainWin?.once('ready-to-show', () => { clearTimeout(fallback); resolve(); });
    });
    await mainWin?.loadURL(url);
    await Promise.race([shown, painted]);
    mainWin?.show();
    splash?.close(); splash = undefined;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await mainWin?.loadFile(joinAssets('error.html'), { query: { msg } });
    mainWin?.show(); splash?.close(); splash = undefined;
  } finally {
    restarting = false;
    hideToast();
  }
}

/** Create (once) and show the bottom-right "restarting" toast over the main window. */
async function showToast(): Promise<void> {
  if (mainWin === undefined || mainWin.isDestroyed()) return;
  // Restart can be triggered from the tray while the window is hidden; the toast
  // is a child window, so surface the parent first or it would be invisible.
  if (!mainWin.isVisible()) mainWin.show();
  if (toast === undefined || toast.isDestroyed()) {
    toast = createToast(mainWin);
    await new Promise<void>((resolve) => {
      toast?.webContents.once('did-finish-load', () => resolve());
      setTimeout(resolve, 1500);
    });
  }
  positionToast(toast, mainWin);
  toast.showInactive();
}

function hideToast(): void {
  if (toast !== undefined && !toast.isDestroyed()) toast.hide();
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
