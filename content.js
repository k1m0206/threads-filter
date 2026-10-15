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
   * 刷新关键词缓存
   */
  function updateKeywordsCache(rawKeywords) {
    originalKeywords = Array.isArray(rawKeywords) ? rawKeywords.map(k => String(k).trim()).filter(Boolean) : [];
    normalizedKeywords = originalKeywords.map(kw => {
      return window.TextNormalizer ? window.TextNormalizer.normalize(kw, filterConfig.convertTradToSimp) : kw.toLowerCase();
    });
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
   * 智能回溯算法：由任意子节点寻找最近的整条帖子/评论卡片容器
   */
  function findPostCardContainer(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    // 1. 标准语义标签
    const article = node.closest('article');
    if (article) {
      const parent = article.parentElement;
      if (parent && parent.children.length === 1 && !parent.matches('main, [role="main"], body')) {
        return parent;
      }
      return article;
    }

    // 2. 基于属性容器
    const pressable = node.closest('[data-pressable-container="true"]');
    if (pressable) return pressable;

    const roleArticle = node.closest('[role="article"]');
    if (roleArticle) return roleArticle;

    // 3. 自底向上逐层回溯：
    let curr = node;
    let bestCandidate = null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (curr.matches && (curr.matches('article') || curr.matches('[data-pressable-container="true"]') || curr.matches('[role="article"]'))) {
        return curr;
      }

      // 如果容器包含作者链接或头像并且有明确的高度
      if (curr.querySelector && (curr.querySelector('a[href^="/@"]') || curr.querySelector('a[role="link"][href*="/@"]')) && curr.offsetHeight > 40) {
        bestCandidate = curr;
        // 如果它的父容器包含多个同级项（说明当前 curr 是列表里的独立一条）
        if (curr.parentElement && curr.parentElement.children.length > 1 && !curr.parentElement.matches('header, nav')) {
          return curr;
        }
      }
      curr = curr.parentElement;
    }

    // 兜底：如果实在无法识别外层列表，直接返回当前包含文本的容器，确保立即在界面上看到消除效果！
    return bestCandidate || node;
  }

  /**
   * 提取发帖人用户名/Handle
   */
  function extractAuthorText(container) {
    const list = [];
    const authorLinks = container.querySelectorAll('a[href*="/@"]');
    authorLinks.forEach(link => {
      const txt = link.innerText || link.textContent;
      if (txt) list.push(txt.trim());
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/@([^/?#]+)/);
      if (match && match[1]) list.push(match[1]);
    });
    return list.join(' ');
  }

  /**
   * 提取正文和评论文本（排除按钮文字等）
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
    container.style.cssText = 'display: none !important; visibility: hidden !important; height: 0px !important; min-height: 0px !important; max-height: 0px !important; margin: 0px !important; padding: 0px !important; border: none !important; overflow: hidden !important; pointer-events: none !important; opacity: 0 !important; font-size: 0px !important; line-height: 0 !important;';
    container.classList.add('threads-filter-removed');
    container.setAttribute('aria-hidden', 'true');

    // 从 DOM 彻底移除
    try {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      } else {
        container.remove();
      }
    } catch (e) {}
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
   * 全量深度扫描（自顶向下 + 穿透式扫描）
   */
  function performFullScan() {
    if (isExcludedPage()) {
      return;
    }

    if (!filterConfig.enabled || normalizedKeywords.length === 0) {
      return;
    }

    // 1. 扫描所有作者链接
    const authorLinks = document.querySelectorAll('a[href*="/@"]');
    authorLinks.forEach(link => {
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

    // 2. 扫描所有常规卡片
    const topCards = document.querySelectorAll('article, [data-pressable-container="true"], [role="article"]');
    topCards.forEach(node => {
      const card = findPostCardContainer(node);
      if (card) inspectAndFilterCard(card);
    });

    // 3. 穿透式扫描所有包含文本的元素（段落、正文、评论回复）
    const textElements = document.querySelectorAll('[dir="auto"], p, span, a[role="link"]');
    textElements.forEach(el => {
      // 排除本身已在被移除容器内的元素
      if (el.closest('.threads-filter-removed') || el.closest('[data-threads-removed="true"]')) return;

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
