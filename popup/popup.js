/**
 * Threads伴侣 (ThreadsFilter) - Popup 设置页面交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素引用
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const masterToggle = document.getElementById('masterToggle');
  const tradSimpToggle = document.getElementById('tradSimpToggle');
  const langSelect = document.getElementById('langSelect');
  const keywordInput = document.getElementById('keywordInput');
  const addBtn = document.getElementById('addBtn');
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

  let currentConfig = {
    enabled: true,
    keywords: [],
    convertTradToSimp: true,
    logToConsole: true
  };

  let currentTheme = 'light';

  function t(key, params) {
    return window.I18n ? window.I18n.t(key, params) : key;
  }

  let statusTimer = null;
  function showStatus(msg, isSuccess = true) {
    if (statusTimer) clearTimeout(statusTimer);
    statusMsg.textContent = msg;
    statusMsg.style.color = isSuccess ? 'var(--text-sub)' : 'var(--danger)';
    statusTimer = setTimeout(() => {
      statusMsg.textContent = '';
    }, 2200);
  }

  function applyTheme(theme) {
    currentTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (currentTheme === 'dark') {
      themeIconSun.style.display = 'block';
      themeIconMoon.style.display = 'none';
    } else {
      themeIconSun.style.display = 'none';
      themeIconMoon.style.display = 'block';
    }
  }

  function initTheme() {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['threads_filter_theme'], (res) => {
        applyTheme(res.threads_filter_theme || 'light');
      });
    } else {
      applyTheme('light');
    }
  }

  function toggleTheme() {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ threads_filter_theme: nextTheme });
    }
  }

  function renderKeywords() {
    const keywords = currentConfig.keywords || [];
    keywordCount.textContent = keywords.length;

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

  function saveConfig(callback) {
    if (!chrome.storage || !chrome.storage.sync) return;
    chrome.storage.sync.set({ threads_filter_config: currentConfig }, () => {
      showStatus(t('statusSaved'));
      if (typeof callback === 'function') callback();
    });
  }

  function addKeywordsFromInput(text) {
    if (!text || typeof text !== 'string') return;
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

  function removeKeyword(index) {
    if (index >= 0 && index < currentConfig.keywords.length) {
      const removed = currentConfig.keywords.splice(index, 1);
      renderKeywords();
      saveConfig();
      showStatus(t('statusRemoved', { word: removed }));
    }
  }

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

  function init() {
    initTheme();

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

  // 事件绑定
  themeToggleBtn.addEventListener('click', toggleTheme);

  langSelect.addEventListener('change', () => {
    if (window.I18n) {
      window.I18n.setLanguage(langSelect.value, () => {
        window.I18n.applyI18n();
        renderKeywords();
      });
    }
  });

  masterToggle.addEventListener('change', () => {
    currentConfig.enabled = masterToggle.checked;
    saveConfig();
    showStatus(masterToggle.checked ? t('statusEnabled') : t('statusDisabled'));
  });

  tradSimpToggle.addEventListener('change', () => {
    currentConfig.convertTradToSimp = tradSimpToggle.checked;
    saveConfig();
    showStatus(tradSimpToggle.checked ? t('statusTradSimpOn') : t('statusTradSimpOff'));
  });

  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeywordsFromInput(keywordInput.value);
    }
  });

  addBtn.addEventListener('click', () => {
    addKeywordsFromInput(keywordInput.value);
  });

  clearAllBtn.addEventListener('click', () => {
    if (currentConfig.keywords.length === 0) return;
    if (confirm(t('confirmClearAll'))) {
      currentConfig.keywords = [];
      renderKeywords();
      saveConfig();
      showStatus(t('statusCleared'));
    }
  });

  batchBtn.addEventListener('click', () => {
    batchTextarea.value = currentConfig.keywords.join('\n');
    batchModal.style.display = 'flex';
  });

  closeModalBtn.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });

  copyAllBtn.addEventListener('click', () => {
    batchTextarea.select();
    navigator.clipboard.writeText(batchTextarea.value).then(() => {
      showStatus(t('copiedSuccess'));
    });
  });

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

  openStatsPageBtn.addEventListener('click', () => {
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') });
    } else {
      window.open('../stats/stats.html');
    }
  });

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

  init();
});
