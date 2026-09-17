import { Menu, Tray, nativeImage } from 'electron';
import { join } from 'node:path';

export interface TrayActions {
  onShow: () => void;
  onCopyUrl: () => void;
  onRestart: () => void;
  onDevTools: () => void;
  onQuit: () => void;
}

export function createTray(actions: TrayActions): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../assets/tray.png'));
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  const menu = Menu.buildFromTemplate([
    { label: '复制本次登录 URL', click: actions.onCopyUrl },
    { label: '重启后端', click: actions.onRestart },
    { label: '打开 DevTools', click: actions.onDevTools },
    { type: 'separator' },
    { label: '彻底退出', click: actions.onQuit },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('DSH-DesktopX（后端运行中）');
  tray.on('click', actions.onShow);
  return tray;
}
