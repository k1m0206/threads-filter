/**
 * Threads伴侣 (ThreadsFilter) - Background Service Worker
 * 负责注册与响应“选中文本添加屏蔽词”右键菜单，并即时推流重新过滤指令
 */

const MENU_ID = 'threads_filter_add_keyword';

// 多语言菜单标题模板
const MENU_TITLES = {
  'zh-CN': '添加「%s」到 Threads 屏蔽词',
  'zh-TW': '新增「%s」至 Threads 屏蔽詞',
  'en': 'Add "%s" to Threads Filter',
  'ja': '「%s」を Threads フィルターに追加',
  'ko': '「%s」을(를) Threads 차단 단어에 추가'
};

/**
 * 获取当前语言的右键菜单标题
 */
function getMenuTitle(callback) {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['threads_filter_lang'], (res) => {
      const lang = (res && res.threads_filter_lang) || 'zh-CN';
      callback(MENU_TITLES[lang] || MENU_TITLES['zh-CN']);
    });
  } else {
    callback(MENU_TITLES['zh-CN']);
  }
}

/**
 * 注册或更新右键菜单
 */
function setupContextMenu() {
  getMenuTitle((title) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: MENU_ID,
        title: title,
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          // 忽略创建重复菜单错误
        }
      });
    });
  });
}

// 扩展安装或更新时注册菜单
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

// Service Worker 启动时保证菜单就绪
chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
});

// 监听语言设置变动，同步更新右键菜单文案
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.threads_filter_lang) {
    const newLang = changes.threads_filter_lang.newValue;
    const title = MENU_TITLES[newLang] || MENU_TITLES['zh-CN'];
    chrome.contextMenus.update(MENU_ID, { title }, () => {
      if (chrome.runtime.lastError) {
        setupContextMenu();
      }
    });
  }
});

/**
 * 向所有 Threads 标签页广播重新扫描消息
 */
function broadcastRescanToThreadsTabs(newKeywords) {
  chrome.tabs.query({}, (tabs) => {
    if (!tabs) return;
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes('threads.net') || tab.url.includes('threads.com'))) {
        chrome.tabs.sendMessage(tab.id, { action: 'RESCAN', keywords: newKeywords }, (res) => {
          // 如果该标签页尚未注入脚本，动态注入并执行
          if (chrome.runtime.lastError || !res) {
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['utils/text-normalizer.js', 'content.js']
              }).then(() => {
                chrome.tabs.sendMessage(tab.id, { action: 'RESCAN', keywords: newKeywords });
              }).catch(() => {});
            }
          }
        });
      }
    });
  });
}

/**
 * 在目标标签页显示反馈 Toast 浮层
 */
function notifyTabToast(tabId, keyword, isNew) {
  chrome.storage.sync.get(['threads_filter_lang'], (res) => {
    const lang = (res && res.threads_filter_lang) || 'zh-CN';
    let msg = '';
    if (isNew) {
      const msgs = {
        'zh-CN': `已添加屏蔽词:「${keyword}」`,
        'zh-TW': `已新增屏蔽詞:「${keyword}」`,
        'en': `Added to filter: "${keyword}"`,
        'ja': `フィルターに追加しました:「${keyword}」`,
        'ko': `차단 단어 추가됨: "${keyword}"`
      };
      msg = msgs[lang] || msgs['zh-CN'];
    } else {
      const msgs = {
        'zh-CN': `关键词已存在:「${keyword}」`,
        'zh-TW': `關鍵詞已存在:「${keyword}」`,
        'en': `Already in filter: "${keyword}"`,
        'ja': `既に登録されています:「${keyword}」`,
        'ko': `이미 등록된 키워드: "${keyword}"`
      };
      msg = msgs[lang] || msgs['zh-CN'];
    }

    chrome.tabs.sendMessage(tabId, { action: 'SHOW_TOAST', message: msg, isSuccess: isNew }, (res) => {
      if (chrome.runtime.lastError) {
        // 若通信未就绪，使用 executeScript 注入 Toast
        if (chrome.scripting && chrome.scripting.executeScript) {
          chrome.scripting.executeScript({
            target: { tabId },
            func: (toastText, isSuccess) => {
              let t = document.getElementById('threads-filter-toast');
              if (!t) {
                t = document.createElement('div');
                t.id = 'threads-filter-toast';
                document.body.appendChild(t);
              }
              t.textContent = toastText;
              t.className = 'threads-filter-toast show ' + (isSuccess ? 'success' : 'warn');
              setTimeout(() => {
                t.className = 'threads-filter-toast hide';
              }, 2200);
            },
            args: [msg, isNew]
          }).catch(() => {});
        }
      }
    });
  });
}

// 响应右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && info.selectionText) {
    const rawKeyword = info.selectionText.trim();
    if (!rawKeyword) return;

    // 读取并更新配置
    chrome.storage.sync.get(['threads_filter_config'], (result) => {
      const config = result.threads_filter_config || {
        enabled: true,
        keywords: [],
        convertTradToSimp: true,
        logToConsole: true
      };

      if (!Array.isArray(config.keywords)) {
        config.keywords = [];
      }

      let isNew = false;
      if (!config.keywords.includes(rawKeyword)) {
        config.keywords.push(rawKeyword);
        isNew = true;
      }

      // 写入存储
      chrome.storage.sync.set({ threads_filter_config: config }, () => {
        // 立即触发页面重新扫描并清除命中内容（毫秒级立竿见影）
        broadcastRescanToThreadsTabs(config.keywords);

        // 如果在某个标签页中点击，在该标签页弹出轻巧的 Toast 反馈
        if (tab && tab.id) {
          notifyTabToast(tab.id, rawKeyword, isNew);
        }
      });
    });
  }
});
