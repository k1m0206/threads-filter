/**
 * Threads 关键词过滤助手 - Popup 设置页面交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素引用
  const masterToggle = document.getElementById('masterToggle');
  const tradSimpToggle = document.getElementById('tradSimpToggle');
  const langSelect = document.getElementById('langSelect');
  const keywordInput = document.getElementById('keywordInput');
  const addBtn = document.getElementById('addBtn');
  const presetTags = document.getElementById('presetTags');
  const tagsContainer = document.getElementById('tagsContainer');
  const emptyState = document.getElementById('emptyState');
  const keywordCount = document.getElementById('keywordCount');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const batchBtn = document.getElementById('batchBtn');
  const batchModal = document.getElementById('batchModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const batchTextarea = document.getElementById('batchTextarea');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const saveBatchBtn = document.getElementById('saveBatchBtn');
  const todayBlockedCount = document.getElementById('todayBlockedCount');
  const totalBlockedCount = document.getElementById('totalBlockedCount');
  const openStatsPageBtn = document.getElementById('openStatsPageBtn');
  const resetStatBtn = document.getElementById('resetStatBtn');
  const rescanBtn = document.getElementById('rescanBtn');
  const statusMsg = document.getElementById('statusMsg');

  // 本地配置状态
  let currentConfig = {
    enabled: true,
    keywords: [],
    convertTradToSimp: true,
    logToConsole: true
  };

  /**
   * 国际化翻译辅助函数
   */
  function t(key, params) {
    return window.I18n ? window.I18n.t(key, params) : key;
  }

  /**
   * 显示状态临时提示
   */
  let statusTimer = null;
  function showStatus(msg, isSuccess = true) {
    if (statusTimer) clearTimeout(statusTimer);
    statusMsg.textContent = msg;
    statusMsg.style.color = isSuccess ? '#ffffff' : '#ff4d4f';
    statusTimer = setTimeout(() => {
      statusMsg.textContent = t('statusAutoSync');
      statusMsg.style.color = '#666666';
    }, 2500);
  }

  /**
   * 渲染关键词标签列表
   */
  function renderKeywords() {
    const keywords = currentConfig.keywords || [];
    keywordCount.textContent = keywords.length;

    // 清空现有标签
    tagsContainer.innerHTML = '';

    if (keywords.length === 0) {
      emptyState.style.display = 'block';
      emptyState.textContent = t('emptyKeywords');
      tagsContainer.appendChild(emptyState);
      return;
    }

    keywords.forEach((word, index) => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';

      const textSpan = document.createElement('span');
      textSpan.textContent = word;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'tag-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = t('statusRemoved', { word });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeKeyword(index);
      });

      chip.appendChild(textSpan);
      chip.appendChild(removeBtn);
      tagsContainer.appendChild(chip);
    });
  }

  /**
   * 保存配置到 Chrome Storage
   */
  function saveConfig(callback) {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.set({ threads_filter_config: currentConfig }, () => {
      showStatus(t('statusSaved'));
      if (typeof callback === 'function') callback();
    });
  }

  /**
   * 添加关键词
   */
  function addKeywordsFromInput(text) {
    if (!text || typeof text !== 'string') return;

    // 按中英文逗号、换行、分号、多空格分割
    const tokens = text.split(/[\n,，;；\s]+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    let addedCount = 0;
    tokens.forEach(tok => {
      if (!currentConfig.keywords.includes(tok)) {
        currentConfig.keywords.push(tok);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      renderKeywords();
      saveConfig();
      showStatus(t('statusAdded', { count: addedCount }));
    } else {
      showStatus(t('statusExist'), false);
    }

    keywordInput.value = '';
    keywordInput.focus();
  }

  /**
   * 删除单个关键词
   */
  function removeKeyword(index) {
    if (index >= 0 && index < currentConfig.keywords.length) {
      const removed = currentConfig.keywords.splice(index, 1);
      renderKeywords();
      saveConfig();
      showStatus(t('statusRemoved', { word: removed }));
    }
  }

  /**
   * 加载拦截统计数据
   */
  function loadStats() {
    const storageArea = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
    if (!storageArea) return;

    storageArea.get(['threads_filter_stats', 'threads_filter_stats_summary'], (res) => {
      let total = 0;
      let today = 0;
      const todayStr = new Date().toISOString().slice(0, 10);

      if (res.threads_filter_stats) {
        const stats = res.threads_filter_stats;
        total = stats.totalBlocked || 0;
        if (stats.dailyStats && stats.dailyStats[todayStr]) {
          today = stats.dailyStats[todayStr].total || 0;
        }
      } else if (res.threads_filter_stats_summary) {
        const summary = res.threads_filter_stats_summary;
        total = summary.totalBlocked || 0;
        if (summary.lastDate === todayStr) {
          today = summary.todayBlocked || 0;
        }
      }

      todayBlockedCount.textContent = today;
      totalBlockedCount.textContent = total;
    });
  }

  /**
   * 初始化语言与配置
   */
  function init() {
    // 1. 初始化国际化语言
    if (window.I18n) {
      window.I18n.initLanguage((lang) => {
        langSelect.value = lang;
        window.I18n.applyI18n();
        loadConfigAndRender();
      });
    } else {
      loadConfigAndRender();
    }
  }

  function loadConfigAndRender() {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.get(['threads_filter_config'], (result) => {
      if (result && result.threads_filter_config) {
        currentConfig = Object.assign(currentConfig, result.threads_filter_config);
      }
      masterToggle.checked = currentConfig.enabled !== false;
      tradSimpToggle.checked = currentConfig.convertTradToSimp !== false;
      renderKeywords();
    });
    loadStats();
  }

  // --- 事件绑定 ---

  // 语言快捷切换
  langSelect.addEventListener('change', () => {
    if (window.I18n) {
      window.I18n.setLanguage(langSelect.value, () => {
        window.I18n.applyI18n();
        renderKeywords();
      });
    }
  });

  // 总开关
  masterToggle.addEventListener('change', () => {
    currentConfig.enabled = masterToggle.checked;
    saveConfig();
    showStatus(masterToggle.checked ? t('statusEnabled') : t('statusDisabled'));
  });

  // 简繁互通开关
  tradSimpToggle.addEventListener('change', () => {
    currentConfig.convertTradToSimp = tradSimpToggle.checked;
    saveConfig();
    showStatus(tradSimpToggle.checked ? t('statusTradSimpOn') : t('statusTradSimpOff'));
  });

  // 输入框 Enter 键添加
  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeywordsFromInput(keywordInput.value);
    }
  });

  // 添加按钮
  addBtn.addEventListener('click', () => {
    addKeywordsFromInput(keywordInput.value);
  });

  // 热门预设词点击
  if (presetTags) {
    presetTags.addEventListener('click', (e) => {
      const pill = e.target.closest('.preset-pill');
      if (pill) {
        const word = pill.dataset.word || pill.textContent;
        if (word) {
          addKeywordsFromInput(word);
        }
      }
    });
  }

  // 清空全部关键词
  clearAllBtn.addEventListener('click', () => {
    if (currentConfig.keywords.length === 0) return;
    if (confirm(t('confirmClearAll'))) {
      currentConfig.keywords = [];
      renderKeywords();
      saveConfig();
      showStatus(t('statusCleared'));
    }
  });

  // 打开批量操作弹层
  batchBtn.addEventListener('click', () => {
    batchTextarea.value = currentConfig.keywords.join('\n');
    batchModal.style.display = 'flex';
  });

  closeModalBtn.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });

  // 复制全部关键词
  copyAllBtn.addEventListener('click', () => {
    batchTextarea.select();
    navigator.clipboard.writeText(batchTextarea.value).then(() => {
      showStatus(t('copiedSuccess'));
    });
  });

  // 保存批量导入
  saveBatchBtn.addEventListener('click', () => {
    const text = batchTextarea.value;
    const tokens = text.split(/[\n,，;；\s]+/).map(t => t.trim()).filter(Boolean);
    const uniqueTokens = Array.from(new Set(tokens));
    currentConfig.keywords = uniqueTokens;
    renderKeywords();
    saveConfig();
    batchModal.style.display = 'none';
    showStatus(t('batchUpdated', { count: uniqueTokens.length }));
  });

  // 打开详细统计页面
  openStatsPageBtn.addEventListener('click', () => {
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') });
    } else {
      window.open('../stats/stats.html');
    }
  });

  // 重置统计计数
  resetStatBtn.addEventListener('click', () => {
    if (confirm(t('confirmResetStats'))) {
      const resetData = {
        totalBlocked: 0,
        dailyStats: {},
        keywordTotals: {}
      };

      const storageArea = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
      if (storageArea) {
        storageArea.set({ threads_filter_stats: resetData }, () => {
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({
              threads_filter_stats_summary: { totalBlocked: 0, todayBlocked: 0, lastDate: '' }
            });
          }
          todayBlockedCount.textContent = '0';
          totalBlockedCount.textContent = '0';
          showStatus(t('statusStatsReset'));
        });
      }
    }
  });

  // 重新扫描当前 Threads 标签页
  rescanBtn.addEventListener('click', () => {
    if (!chrome.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      if (activeTab.url && (activeTab.url.includes('threads.net') || activeTab.url.includes('threads.com'))) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'RESCAN' }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus(t('statusRescanFail'));
          } else {
            showStatus(t('statusRescanSuccess'));
          }
        });
      } else {
        showStatus(t('statusNotThreads'));
      }
    });
  });

  // 启动初始化
  init();
});
