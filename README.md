# Threads 关键词过滤助手 (Threads Keyword Blocker)

专为 **Threads 网页版**（`threads.net` / `threads.com`）量身打造的高效内容过滤浏览器扩展，遵循 Threads 原生极简黑白设计美学。

---

## ✨ 核心特性

1. **统一关键词规则库，彻底移除**
   - 统一一套关键词，全方位自动作用于：
     - 👤 **用户名 / Handle / 昵称**
     - 📝 **帖子正文**
     - 💬 **评论区回复**
   - 命中任意一项，整条帖子或评论将**直接从页面中彻底移除**，不留空白卡片或残缺边框。

2. **自适应界面语言（国际化 i18n）**
   - **智能检测**：首次打开时，自动根据**浏览器设置语言或操作系统语言**无缝切换界面语言。
   - **多语言覆盖**：内置支持 **简体中文 (`zh-CN`)**、**繁體中文 (`zh-TW`)**、**English (`en`)**、**日本語 (`ja`)**、**한국어 (`ko`)**。
   - **自由切换**：面板右上角提供极简快捷下拉菜单，方便随时切换语言。

3. **跨语言文本深度过滤（简繁互通）**
   - **简繁双向互通**：内置中文简繁等价映射引擎。输入简体词（如“买粉”）即可自动命中繁体（如“買粉”），反之亦然。
   - **英语大小写与全半角无关**：不区分大小写，自动消除全角/半角变体。
   - **日韩语言友好**：完整支持平假名、片假名、日汉字（如“フォロー”）及韩文音节（如“팔로우”）。

4. **独立统计中心与可视化报表**
   - 点击插件面板的统计图标即可进入全景数据中心：
     - **数据总览**：累计总拦截、今日拦截、当前生效屏蔽词数、单日最高记录。
     - **趋势图表**：过去 14 天每日拦截量动态柱状图（SVG 极简黑白渲染）。
     - **关键词排行榜**：历史累计拦截命中 TOP 10 关键词与占比进度条。
     - **按日明细查询**：自由选择指定日期，精确查看**当天每个关键词分别拦截了多少次**。
     - **报表导出**：支持一键导出包含每日与每词统计的 JSON 报表。

5. **双平台一键打包（Chrome 风格 & Firefox 风格）**
   - 纯 Node.js 内置零依赖打包脚本，一键生成：
     - `dist/threads-filter-chrome-v1.0.0.zip`（适配 Chrome、Edge、Brave 等 Chromium 浏览器）
     - `dist/threads-filter-firefox-v1.0.0.zip` & `.xpi`（包含 Firefox 专属 `gecko` ID 配置，适配 Firefox 浏览器）

---

## 📦 一键打包指南

在项目根目录下执行打包命令：

```bash
# 方式 1：使用 npm 命令
npm run build

# 方式 2：直接使用 node 运行
node scripts/package.js
```

打包完成后，构建产物将保存在 `dist/` 文件夹中：
- 🌟 **Chrome / Edge**: `dist/threads-filter-chrome-v1.0.0.zip`
- 🦊 **Firefox**: `dist/threads-filter-firefox-v1.0.0.zip` 及 `threads-filter-firefox-v1.0.0.xpi`

---

## 🚀 安装步骤

### 1. Chrome / Edge 浏览器
1. 打开浏览器扩展管理页面：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
2. 开启右上角的 **「开发者模式」** 开关。
3. 可选择：
   - 点击左上角 **「加载已解压的扩展程序」**，直接选择项目根目录 `d:\dev\浏览器插件\threads-filter`；
   - 或将 `dist/threads-filter-chrome-v1.0.0.zip` 解压后加载。

### 2. Firefox 浏览器
1. 在 Firefox 地址栏输入 `about:debugging#/runtime/this-firefox`。
2. 点击 **「临时载入附加组件...」 (Load Temporary Add-on)**。
3. 选择 `dist/threads-filter-firefox-v1.0.0.zip`（或选择 `manifest.json`），即可立即载入测试！

---

## 📁 目录结构

```text
threads-filter/
├── manifest.json            # 扩展清单文件 (Manifest V3)
├── content.js               # 页面注入脚本（DOM 监听与内容移除，统计数据防抖写入）
├── content.css              # 辅助过渡样式
├── package.json             # 构建配置
├── utils/
│   ├── text-normalizer.js   # 多语言规范化与简繁互通转换模块
│   └── i18n.js              # 自动语言检测与 5 种语言国际化字典
├── popup/
│   ├── popup.html           # 设置面板 HTML
│   ├── popup.css            # Threads 黑白极简风格样式
│   └── popup.js             # 词库管理与交互逻辑
├── stats/
│   ├── stats.html           # 详细统计中心仪表盘
│   ├── stats.css            # 统计页面 Threads 风格样式
│   └── stats.js             # 每日趋势、各词拦截明细与导出逻辑
├── scripts/
│   └── package.js           # 原生零依赖打包脚本（Chrome & Firefox）
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── dist/                    # 打包生成的压缩包目录
```
