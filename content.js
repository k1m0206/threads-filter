/**
 * Threads伴侣 (ThreadsFilter) - Content Script
 * 深度监听并过滤 Threads 网页中的用户名、正文及评论区回复，秒级即时清除
 */

(function () {
  'use strict';

  // 运行配置
  let filterConfig = {
    enabled: true,
    keywords: [],
    convertTradToSimp: true, // 简繁互通
    logToConsole: true
  };

  // 规范化后的关键词缓存
  let normalizedKeywords = [];
  let originalKeywords = [];

  // 规则版本号：每当配置更新或关键词变动时自增，确保所有内容立即重新检测
  let currentRuleVersion = 1;

  // 节流扫描定时器
  let scanTimer = null;
  const SCAN_DELAY = 30; // ms

  // 批量统计写入队列
  let pendingStatsQueue = [];
  let statsFlushTimer = null;

  /**
   * 判断当前页面是否为排除页面（如 /insights 数据分析页面）
   * 包含 threads.net/insights 以及 threads.com/insights 及其所有子路由
   */
  function isExcludedPage() {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      return path === '/insights' || path.startsWith('/insights/');
    } catch (e) {
      return false;
    }
  }

  // SPA 路由动态监测
  let lastObservedUrl = window.location.href;
  function checkUrlChange() {
    try {
      const currentUrl = window.location.href;
      if (currentUrl !== lastObservedUrl) {
        lastObservedUrl = currentUrl;
        if (!isExcludedPage()) {
          scheduleScan();
        }
      }
    } catch (e) {}
  }

  window.addEventListener('popstate', checkUrlChange);
  const origPushState = history.pushState;
  if (typeof origPushState === 'function') {
    history.pushState = function () {
      origPushState.apply(this, arguments);
      checkUrlChange();
    };
  }
  const origReplaceState = history.replaceState;
  if (typeof origReplaceState === 'function') {
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      checkUrlChange();
    };
  }

  /**
   * 刷新关键词缓存（自动执行汉字简繁互转同步展开）
   */
  function updateKeywordsCache(rawKeywords) {
    if (window.TextNormalizer && window.TextNormalizer.expandKeywords) {
      const expanded = window.TextNormalizer.expandKeywords(rawKeywords, filterConfig.convertTradToSimp);
      normalizedKeywords = expanded.normalizedKeywords;
      originalKeywords = expanded.originalKeywords;
    } else {
      originalKeywords = Array.isArray(rawKeywords) ? rawKeywords.map(k => String(k).trim()).filter(Boolean) : [];
      normalizedKeywords = originalKeywords.map(kw => {
        return window.TextNormalizer ? window.TextNormalizer.normalize(kw, filterConfig.convertTradToSimp) : kw.toLowerCase();
      });
    }
    // 递增规则版本号，失效旧的已检查标记
    currentRuleVersion++;
  }

  /**
   * 加载配置
   */
  function loadSettings() {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.get(['threads_filter_config'], (result) => {
      if (result && result.threads_filter_config) {
        filterConfig = Object.assign(filterConfig, result.threads_filter_config);
      }
      updateKeywordsCache(filterConfig.keywords);
      performFullScan();
    });
  }

  // 监听 storage 变动（Popup 修改即刻生效）
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.threads_filter_config) {
        const newVal = changes.threads_filter_config.newValue;
        if (newVal) {
          filterConfig = Object.assign(filterConfig, newVal);
          updateKeywordsCache(filterConfig.keywords);
          performFullScan();
        }
      }
    });
  }

  // 浮动 Toast 提示
  function showToastNotification(text, isSuccess = true) {
    let toast = document.getElementById('threads-filter-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'threads-filter-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className = 'threads-filter-toast show ' + (isSuccess ? 'success' : 'warn');

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'threads-filter-toast hide';
    }, 2400);
  }

  // 监听来自 Popup 或 Background 的指令
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PING') {
        sendResponse({ status: 'OK' });
      } else if (request.action === 'RESCAN') {
        if (isExcludedPage()) {
          sendResponse({ status: 'SKIPPED_EXCLUDED_PAGE' });
          return;
        }
        if (request.config) {
          filterConfig = Object.assign(filterConfig, request.config);
        }
        if (request.keywords && Array.isArray(request.keywords)) {
          filterConfig.keywords = request.keywords;
        }
        updateKeywordsCache(filterConfig.keywords);
        performFullScan();
        sendResponse({ status: 'RESCAN_DONE' });
      } else if (request.action === 'SHOW_TOAST') {
        showToastNotification(request.message, request.isSuccess !== false);
        sendResponse({ status: 'TOAST_SHOWN' });
      }
    });
  }

  /**
   * 刷新统计数据写入
   */
  function flushStats() {
    if (pendingStatsQueue.length === 0) return;
    const batch = pendingStatsQueue.slice();
    pendingStatsQueue = [];

    try {
      const storageArea = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
      if (!storageArea) return;

      storageArea.get(['threads_filter_stats'], (res) => {
        const stats = res.threads_filter_stats || {
          totalBlocked: 0,
          dailyStats: {},
          keywordTotals: {}
        };

        if (!stats.dailyStats) stats.dailyStats = {};
        if (!stats.keywordTotals) stats.keywordTotals = {};

        const todayStr = new Date().toISOString().slice(0, 10);
        if (!stats.dailyStats[todayStr]) {
          stats.dailyStats[todayStr] = { total: 0, keywords: {} };
        }
        const todayObj = stats.dailyStats[todayStr];

        batch.forEach(kw => {
          const word = String(kw || 'unknown').trim();
          stats.totalBlocked = (stats.totalBlocked || 0) + 1;
          todayObj.total = (todayObj.total || 0) + 1;
          todayObj.keywords[word] = (todayObj.keywords[word] || 0) + 1;
          stats.keywordTotals[word] = (stats.keywordTotals[word] || 0) + 1;
        });

        // 仅保留最近 90 天
        const dates = Object.keys(stats.dailyStats).sort();
        if (dates.length > 90) {
          dates.slice(0, dates.length - 90).forEach(d => delete stats.dailyStats[d]);
        }

        storageArea.set({ threads_filter_stats: stats });

        if (chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set({
            threads_filter_stats_summary: {
              totalBlocked: stats.totalBlocked,
              todayBlocked: todayObj.total,
              lastDate: todayStr
            }
          });
        }
      });
    } catch (e) {}
  }

  function recordBlockStat(matchedKeyword) {
    pendingStatsQueue.push(matchedKeyword);
    if (statsFlushTimer) clearTimeout(statsFlushTimer);
    statsFlushTimer = setTimeout(flushStats, 300);
  }

  /**
   * 检验容器是否为合法的“单条”帖子/评论卡片
   * 严禁将整个 Feed 列表容器、整个列布局或包含多条帖子的外壳作为卡片隐藏！
   */
  function isSafeCardContainer(container) {
    if (!container || !container.isConnected || container.nodeType !== Node.ELEMENT_NODE) return false;

    // 1. 绝对不可以是根节点、主体、页面布局
    const tag = (container.tagName || '').toLowerCase();
    if (['html', 'body', 'main', 'header', 'nav', 'footer', 'form'].includes(tag)) {
      return false;
    }

    if (container.getAttribute) {
      const role = container.getAttribute('role');
      if (['main', 'navigation', 'tablist', 'search', 'progressbar', 'region', 'feed'].includes(role)) {
        return false;
      }
    }

    // 2. 绝对不可以是顶级页面布局容器
    if (container.id && (container.id.includes('layout') || container.id.includes('mount'))) {
      return false;
    }
    if (container.parentElement) {
      const pTag = (container.parentElement.tagName || '').toLowerCase();
      const pRole = container.parentElement.getAttribute ? container.parentElement.getAttribute('role') : '';
      if (pTag === 'main' || pRole === 'main' || pTag === 'body') {
        return false;
      }
    }

    // 3. 核心隔离守则：单条卡片内部绝对不能包含其他独立的 pressable 卡片（若包含，必定为 Feed 列表或评论区总容器）
    const childPressables = container.querySelectorAll ? container.querySelectorAll('[data-pressable-container="true"]') : [];
    if (childPressables.length > 0) {
      for (let i = 0; i < childPressables.length; i++) {
        if (childPressables[i] !== container) {
          return false; // 存在非自身的子卡片，证明当前容器是包含多条内容的列表外壳！
        }
      }
    }

    // 4. 单条卡片内部不能包含多个 article 标签
    if (container.querySelectorAll && container.querySelectorAll('article').length > 1) {
      return false;
    }

    // 5. 单条卡片作者账号数校验（不同用户名去重后不超过 2 个，防止误判多帖列表外壳）
    if (container.querySelectorAll) {
      const authorLinks = container.querySelectorAll('a[href*="/@"]');
      const uniqueHandles = new Set();
      for (let i = 0; i < authorLinks.length; i++) {
        const href = authorLinks[i].getAttribute('href') || '';
        const match = href.match(/\/@([^/?#]+)/);
        if (match && match[1]) {
          uniqueHandles.add(match[1]);
        }
      }
      if (uniqueHandles.size > 2) {
        return false;
      }
    }

    // 6. 保护评论区异步加载：绝对不可将转圈 loading 占位器当成卡片隐藏
    if (container.querySelector && container.querySelector('[role="progressbar"], svg[aria-label*="正在加载"], svg[aria-label*="Loading"]')) {
      const text = container.innerText || container.textContent || '';
      if (text.trim().length === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * 智能定位算法：由命中节点精准收敛至最近的独立卡片/评论容器
   * 采用精准锚定，坚决不进行无休止的向上爬树，杜绝越界误杀 Feed 外壳
   */
  function findPostCardContainer(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    // 保护规则 1：系统全局 UI 控件（顶部栏、侧边栏、导航栏、全局进度条），绝不参与卡片屏蔽
    if (node.closest('nav, header, [role="navigation"], [role="tablist"], [role="progressbar"]')) {
      return null;
    }

    // 1. Threads 最权威核心定位器：最近的独立卡片容器（每一个帖子、每一条评论均为独立的 pressable 容器）
    const pressable = node.closest('[data-pressable-container="true"]');
    if (pressable) {
      return isSafeCardContainer(pressable) ? pressable : null;
    }

    // 2. 标准语义标签：兼容可能存在的 article / role=article
    const article = node.closest('article, [role="article"]');
    if (article) {
      return isSafeCardContainer(article) ? article : null;
    }

    return null;
  }

  /**
   * 提取发帖人/评论者用户名、昵称及 Handle（排除时间戳链接文本）
   */
  function extractAuthorText(container) {
    const list = new Set();

    // 1. 提取作者主页链接及 Handle（严格排除发帖时间链接如 /post/DejT9zjG65I，防止把“14小时”误当作者名）
    const authorLinks = container.querySelectorAll('a[href*="/@"]');
    authorLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const isPostTimeLink = href.includes('/post/');

      // 从 URL 提取 handle（例如 @setnews -> setnews）
      const match = href.match(/\/@([^/?#]+)/);
      if (match && match[1]) {
        list.add(match[1]);
      }

      // 提取链接可见文本（若为时间链接如“14小时”、“3分钟”，严禁作为作者名）
      if (!isPostTimeLink) {
        const txt = (link.innerText || link.textContent || '').trim();
        if (txt && !/^\d+\s*(?:小时|分钟|秒|天|周|h|m|s|d|w)$/i.test(txt)) {
          list.add(txt);
        }
      }
    });

    // 2. 提取头像图片的 alt（例如 alt="setnews的头像" -> 提取 setnews）
    const avatarImgs = container.querySelectorAll('img[alt*="头像"], img[alt*="profile"]');
    avatarImgs.forEach(img => {
      const alt = img.getAttribute('alt') || '';
      const m = alt.match(/^(.+?)(?:的头像|'s profile picture)/i);
      if (m && m[1]) {
        list.add(m[1].trim());
      }
    });

    // 3. 提取配图作者标注（例如 alt="Photo by 哪吒墩 on October 16, 2026"）
    const photoImgs = container.querySelectorAll('img[alt*="Photo by"]');
    photoImgs.forEach(img => {
      const alt = img.getAttribute('alt') || '';
      const m = alt.match(/Photo by\s+([^.]+?)\s+on/i);
      if (m && m[1]) {
        list.add(m[1].trim());
      }
    });

    return Array.from(list).join(' ');
  }

  /**
   * 提取正文和评论文本（排除按钮文字、图标等系统干扰）
   */
  function extractContentText(container) {
    const clone = container.cloneNode(true);
    clone.querySelectorAll('button, [role="button"], svg, time').forEach(el => el.remove());
    return clone.innerText || clone.textContent || '';
  }

  /**
   * 移除并彻底隐藏目标卡片
   */
  function removeCardElement(container, reasonType, keyword, snippet) {
    if (!container || !container.isConnected) return;
    if (container.dataset.threadsRemoved === 'true') return;

    // 绝对安全屏障：坚决不可隐藏非安全卡片容器（防止整页消失）！
    if (!isSafeCardContainer(container)) {
      return;
    }

    container.dataset.threadsRemoved = 'true';

    if (filterConfig.logToConsole) {
      console.log(
        `%c[Threads伴侣]%c 已移除包含关键词【${keyword}】的内容 (${reasonType}):`,
        'background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'color: #ff4757; font-weight: bold;',
        snippet || ''
      );
    }

    recordBlockStat(keyword);

    // 强力 CSS 视觉压制：高度归零、边框归零、溢出隐藏
    // 注意：绝不使用 parentNode.removeChild，保持 React 虚拟 DOM 树完整，防止 React 渲染崩溃及评论区无限转圈
    container.style.cssText = 'display: none !important; visibility: hidden !important; height: 0px !important; min-height: 0px !important; max-height: 0px !important; margin: 0px !important; padding: 0px !important; border: none !important; overflow: hidden !important; pointer-events: none !important; opacity: 0 !important; font-size: 0px !important; line-height: 0 !important;';
    container.classList.add('threads-filter-removed');
    container.setAttribute('aria-hidden', 'true');
  }

  /**
   * 检查单个卡片容器
   */
  function inspectAndFilterCard(card) {
    if (isExcludedPage()) return false;
    if (!card || !card.isConnected) return false;
    if (card.dataset.threadsRemoved === 'true') return true;

    // 同一规则版本号只检查一次，版本递增后立即全量重新检查
    if (card._filterCheckedVersion === currentRuleVersion) {
      return false;
    }

    // 1. 检查用户名 / Handle
    const authorText = extractAuthorText(card);
    if (authorText && window.TextNormalizer) {
      const match = window.TextNormalizer.checkMatch(authorText, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
      if (match.matched) {
        removeCardElement(card, '用户名', match.keyword, authorText);
        return true;
      }
    }

    // 2. 检查正文及评论内容
    const contentText = extractContentText(card);
    if (contentText && window.TextNormalizer) {
      const match = window.TextNormalizer.checkMatch(contentText, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
      if (match.matched) {
        removeCardElement(card, '正文/评论', match.keyword, contentText.slice(0, 35) + '...');
        return true;
      }
    }

    card._filterCheckedVersion = currentRuleVersion;
    return false;
  }

  /**
   * 全量深度扫描（原子卡片级直达 + 穿透式文本扫描）
   */
  function performFullScan() {
    if (isExcludedPage()) {
      return;
    }

    if (!filterConfig.enabled || normalizedKeywords.length === 0) {
      return;
    }

    // 1. 直达扫描所有原子卡片（首页单帖、详情页主帖、详情页每一条独立评论）
    const allCards = document.querySelectorAll('[data-pressable-container="true"], article, [role="article"]');
    allCards.forEach(card => {
      if (isSafeCardContainer(card)) {
        inspectAndFilterCard(card);
      }
    });

    // 2. 扫描作者链接（确保作者名命中时卡片被快速隐藏）
    const authorLinks = document.querySelectorAll('a[href*="/@"]');
    authorLinks.forEach(link => {
      if (link.closest('.threads-filter-removed, [data-threads-removed="true"], nav, header, [role="navigation"]')) return;

      const txt = (link.innerText || '') + ' ' + (link.getAttribute('href') || '');
      if (window.TextNormalizer) {
        const match = window.TextNormalizer.checkMatch(txt, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
        if (match.matched) {
          const card = findPostCardContainer(link);
          if (card) {
            removeCardElement(card, '用户名', match.keyword, txt);
          }
        }
      }
    });

    // 3. 穿透式扫描所有包含文本的元素（段落、正文、补充评论）
    const textElements = document.querySelectorAll('[dir="auto"], p');
    textElements.forEach(el => {
      // 排除本身已在被移除容器内的元素
      if (el.closest('.threads-filter-removed, [data-threads-removed="true"]')) return;

      // 排除导航、侧边栏、进度条
      if (el.closest('nav, header, [role="navigation"], [role="tablist"], [role="progressbar"], svg')) {
        return;
      }

      const txt = el.innerText || el.textContent;
      if (txt && txt.length >= 1 && window.TextNormalizer) {
        const match = window.TextNormalizer.checkMatch(txt, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
        if (match.matched) {
          const card = findPostCardContainer(el);
          if (card) {
            removeCardElement(card, '正文/评论', match.keyword, txt.slice(0, 35) + '...');
          }
        }
      }
    });
  }

  function scheduleScan() {
    if (isExcludedPage()) return;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(performFullScan, SCAN_DELAY);
  }

  /**
   * 动态内容监听
   */
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      checkUrlChange();
      if (isExcludedPage()) return;

      let needsScan = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.addedNodes.length > 0) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const node = m.addedNodes[j];
            if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('threads-filter-removed')) {
              needsScan = true;
              break;
            }
          }
        }
        if (needsScan) break;
      }

      if (needsScan) {
        scheduleScan();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    loadSettings();
    if (document.body) {
      initObserver();
      scheduleScan();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        initObserver();
        scheduleScan();
      });
    }
  }

  init();
})();
