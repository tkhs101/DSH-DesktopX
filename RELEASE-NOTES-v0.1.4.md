<div align="center">

<img src="https://raw.githubusercontent.com/tkhs101/DSH-DesktopX/master/docs/images/icon.png" width="96" alt="DSH-DesktopX">

# DSH-DesktopX v0.1.4

**右键菜单：Chrome 里什么样，壳里什么样，再多一点。**

</div>

---

## 这一版改了什么

### 🖱️ Chrome 同款右键菜单（Electron 默认没有，自己实现）

按点击位置出不同菜单，和 Chrome 行为对齐：

- **输入框/编辑区**：撤消 / 重做 / 剪切 / 复制 / 粘贴 / 全选（不可用自动置灰）
- **选中文字**：复制 / 使用默认浏览器搜索（Bing，壳内承诺零 Google 依赖）
- **链接**：在默认浏览器中打开链接 / 复制链接地址（外跳系统浏览器，壳内只留本地页）
- **图片**：在新窗口中打开图片 / 复制图片 / 图片另存为… / SVG 转存为 PNG…
- **视频**：保存当前帧为图片… / 复制视频地址
- **内联 SVG**：SVG 另存为…（页面直接画的矢量图，Chrome 对它没有图片菜单）
- **空白处**：重新加载 / 截取当前页面为图片… / 检查

### 💾 右键真能存东西了（不只是摆设）

- **图片另存为…**：renderer 内 `fetch` 抓原始字节流写入，走系统保存框。`blob:` 内存 URL 可存，GIF/WebP 动画不丢帧，SVG 自动存 `.svg` 矢量源——之前调 `downloadURL` 的版本对 blob 点了没反应
- **SVG 转存为 PNG…**：离屏 `<img>` + canvas 栅格化（2048px 封顶），聊天粘贴/PPT 直接用
- **保存当前帧为图片…**：`<video>` 的 canvas 快照；整段动画存不下来是技术边界（浏览器无重编码 API，Chrome 自己也只能复制网址），要原片用「复制视频地址」拿源文件下
- **截取当前页面为图片…**：视口截图存 PNG（Chrome 没有，聊天场景特供）
- 所有保存失败都弹中文错误框，不静默吞错

### 故意不做的（Chrome 有，壳里没有）

- 后退/前进：单页壳无历史；整页另存为：localhost 动态页存下来是废 HTML
- 打印：`print()` 一句话可加，聊天窗口需求极低，等有人要
- 投射/翻译：Chrome 独占能力；拼写建议：要 Hunspell 词典，中文场景用不上

---

## 安装

### 1. 先装依赖

```powershell
# Node.js 22.19+ 或 24+
node --version

# 全局安装 DeepSeek Harness
npm i -g @deepseek-ai/dsh
dsh --version
```

### 2. 下载安装本版

下载下方 **`DSH-DesktopX.Setup.0.1.4.exe`**（~90 MB）。

> ⚠️ **SmartScreen 蓝框是预期的**：本项目未签名（个人项目，不打算买证书）。点「更多信息」→「仍要运行」即可继续安装。这是所有新发布软件的正常流程。

- per-user 安装，**不需要管理员权限**
- 目录页显示裸路径（如 `C:\RUANJIAN`）时，安装时会**自动**进 `C:\RUANJIAN\DSH-DesktopX\` 子目录，不会散在外面
- 聊天记录/设置存在本机 `$DSH_HOME`，重装壳不受影响

### 3. 用法

| 操作 | 结果 |
|---|---|
| 双击桌面图标 | 启动动画 → 进 WebUI |
| 点窗口 X | 缩到托盘，**后端继续运行** |
| 点托盘图标 | 立刻把窗口拉回来 |
| 右键托盘 → 重启后端 | 重跑一次 `dsh web`（旧后端整树杀干净，不再残留） |
| 右键托盘 → 彻底退出 | 停掉后端并退出（无孤儿进程） |
| 启动动画上的 `─` / `✕` | 最小化到任务栏 / 取消启动并退出 |
| 页面内右键 | Chrome 同款菜单，图片/视频/SVG/截图都能存 |

---

## 已知限制

- **冷启动约 9s+**：等 `dsh` 后端就绪，属正常（shipped base+web-app ~6.5s + 第三方插件 ~3.4s）
- **仅 Windows x64**：macOS / Linux 未构建
- **未签名**：SmartScreen 会拦一次
- 端口被占用时自动换空闲端口，无需处理

## 依赖版本

- 已验证上游 `dsh 0.1.5-rc.1`
- Electron 38.8.6
- 若上游改了就绪行格式，只需改 `src/main/backend.ts` 的 `WEB_READY_RE`
