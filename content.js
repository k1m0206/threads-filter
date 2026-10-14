/**
 * Threads 关键词过滤助手 - Content Script
 * 负责监听 Threads 网页中的帖子与评论，并实时过滤含有关键词的用户名、正文及评论
 */

(function () {
  'use strict';

  // 默认配置
  let filterConfig = {
    enabled: true,
    keywords: [],
    convertTradToSimp: true, // 简繁互通
    logToConsole: true
  };

  // 预编译后的规范化关键词列表
  let normalizedKeywords = [];
  let originalKeywords = [];

  // 节流定时器
  let scanTimer = null;
  const SCAN_DELAY = 60; // ms

  // 已检查过的干净节点记录（使用 WeakSet 避免内存泄漏）
  const cleanElements = new WeakSet();

  // 排除的常见系统控制词，防止误判
  const SYSTEM_IGNORE_WORDS = new Set([
    'threads', 'like', 'reply', 'repost', 'share', 'follow', 'following',
    '喜欢', '回复', '转帖', '转推', '分享', '关注', '追踪', '正在追踪',
    '返信', 'リポスト', 'いいね', '共有', 'フォロー中', '팔로우'
  ]);

  /**
   * 更新关键词列表与规范化缓存
   */
  function updateKeywordsCache(rawKeywords) {
    originalKeywords = Array.isArray(rawKeywords) ? rawKeywords.map(k => String(k).trim()).filter(Boolean) : [];
    normalizedKeywords = originalKeywords.map(kw => {
      return window.TextNormalizer ? window.TextNormalizer.normalize(kw, filterConfig.convertTradToSimp) : kw.toLowerCase();
    });
  }

  /**
   * 从 storage 加载配置
   */
  function loadSettings() {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.get(['threads_filter_config'], (result) => {
      if (result && result.threads_filter_config) {
        filterConfig = Object.assign(filterConfig, result.threads_filter_config);
      }
      updateKeywordsCache(filterConfig.keywords);
      // 重新扫描页面
      triggerFullScan();
    });
  }

  /**
   * 监听存储变动（当用户在 Popup 中修改屏蔽词或开关时）
   */
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.threads_filter_config) {
        const newVal = changes.threads_filter_config.newValue;
        if (newVal) {
          filterConfig = Object.assign(filterConfig, newVal);
          updateKeywordsCache(filterConfig.keywords);
          triggerFullScan();
        }
      }
    });
  }

  // 监听来自 popup 的即时指令
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PING') {
        sendResponse({ status: 'OK' });
      } else if (request.action === 'RESCAN') {
        triggerFullScan();
        sendResponse({ status: 'RESCAN_DONE' });
      }
    });
  }

  // 批量统计队列，避免高频写入 storage
  let pendingStatsQueue = [];
  let statsFlushTimer = null;

  /**
   * 将统计增量刷新写入 chrome.storage.local
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

        // 仅保留最近 90 天的数据，避免历史堆积过大
        const dates = Object.keys(stats.dailyStats).sort();
        if (dates.length > 90) {
          const toRemove = dates.slice(0, dates.length - 90);
          toRemove.forEach(d => delete stats.dailyStats[d]);
        }

        storageArea.set({ threads_filter_stats: stats });

        // 同时更新 sync 中的简略计数，便于 popup 极速读取
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
    } catch (e) {
      // 容错处理
    }
  }

  /**
   * 记录拦截计数并加入队列
   */
  function recordBlockStat(matchedKeyword) {
    pendingStatsQueue.push(matchedKeyword);
    if (statsFlushTimer) clearTimeout(statsFlushTimer);
    statsFlushTimer = setTimeout(flushStats, 400);
  }

  /**
   * 定位一条帖子或评论的完整容器卡片
   * Threads 网页端的卡片主要为 <article> 或 [data-pressable-container="true"]
   */
  function findPostContainer(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    // 1. 最标准的文章/评论元素
    const article = node.closest('article');
    if (article) {
      // 检查其父级是否是单项包裹容器（包含边框、分割线等）
      const parent = article.parentElement;
      if (parent && parent.children.length === 1 && !parent.matches('main, [role="main"], body')) {
        return parent;
      }
      return article;
    }

    // 2. 备用定位方式：基于 data-pressable-container
    const pressable = node.closest('[data-pressable-container="true"]');
    if (pressable) {
      return pressable;
    }

    // 3. 基于 role="article"
    const roleArticle = node.closest('[role="article"]');
    if (roleArticle) {
      return roleArticle;
    }

    return null;
  }

  /**
   * 提取帖子中的发帖人用户名/昵称
   */
  function extractAuthorInfo(container) {
    let authorTexts = [];

    // Threads 中的用户名通常带有 href 开头为 /@ 的链接
    const authorLinks = container.querySelectorAll('a[href^="/@"]');
    authorLinks.forEach(link => {
      const text = link.innerText || link.textContent;
      if (text) authorTexts.push(text.trim());
      // 取出 href 中的用户名，如 /@username -> username
      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/@([^/?#]+)/);
      if (match && match[1]) {
        authorTexts.push(match[1]);
      }
    });

    return authorTexts.join(' ');
  }

  /**
   * 提取帖子正文与评论内容
   */
  function extractContentText(container) {
    // 拷贝文本并去除明显的按钮文字
    const clone = container.cloneNode(true);

    // 移除常见的操作按钮区域（点赞、转发、分享等），避免系统文字干扰
    const buttons = clone.querySelectorAll('button, [role="button"], svg, time');
    buttons.forEach(btn => btn.remove());

    return clone.innerText || clone.textContent || '';
  }

  /**
   * 检查并过滤单个帖子或评论容器
   */
  function checkAndFilterItem(container) {
    if (!container || !container.isConnected) return false;
    if (cleanElements.has(container)) return false;
    if (container.dataset.threadsFiltered === 'done') return false;

    // 1. 检查发帖人/评论人用户名
    const authorText = extractAuthorInfo(container);
    if (authorText && window.TextNormalizer) {
      const match = window.TextNormalizer.checkMatch(authorText, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
      if (match.matched) {
        removeItem(container, '用户名', match.keyword, authorText);
        return true;
      }
    }

    // 2. 检查正文及评论区文本
    const contentText = extractContentText(container);
    if (contentText && window.TextNormalizer) {
      const match = window.TextNormalizer.checkMatch(contentText, normalizedKeywords, originalKeywords, filterConfig.convertTradToSimp);
      if (match.matched) {
        removeItem(container, '正文/评论', match.keyword, contentText.slice(0, 40) + '...');
        return true;
      }
    }

    // 未命中任何关键词，标记为干净
    cleanElements.add(container);
    return false;
  }

  /**
   * 从页面中移除命中的元素
   */
  function removeItem(element, type, keyword, snippet) {
    element.dataset.threadsFiltered = 'done';

    if (filterConfig.logToConsole) {
      console.log(
        `%c[Threads 过滤]%c 已移除包含关键词【${keyword}】的内容 (${type}):`,
        'background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
        'color: #ff4757; font-weight: bold;',
        snippet
      );
    }

    // 记录统计
    recordBlockStat(keyword);

    // 隐藏并从 DOM 中移除，保证页面整洁
    element.style.display = 'none';
    element.style.pointerEvents = 'none';
    element.classList.add('threads-filter-removed');

    // 异步彻底从 DOM 中安全删除
    try {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      } else {
        element.remove();
      }
    } catch (e) {
      // 容错处理
    }
  }

  /**
   * 执行全量/增量页面扫描
   */
  function performScan() {
    if (!filterConfig.enabled || normalizedKeywords.length === 0) {
      return;
    }

    // 查询所有可能的帖子与评论容器
    const candidateNodes = document.querySelectorAll('article, [data-pressable-container="true"], [role="article"]');
    candidateNodes.forEach(node => {
      const postCard = findPostContainer(node);
      if (postCard) {
        checkAndFilterItem(postCard);
      }
    });
  }

  /**
   * 触发防抖扫描
   */
  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      performScan();
    }, SCAN_DELAY);
  }

  /**
   * 触发全量重新扫描（清除缓存状态）
   */
  function triggerFullScan() {
    // 重新扫描时，如果插件停用，则不执行
    if (!filterConfig.enabled || normalizedKeywords.length === 0) {
      return;
    }
    performScan();
  }

  /**
   * 使用 MutationObserver 监听 Threads 动态内容加载
   */
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            const addedNode = mutation.addedNodes[j];
            if (addedNode.nodeType === Node.ELEMENT_NODE) {
              // 忽略我们自己注入的样式或脚本
              if (addedNode.classList && addedNode.classList.contains('threads-filter-removed')) {
                continue;
              }
              shouldScan = true;
              break;
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        scheduleScan();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 初始化入口
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
