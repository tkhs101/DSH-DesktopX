# DSH-DesktopX Initial Baseline

Date: `2026-09-16`
Status: `initial dual-baseline snapshot`

## 1. Purpose
锁定“Electron 轻量壳 + 本机后端”方向的可执行基线，供后续计划/实现做对齐检查。

## 2. Workspace Structure
- 空仓库起步；`docs/aegis/` 为方法工作区；实现代码待计划落地（`src/main/`、`src/preload/`、`assets/`、`scripts/`）。
- 上游 deepseek-harness 不在库内，通过本机 PATH 的 `dsh.cmd` 调用。

## 3. Current Authority Surfaces
- 上游权威（引用不复制）：
  - https://github.com/deepseek-ai/deepseek-harness （README：developer preview，会有 breaking changes）
  - docs/architecture.md（一切皆插件、唯一入口 dsh、profile/bundle/patch）
  - packages/bundle/web-app/README.md（`--no-open --port 0`、URL 行是 readiness 信号）
  - apps/cli/reference/README.md（SIGTERM 正常停机 exit 0；`--host 0.0.0.0` 拒绝；关窗语义无规定，壳自定）
  - apps/desktop/README.md（官方 Electron 壳：版本绑定思想可借鉴，本项目不复用其代码）
  - SAFETY.md（实验性软件、最小权限、一次性环境）
- 本会话设计（需求权威）：B 路线 / PATH 内 `dsh web --no-open --port 0` / 托盘常驻 / NSIS / unsigned 首版。
- 已验证事实（本机实测 2026-09-16）：`--port 0` 得 `http://127.0.0.1:65179/?token=...`；插件行会出现在 URL 行之前，必须逐行扫描；关窗语义由壳自定。

## 4. Product / Requirement Baseline
### 4.1 Current Truth
- 目标：Win x64 双击 EXE → Splash“正在启动 DeepSeek Harness 后端…”→ 独立窗口进 WebUI；解决浏览器标签页易被误关问题。
- 范围：Electron 壳做 supervisor+窗口；后端=本机已装 dsh，不打包后端。
- 验收：裸机（有 Node+dsh）双击可用；关窗托盘常驻后端热着；彻底退出无残留；3080 被占仍可起（`--port 0`）；卸载无残留。
### 4.2 Non-negotiables
1. 不改上游一行；只消费 `dsh web` 黑盒 stdout 契约。
2. token 只存内存，不落盘不记明文日志。
3. 关窗 ≠ 杀后端（托盘常驻）；彻底退出必须杀干净进程树。
4. 单实例：二次双击聚焦已有窗口。
### 4.3 Product Non-goals
自动更新、LAN 共享、插件管理、多后端、签名消蓝框、记住关窗选择。

## 5. Architecture / Runtime Boundary Baseline
### 5.1 Current Truth
- 壳↔后端：分进程，stdout URL 行是唯一契约；无 ABI 耦合，DSH 升级壳逻辑不动（仅格式大变才适配）。
- 壳内：main（spawn+解析+健康）/ windows（splash+主窗）/ tray / single-instance；preload 最小暴露，无 node 进 renderer。
- 用户数据在 `$DSH_HOME`，壳升级/重装不动它。
### 5.2 Architecture Non-negotiables
1. 只绑 loopback；不拼 URL，以打印行为准。
2. 外链弹系统浏览器，不让 WebUI 把主窗导航带走。
3. 退出先 SIGTERM 给 5s 优雅期，超时再强杀。
### 5.3 Architecture Non-goals
不自建协议、不开远端端口、不碰 profile 可执行图。

## 6. Ownership / Contract Snapshot
- 进程/窗口/Splash/托盘 → 本仓库（新建）。
- agent/模型/会话/存储 → 上游 dsh（只调用）。
- `dsh web:` 行格式 → 上游（跟随，README 置顶已验证版本）。

## 7. Current State and Risks
- 空仓库；计划待写。风险：preview 期 URL 行格式变化；冷启动慢需超时+可退出 Splash；杀软对 spawn 的误报；unsigned 首版 SmartScreen 蓝框需 Release notes 引导。

## 8. Alignment Use
- 需求问题读 §4；架构边界问题读 §5；两者都沾边 scope: both。

## 9. Compatibility Boundary
- 不动 `$DSH_HOME` 数据；不改上游；Windows x64 per-user 安装免管理员；Electron 大版本升级单独评估。

## 10. Installer 补充（2026-09-16 夜，用户实测通过）
- 现象：assisted NSIS 目录页文本框永远显示裸路径（MUI_PAGE_DIRECTORY 展开早于定制宏，leave/DirVerify/SHOW 钩子全被 warning-6010 剪掉）。
- 修法：`build/installer.nsh`（customInit 默认后缀 + 目录页中文提示）+ `win.executableName`（APP_FILENAME=DSH-DesktopX，stock instFilesPre 安装时补子目录）。用户实测：选 C:\RUANJIAN，文件落 C:\RUANJIAN\DSH-DesktopX\。显示层不修，落点层保证。
