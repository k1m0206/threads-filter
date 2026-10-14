/**
 * Threads 关键词过滤助手 - 国际化 (i18n) 模块
 * 支持语言：简体中文 (zh-CN)、繁体中文 (zh-TW)、英语 (en)、日语 (ja)、韩语 (ko)
 * 支持首次自动根据浏览器语言 / 系统语言匹配切换，亦支持用户手动选择
 */

(function (global) {
  'use strict';

  const TRANSLATIONS = {
    'zh-CN': {
      // 头部
      brandTitle: 'Threads 过滤',
      brandSub: '关键词拦截助手',
      masterToggleTitle: '开启/关闭过滤',
      
      // 范围卡片
      scopeTitle: '覆盖范围（统一关键词库）',
      scopeUsername: '👤 用户名',
      scopePost: '📝 帖子正文',
      scopeComment: '💬 评论区回复',
      langSupport: '支持：简繁中文 · English · 日本語 · 한국어',
      
      // 输入与预设
      inputPlaceholder: '添加屏蔽词（按回车或点击添加）',
      btnAdd: '添加',
      inputHint: '可输入多个词，使用逗号或空格分隔',
      presetTitle: '热门推荐：',
      presetBuyFans: '买粉',
      presetJobPart: '兼职刷单',
      presetDmMe: '私信获取',
      presetCrypto: '虚拟币',
      presetGamble: '博彩',
      presetTraffic: '广告引流',
      
      // 列表区
      listTitle: '已屏蔽关键词',
      btnBatch: '批量操作',
      btnClearAll: '清空',
      emptyKeywords: '暂无关键词，在上方输入并添加',
      confirmClearAll: '确定要清空所有屏蔽关键词吗？',
      
      // 批量弹窗
      batchModalTitle: '批量编辑关键词',
      batchPlaceholder: '每行一个关键词，或用逗号隔开...',
      btnCopyAll: '复制全部',
      btnSaveBatch: '保存导入',
      copiedSuccess: '已复制到剪贴板',
      batchUpdated: '已更新 {count} 个关键词',
      
      // 设置项
      tradSimpTitle: '简繁互通识别',
      tradSimpDesc: '输入简体自动拦截繁体，反之亦然',
      
      // 统计栏
      statToday: '今日已移除',
      statTotal: '累计已移除',
      btnViewDetailStats: '查看详细统计报表',
      confirmResetStats: '确定将所有拦截统计重置为 0 吗？',
      
      // 底部与状态
      statusAutoSync: '设置自动实时同步',
      statusEnabled: '过滤功能已开启',
      statusDisabled: '过滤功能已停用',
      statusTradSimpOn: '简繁双向互通已开启',
      statusTradSimpOff: '仅精确文本匹配',
      statusAdded: '成功添加 {count} 个屏蔽词',
      statusExist: '关键词已存在',
      statusRemoved: '已移除「{word}」',
      statusCleared: '关键词已清空',
      statusStatsReset: '统计数据已重置',
      statusSaved: '已保存并同步生效',
      btnRescan: '重新扫描',
      statusRescanSuccess: '页面已实时重新扫描',
      statusRescanFail: '已保存，刷新页面即可生效',
      statusNotThreads: '当前标签不是 Threads 网页',
      
      // 统计页面
      statsPageTitle: 'Threads 过滤助手 - 统计中心',
      statsHeaderTitle: '过滤数据统计中心',
      statsHeaderSub: '详细记录每日拦截趋势与关键词分布',
      btnBackPopup: '返回',
      statsOverview: '数据总览',
      statCardTotal: '累计总拦截',
      statCardToday: '今日拦截',
      statCardKeywords: '已生效屏蔽词',
      statCardMaxDay: '单日最高拦截',
      statsTrendTitle: '近 14 天过滤趋势',
      statsRankTitle: '关键词累计拦截排行 (TOP 10)',
      statsDailyDetailTitle: '按日明细查询',
      selectDate: '选择日期',
      thKeyword: '关键词',
      thCount: '命中次数',
      thPercentage: '占比',
      thActions: '操作',
      noStatsData: '暂无拦截统计数据，多浏览 Threads 将自动记录',
      btnExportStats: '导出报表',
      btnClearStats: '清空统计',
      dateToday: '今天',
      dateYesterday: '昨天',
      languageLabel: '界面语言'
    },

    'zh-TW': {
      brandTitle: 'Threads 過濾',
      brandSub: '關鍵詞攔截助手',
      masterToggleTitle: '開啟/關閉過濾',
      scopeTitle: '覆蓋範圍（統一關鍵詞庫）',
      scopeUsername: '👤 用戶名',
      scopePost: '📝 貼文正文',
      scopeComment: '💬 留言區回覆',
      langSupport: '支援：簡繁中文 · English · 日本語 · 한국어',
      inputPlaceholder: '新增屏蔽詞（按 Enter 或點擊新增）',
      btnAdd: '新增',
      inputHint: '可輸入多個詞，使用逗號或空格分隔',
      presetTitle: '熱門推薦：',
      presetBuyFans: '買粉',
      presetJobPart: '兼職刷單',
      presetDmMe: '私訊領取',
      presetCrypto: '虛擬幣',
      presetGamble: '博彩',
      presetTraffic: '廣告引流',
      listTitle: '已屏蔽關鍵詞',
      btnBatch: '批次操作',
      btnClearAll: '清空',
      emptyKeywords: '暫無關鍵詞，在上方輸入並新增',
      confirmClearAll: '確定要清空所有屏蔽關鍵詞嗎？',
      batchModalTitle: '批次編輯關鍵詞',
      batchPlaceholder: '每行一個關鍵詞，或用逗號隔開...',
      btnCopyAll: '複製全部',
      btnSaveBatch: '儲存匯入',
      copiedSuccess: '已複製到剪貼簿',
      batchUpdated: '已更新 {count} 個關鍵詞',
      tradSimpTitle: '簡繁互通識別',
      tradSimpDesc: '輸入簡體自動攔截繁體，反之亦然',
      statToday: '今日已移除',
      statTotal: '累計已移除',
      btnViewDetailStats: '查看詳細統計報表',
      confirmResetStats: '確定將所有攔截統計重設為 0 嗎？',
      statusAutoSync: '設定自動即時同步',
      statusEnabled: '過濾功能已開啟',
      statusDisabled: '過濾功能已停用',
      statusTradSimpOn: '簡繁雙向互通已開啟',
      statusTradSimpOff: '僅精確文字比對',
      statusAdded: '成功新增 {count} 個屏蔽詞',
      statusExist: '關鍵詞已存在',
      statusRemoved: '已移除「{word}」',
      statusCleared: '關鍵詞已清空',
      statusStatsReset: '統計數據已重設',
      statusSaved: '已儲存並同步生效',
      btnRescan: '重新掃描',
      statusRescanSuccess: '頁面已即時重新掃描',
      statusRescanFail: '已儲存，重新載入頁面即可生效',
      statusNotThreads: '當前分頁不是 Threads 網頁',
      statsPageTitle: 'Threads 過濾助手 - 統計中心',
      statsHeaderTitle: '過濾數據統計中心',
      statsHeaderSub: '詳細記錄每日攔截趨勢與關鍵詞分佈',
      btnBackPopup: '返回',
      statsOverview: '數據總覽',
      statCardTotal: '累計總攔截',
      statCardToday: '今日攔截',
      statCardKeywords: '已生效屏蔽詞',
      statCardMaxDay: '單日最高攔截',
      statsTrendTitle: '近 14 天過濾趨勢',
      statsRankTitle: '關鍵詞累計攔截排行 (TOP 10)',
      statsDailyDetailTitle: '按日明細查詢',
      selectDate: '選擇日期',
      thKeyword: '關鍵詞',
      thCount: '命中次數',
      thPercentage: '佔比',
      thActions: '操作',
      noStatsData: '暫無攔截統計數據，多瀏覽 Threads 將自動記錄',
      btnExportStats: '匯出報表',
      btnClearStats: '清空統計',
      dateToday: '今天',
      dateYesterday: '昨天',
      languageLabel: '介面語言'
    },

    'en': {
      brandTitle: 'Threads Filter',
      brandSub: 'Keyword Blocker',
      masterToggleTitle: 'Enable/Disable filter',
      scopeTitle: 'Coverage (Unified Keywords)',
      scopeUsername: '👤 Usernames',
      scopePost: '📝 Posts Body',
      scopeComment: '💬 Replies & Comments',
      langSupport: 'Supports: Simplified/Trad Chinese · English · 日本語 · 한국어',
      inputPlaceholder: 'Add keyword (Enter or click Add)',
      btnAdd: 'Add',
      inputHint: 'Add multiple keywords separated by commas or spaces',
      presetTitle: 'Presets:',
      presetBuyFans: 'buy fans',
      presetJobPart: 'part-time',
      presetDmMe: 'DM me',
      presetCrypto: 'crypto',
      presetGamble: 'casino',
      presetTraffic: 'promo',
      listTitle: 'Blocked Keywords',
      btnBatch: 'Batch Edit',
      btnClearAll: 'Clear All',
      emptyKeywords: 'No keywords yet. Add some above.',
      confirmClearAll: 'Are you sure you want to clear all keywords?',
      batchModalTitle: 'Batch Edit Keywords',
      batchPlaceholder: 'One keyword per line or separated by commas...',
      btnCopyAll: 'Copy All',
      btnSaveBatch: 'Save & Import',
      copiedSuccess: 'Copied to clipboard',
      batchUpdated: 'Updated {count} keywords',
      tradSimpTitle: 'Simp/Trad Chinese Match',
      tradSimpDesc: 'Matches both Simplified & Traditional Chinese',
      statToday: 'Blocked Today',
      statTotal: 'Total Blocked',
      btnViewDetailStats: 'View Detailed Statistics',
      confirmResetStats: 'Are you sure you want to reset all stats to 0?',
      statusAutoSync: 'Settings synced automatically',
      statusEnabled: 'Filter enabled',
      statusDisabled: 'Filter disabled',
      statusTradSimpOn: 'Simp/Trad matching enabled',
      statusTradSimpOff: 'Exact text matching only',
      statusAdded: 'Added {count} keyword(s)',
      statusExist: 'Keyword already exists',
      statusRemoved: 'Removed "{word}"',
      statusCleared: 'Keywords cleared',
      statusStatsReset: 'Statistics reset',
      statusSaved: 'Saved and active',
      btnRescan: 'Rescan',
      statusRescanSuccess: 'Page rescanned in real-time',
      statusRescanFail: 'Saved. Refresh Threads tab to take effect',
      statusNotThreads: 'Active tab is not a Threads page',
      statsPageTitle: 'Threads Filter - Statistics',
      statsHeaderTitle: 'Filter Analytics Center',
      statsHeaderSub: 'Detailed daily blocking trends & keyword distribution',
      btnBackPopup: 'Back',
      statsOverview: 'Overview',
      statCardTotal: 'Total Blocked',
      statCardToday: 'Blocked Today',
      statCardKeywords: 'Active Keywords',
      statCardMaxDay: 'Single-Day Peak',
      statsTrendTitle: '14-Day Blocking Trend',
      statsRankTitle: 'Top Blocked Keywords (TOP 10)',
      statsDailyDetailTitle: 'Daily Details',
      selectDate: 'Select Date',
      thKeyword: 'Keyword',
      thCount: 'Hits',
      thPercentage: 'Share',
      thActions: 'Actions',
      noStatsData: 'No stats yet. Browse Threads to collect data.',
      btnExportStats: 'Export Stats',
      btnClearStats: 'Clear Stats',
      dateToday: 'Today',
      dateYesterday: 'Yesterday',
      languageLabel: 'UI Language'
    },

    'ja': {
      brandTitle: 'Threads フィルター',
      brandSub: 'キーワードブロック',
      masterToggleTitle: 'フィルターの有効/無効',
      scopeTitle: '対象範囲（一括キーワード）',
      scopeUsername: '👤 ユーザー名',
      scopePost: '📝 投稿本文',
      scopeComment: '💬 返信・コメント',
      langSupport: '対応言語：簡繁中国語 · 英語 · 日本語 · 韓国語',
      inputPlaceholder: 'キーワードを追加（Enterまたは追加をクリック）',
      btnAdd: '追加',
      inputHint: 'カンマや空白で区切って複数追加可能',
      presetTitle: 'おすすめ：',
      presetBuyFans: 'フォロワー購入',
      presetJobPart: '副業',
      presetDmMe: 'DMください',
      presetCrypto: '仮想通貨',
      presetGamble: 'カジノ',
      presetTraffic: '宣伝',
      listTitle: '登録キーワード',
      btnBatch: '一括編集',
      btnClearAll: 'すべて削除',
      emptyKeywords: 'キーワードはまだありません。上から追加してください。',
      confirmClearAll: 'すべてのキーワードを削除してもよろしいですか？',
      batchModalTitle: 'キーワード一括編集',
      batchPlaceholder: '1行に1つ、またはカンマ区切り...',
      btnCopyAll: 'すべてコピー',
      btnSaveBatch: '保存して反映',
      copiedSuccess: 'クリップボードにコピーしました',
      batchUpdated: '{count} 個のキーワードを更新しました',
      tradSimpTitle: '簡繁中国語相互変換',
      tradSimpDesc: '簡体字と繁体字を相互に自動マッチング',
      statToday: '今日のブロック数',
      statTotal: '累計ブロック数',
      btnViewDetailStats: '詳細統計を見る',
      confirmResetStats: '統計をリセットしてもよろしいですか？',
      statusAutoSync: '設定は自動的に同期されます',
      statusEnabled: 'フィルターを有効にしました',
      statusDisabled: 'フィルターを無効にしました',
      statusTradSimpOn: '簡繁相互変換を有効化',
      statusTradSimpOff: '完全一致のみ',
      statusAdded: '{count} 個のキーワードを追加しました',
      statusExist: '既に登録されています',
      statusRemoved: '「{word}」を削除しました',
      statusCleared: 'キーワードをクリアしました',
      statusStatsReset: '統計をリセットしました',
      statusSaved: '保存され、即時反映されました',
      btnRescan: '再スキャン',
      statusRescanSuccess: 'リアルタイムで再スキャンしました',
      statusRescanFail: '保存されました。ページをリロードしてください',
      statusNotThreads: 'Threads のタブではありません',
      statsPageTitle: 'Threads フィルター - 統計センター',
      statsHeaderTitle: 'フィルター統計センター',
      statsHeaderSub: '毎日のブロック推移とキーワード分布の詳細',
      btnBackPopup: '戻る',
      statsOverview: 'データ概要',
      statCardTotal: '累計ブロック数',
      statCardToday: '本日のブロック数',
      statCardKeywords: '有効キーワード数',
      statCardMaxDay: '1日の最高記録',
      statsTrendTitle: '過去14日間のブロック推移',
      statsRankTitle: 'キーワード別ランキング (TOP 10)',
      statsDailyDetailTitle: '日別内訳',
      selectDate: '日付を選択',
      thKeyword: 'キーワード',
      thCount: 'ヒット数',
      thPercentage: '割合',
      thActions: '操作',
      noStatsData: '統計データはまだありません',
      btnExportStats: 'データをエクスポート',
      btnClearStats: '統計をクリア',
      dateToday: '今日',
      dateYesterday: '昨日',
      languageLabel: '表示言語'
    },

    'ko': {
      brandTitle: 'Threads 필터',
      brandSub: '키워드 차단기',
      masterToggleTitle: '필터 켜기/끄기',
      scopeTitle: '차단 적용 범위 (공통 키워드)',
      scopeUsername: '👤 사용자 이름',
      scopePost: '📝 게시물 본문',
      scopeComment: '💬 댓글 및 답글',
      langSupport: '지원: 간체/번체 중국어 · 영어 · 일본어 · 한국어',
      inputPlaceholder: '키워드 추가 (Enter 키 또는 추가 클릭)',
      btnAdd: '추가',
      inputHint: '쉼표나 공백으로 구분하여 여러 개 추가 가능',
      presetTitle: '추천 키워드:',
      presetBuyFans: '팔로워 구매',
      presetJobPart: '부업알바',
      presetDmMe: '디엠문의',
      presetCrypto: '코인',
      presetGamble: '카지노',
      presetTraffic: '광고',
      listTitle: '차단된 키워드',
      btnBatch: '일괄 편집',
      btnClearAll: '전체 삭제',
      emptyKeywords: '등록된 키워드가 없습니다. 위에서 추가해주세요.',
      confirmClearAll: '모든 키워드를 삭제하시겠습니까?',
      batchModalTitle: '키워드 일괄 편집',
      batchPlaceholder: '한 줄에 하나씩 또는 쉼표로 구분...',
      btnCopyAll: '전체 복사',
      btnSaveBatch: '저장 및 적용',
      copiedSuccess: '클립보드에 복사되었습니다',
      batchUpdated: '{count}개의 키워드가 업데이트되었습니다',
      tradSimpTitle: '간체/번체 한자 상호 호환',
      tradSimpDesc: '간체자/번체자 키워드를 자동으로 상호 매칭',
      statToday: '오늘 차단',
      statTotal: '누적 차단',
      btnViewDetailStats: '상세 통계 리포트 보기',
      confirmResetStats: '모든 통계를 0으로 초기화하시겠습니까?',
      statusAutoSync: '설정이 자동으로 동기화됩니다',
      statusEnabled: '필터 기능이 활성화되었습니다',
      statusDisabled: '필터 기능이 비활성화되었습니다',
      statusTradSimpOn: '간체/번체 호환 활성화',
      statusTradSimpOff: '정확한 텍스트만 일치',
      statusAdded: '{count}개의 키워드를 추가했습니다',
      statusExist: '이미 등록된 키워드입니다',
      statusRemoved: '"{word}" 키워드를 삭제했습니다',
      statusCleared: '키워드가 전체 삭제되었습니다',
      statusStatsReset: '통계가 초기화되었습니다',
      statusSaved: '저장되어 즉시 적용되었습니다',
      btnRescan: '다시 스캔',
      statusRescanSuccess: '페이지를 즉시 다시 스캔했습니다',
      statusRescanFail: '저장되었습니다. 페이지를 새로고침하세요',
      statusNotThreads: 'Threads 탭이 아닙니다',
      statsPageTitle: 'Threads 필터 - 통계 센터',
      statsHeaderTitle: '필터 데이터 통계 센터',
      statsHeaderSub: '일일 차단 추세 및 키워드 분포 상세 기록',
      btnBackPopup: '뒤로',
      statsOverview: '데이터 요약',
      statCardTotal: '누적 총 차단',
      statCardToday: '오늘 차단',
      statCardKeywords: '활성 키워드',
      statCardMaxDay: '일일 최고 기록',
      statsTrendTitle: '최근 14일 차단 추이',
      statsRankTitle: '키워드별 차단 순위 (TOP 10)',
      statsDailyDetailTitle: '일자별 상세 내역',
      selectDate: '날짜 선택',
      thKeyword: '키워드',
      thCount: '적발 횟수',
      thPercentage: '비율',
      thActions: '동작',
      noStatsData: '아직 통계 데이터가 없습니다',
      btnExportStats: '통계 내보내기',
      btnClearStats: '통계 초기화',
      dateToday: '오늘',
      dateYesterday: '어제',
      languageLabel: '표시 언어'
    }
  };

  /**
   * 规范化语言编码
   */
  function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'zh-CN';
    const l = lang.toLowerCase();

    if (l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.startsWith('zh-mo') || l === 'zh-hant') {
      return 'zh-TW';
    }
    if (l.startsWith('zh')) {
      return 'zh-CN';
    }
    if (l.startsWith('en')) {
      return 'en';
    }
    if (l.startsWith('ja')) {
      return 'ja';
    }
    if (l.startsWith('ko')) {
      return 'ko';
    }

    return 'zh-CN';
  }

  /**
   * 检测当前最匹配的语言
   */
  function detectBestLanguage() {
    let browserLang = '';
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
        browserLang = chrome.i18n.getUILanguage();
      }
    } catch (e) {}

    if (!browserLang && typeof navigator !== 'undefined') {
      browserLang = (navigator.languages && navigator.languages[0]) || navigator.language;
    }

    return normalizeLang(browserLang);
  }

  // 当前语言
  let currentLang = 'zh-CN';

  /**
   * 初始化语言设置
   */
  function initLanguage(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['threads_filter_lang'], (res) => {
        if (res && res.threads_filter_lang) {
          currentLang = normalizeLang(res.threads_filter_lang);
        } else {
          // 首次进入：自动根据系统/浏览器语言切换
          currentLang = detectBestLanguage();
        }
        if (typeof callback === 'function') callback(currentLang);
      });
    } else {
      currentLang = detectBestLanguage();
      if (typeof callback === 'function') callback(currentLang);
    }
  }

  /**
   * 获取翻译文案
   */
  function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-CN'];
    let text = dict[key] || TRANSLATIONS['zh-CN'][key] || key;

    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
    return text;
  }

  /**
   * 将当前语言应用到 DOM 节点
   */
  function applyI18n(container = document) {
    // 文本内容
    const elements = container.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    // placeholder
    const placeholderEls = container.querySelectorAll('[data-i18n-placeholder]');
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key));
      }
    });

    // title 属性
    const titleEls = container.querySelectorAll('[data-i18n-title]');
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', t(key));
      }
    });
  }

  /**
   * 切换并持久化保存语言
   */
  function setLanguage(lang, callback) {
    currentLang = normalizeLang(lang);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ threads_filter_lang: currentLang }, () => {
        applyI18n();
        if (typeof callback === 'function') callback(currentLang);
      });
    } else {
      applyI18n();
      if (typeof callback === 'function') callback(currentLang);
    }
  }

  const I18n = {
    t,
    applyI18n,
    setLanguage,
    initLanguage,
    getCurrentLanguage: () => currentLang,
    SUPPORTED_LANGS: [
      { code: 'zh-CN', label: '简体中文' },
      { code: 'zh-TW', label: '繁體中文' },
      { code: 'en', label: 'English' },
      { code: 'ja', label: '日本語' },
      { code: 'ko', label: '한국어' }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
  } else {
    global.I18n = I18n;
  }
})(typeof window !== 'undefined' ? window : this);
