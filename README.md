# Threads伴侣 (ThreadsFilter)

Threads 网页版（`threads.net` / `threads.com`）关键词过滤浏览器扩展。

---

## 核心特性

1. **统一关键词规则库**
   - 统一一套关键词，全方位作用于：
     - 用户名 (Handle & 昵称)
     - 帖子正文
     - 评论区回复
   - 命中任意一项，整条帖子或评论将直接从页面中彻底移除。

2. **自适应浅色 (默认) / 深色双主题**
   - 默认采用 Threads 浅色高质感现代主题。
   - 支持一键切换为深色夜间主题，设置持久化保存。
   - 全界面采用原生矢量 SVG 线条图标，无任何 emoji。

3. **自适应多语言 (i18n)**
   - 首次进入根据浏览器或系统语言自动切换界面。
   - 支持简体中文、繁体中文、英语、日语、韩语，并支持快捷下拉切换。

4. **简繁双向互通**
   - 内置简繁等价映射引擎。输入简体自动屏蔽繁体，反之亦然。
   - 英文大小写与全半角自动兼容。
   - 完整支持日文假名及韩文字母。

5. **独立统计中心**
   - 累计总拦截与今日拦截计数。
   - 近 14 天过滤趋势柱状图。
   - 拦截排行 TOP 10。
   - 按日明细查询：查看每天每个关键词的拦截次数与占比。
   - 报表一键导出为 JSON。

6. **双平台一键打包**
   - 支持一键打包为 Chrome 风格与 Firefox 风格压缩包。

---

## 一键打包

```bash
npm run build
# 或直接使用 node
node scripts/package.js
```

构建产物位于 `dist/` 目录：
- Chrome / Edge: `dist/threads-filter-chrome-v1.0.0.zip`
- Firefox: `dist/threads-filter-firefox-v1.0.0.zip` 及 `.xpi`

---

## 安装方法

### Chrome / Edge
1. 打开扩展管理页（`chrome://extensions/` 或 `edge://extensions/`）。
2. 开启右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择当前目录或解压后的文件夹。

### Firefox
1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击「临时载入附加组件」，选择 `dist/threads-filter-firefox-v1.0.0.zip` 即可。
