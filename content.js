/**
 * Threads伴侣 (ThreadsFilter) - Content Script
 * 实时过滤 Threads 网页中的用户名、正文及评论区回复，命中即移除
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
  const SCAN_DELAY = 40; // ms

  // 批量统计写入队列
  let pendingStatsQueue = [];
  let statsFlushTimer = null;

  /**
   * 刷新关键词缓存
   */
  function updateKeywordsCache(rawKeywords) {
    originalKeywords = Array.isArray(rawKeywords) ? rawKeywords.map(k => String(k).trim()).filter(Boolean) : [];
    normalizedKeywords = originalKeywords.map(kw => {
      return window.TextNormalizer ? window.TextNormalizer.normalize(kw, filterConfig.convertTradToSimp) : kw.toLowerCase();
    });
    // 递增规则版本号，失效旧的已检查缓存
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

  // 监听来自 Popup 的重新扫描指令
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PING') {
        sendResponse({ status: 'OK' });
      } else if (request.action === 'RESCAN') {
        currentRuleVersion++;
        performFullScan();
        sendResponse({ status: 'RESCAN_DONE' });
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
   * 核心定位：由任意子节点寻找最近的整条帖子/评论卡片容器
   */
  function findPostCardContainer(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    // 1. 标准语义标签
    const article = node.closest('article');
    if (article) {
      // 检查其父级是否是带边框/内边距的单独包装容器
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

    // 3. 自底向上智能回溯：寻找包含作者、互动栏的独立卡片
    let curr = node;
    let fallback = null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (curr.matches && (curr.matches('article') || curr.matches('[data-pressable-container="true"]'))) {
        return curr;
      }
      // 如果该容器包含作者链接并且在其父级中是条目之一
      if (curr.querySelector && curr.querySelector('a[href^="/@"]') && curr.offsetHeight > 50) {
        fallback = curr;
      }
      curr = curr.parentElement;
    }

    return fallback;
  }

  /**
   * 提取发帖人用户名/Handle
   */
  function extractAuthorText(container) {
    const list = [];
    const authorLinks = container.querySelectorAll('a[href^="/@"]');
    authorLinks.forEach(link => {
      const txt = link.innerText || link.textContent;
      if (txt) list.push(txt.trim());
      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/@([^/?#]+)/);
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

    // 强力 CSS 压制：保证高度立即归零，彻底不占空间
    container.style.cssText = 'display: none !important; visibility: hidden !important; height: 0px !important; min-height: 0px !important; max-height: 0px !important; margin: 0px !important; padding: 0px !important; border: none !important; overflow: hidden !important; pointer-events: none !important; opacity: 0 !important;';
    container.classList.add('threads-filter-removed');
    container.setAttribute('aria-hidden', 'true');

    // 尝试彻底从 DOM 树移除
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
    if (!card || !card.isConnected) return false;
    if (card.dataset.threadsRemoved === 'true') return true;

    // 版本检查：同一版本只检查一次
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
   * 全量深度扫描（自顶向下 + 自底向上双保险）
   */
  function performFullScan() {
    if (!filterConfig.enabled || normalizedKeywords.length === 0) {
      return;
    }

    // 1. 自顶向下扫描常规卡片
    const topCards = document.querySelectorAll('article, [data-pressable-container="true"], [role="article"]');
    topCards.forEach(node => {
      const card = findPostCardContainer(node);
      if (card) inspectAndFilterCard(card);
    });

    // 2. 自底向上扫描所有作者链接（防止改版 class 导致漏检用户名）
    const authorLinks = document.querySelectorAll('a[href^="/@"]');
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

    // 3. 扫描包含文本的段落/行（对正文与评论进行穿透式扫描）
    const textNodes = document.querySelectorAll('span[dir="auto"], div[dir="auto"]');
    textNodes.forEach(node => {
      const txt = node.innerText || node.textContent;
      if (txt && txt.length > 1 && window.TextNormalizer) {
        const match = window.TextNormalizer.checkMatch(txt, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
        if (match.matched) {
          const card = findPostCardContainer(node);
          if (card) {
            removeCardElement(card, '正文/评论', match.keyword, txt.slice(0, 35) + '...');
          }
        }
      }
    });
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(performFullScan, SCAN_DELAY);
  }

  /**
   * MutationObserver 监听动态内容插入
   */
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
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
