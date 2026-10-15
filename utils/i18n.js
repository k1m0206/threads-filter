/**
 * Threads 关键词过滤助手 - 国际化 (i18n) 模块
 * 中文名：Threads伴侣 | 英文名：ThreadsFilter
 * 支持语言：简体中文 (zh-CN)、繁体中文 (zh-TW)、英语 (en)、日语 (ja)、韩语 (ko)
 */

(function (global) {
  'use strict';

  const TRANSLATIONS = {
    'zh-CN': {
      brandTitle: 'Threads伴侣',
      brandSub: 'ThreadsFilter',
      masterToggleTitle: '开启/关闭过滤',
      themeToggleTitle: '切换深浅色主题',
      
      // 范围
      scopeUsername: '用户名',
      scopePost: '正文',
      scopeComment: '评论',
      
      // 输入与预设
      inputPlaceholder: '输入关键词，按回车添加',
      btnAdd: '添加',
      presetTitle: '常用：',
      presetBuyFans: '买粉',
      presetJobPart: '兼职刷单',
      presetDmMe: '私信获取',
      presetCrypto: '虚拟币',
      presetGamble: '博彩',
      presetTraffic: '广告引流',
      
      // 列表区
      listTitle: '已屏蔽词',
      btnExpandAll: '展开全部',
      btnCollapse: '收起',
      expandShowAll: '展开显示全部 ({count})',
      collapseList: '收起列表',
      btnBatch: '批量',
      btnClearAll: '清空',
      emptyKeywords: '暂无屏蔽词',
      confirmClearAll: '确定清空所有屏蔽词吗？',
      
      // 批量弹窗
      batchModalTitle: '批量编辑',
      batchPlaceholder: '每行一个关键词，或以逗号隔开...',
      btnCopyAll: '复制',
      btnSaveBatch: '保存',
      copiedSuccess: '已复制',
      batchUpdated: '已更新 {count} 个词',
      
      // 设置项
      tradSimpTitle: '简繁互通',
      
      // 统计栏
      statToday: '今日移除',
      statTotal: '累计移除',
      btnViewDetailStats: '详细统计',
      confirmResetStats: '确定清空所有统计数据吗？',
      
      // 状态
      statusEnabled: '已开启',
      statusDisabled: '已停用',
      statusTradSimpOn: '简繁互通已开启',
      statusTradSimpOff: '简繁互通已关闭',
      statusAdded: '已添加 {count} 个词',
      statusExist: '关键词已存在',
      statusRemoved: '已移除「{word}」',
      statusCleared: '已清空',
      statusStatsReset: '统计已重置',
      statusSaved: '已保存',
      btnRescan: '重新扫描',
      statusRescanSuccess: '已重新扫描',
      statusRescanFail: '请刷新 Threads 页面生效',
      statusNotThreads: '非 Threads 网页',
      
      // 统计页面
      statsPageTitle: 'Threads伴侣 - 统计中心',
      statsHeaderTitle: '过滤统计',
      statsHeaderSub: 'ThreadsFilter 过滤数据中心',
      statCardTotal: '累计总拦截',
      statCardToday: '今日拦截',
      statCardKeywords: '已生效词数',
      statCardMaxDay: '单日峰值',
      statsTrendTitle: '14 天过滤趋势',
      statsRankTitle: '拦截排行 TOP 100',
      statsDailyDetailTitle: '日明细',
      selectDate: '选择日期',
      thKeyword: '关键词',
      thCount: '次数',
      thPercentage: '占比',
      noStatsData: '暂无数据',
      btnExportStats: '导出报表',
      btnClearStats: '清空数据',
      dateToday: '今天',
      dateYesterday: '昨天'
    },

    'zh-TW': {
      brandTitle: 'Threads伴侶',
      brandSub: 'ThreadsFilter',
      masterToggleTitle: '開啟/關閉過濾',
      themeToggleTitle: '切換深淺色主題',
      scopeUsername: '用戶名',
      scopePost: '正文',
      scopeComment: '留言',
      inputPlaceholder: '輸入關鍵詞，按 Enter 新增',
      btnAdd: '新增',
      presetTitle: '常用：',
      presetBuyFans: '買粉',
      presetJobPart: '兼職刷單',
      presetDmMe: '私訊領取',
      presetCrypto: '虛擬幣',
      presetGamble: '博彩',
      presetTraffic: '廣告引流',
      listTitle: '已屏蔽詞',
      btnExpandAll: '展開全部',
      btnCollapse: '收起',
      expandShowAll: '展開顯示全部 ({count})',
      collapseList: '收起列表',
      btnBatch: '批次',
      btnClearAll: '清空',
      emptyKeywords: '暫無屏蔽詞',
      confirmClearAll: '確定清空所有屏蔽詞嗎？',
      batchModalTitle: '批次編輯',
      batchPlaceholder: '每行一個關鍵詞，或以逗號隔開...',
      btnCopyAll: '複製',
      btnSaveBatch: '儲存',
      copiedSuccess: '已複製',
      batchUpdated: '已更新 {count} 個詞',
      tradSimpTitle: '簡繁互通',
      statToday: '今日移除',
      statTotal: '累計移除',
      btnViewDetailStats: '詳細統計',
      confirmResetStats: '確定清空所有統計數據嗎？',
      statusEnabled: '已開啟',
      statusDisabled: '已停用',
      statusTradSimpOn: '簡繁互通已開啟',
      statusTradSimpOff: '簡繁互通已關閉',
      statusAdded: '已新增 {count} 個詞',
      statusExist: '關鍵詞已存在',
      statusRemoved: '已移除「{word}」',
      statusCleared: '已清空',
      statusStatsReset: '統計已重設',
      statusSaved: '已儲存',
      btnRescan: '重新掃描',
      statusRescanSuccess: '已重新掃描',
      statusRescanFail: '請重新整理 Threads 頁面生效',
      statusNotThreads: '非 Threads 網頁',
      statsPageTitle: 'Threads伴侶 - 統計中心',
      statsHeaderTitle: '過濾統計',
      statsHeaderSub: 'ThreadsFilter 過濾數據中心',
      statCardTotal: '累計總攔截',
      statCardToday: '今日攔截',
      statCardKeywords: '已生效詞數',
      statCardMaxDay: '單日峰值',
      statsTrendTitle: '14 天過濾趨勢',
      statsRankTitle: '攔截排行 TOP 100',
      statsDailyDetailTitle: '日明細',
      selectDate: '選擇日期',
      thKeyword: '關鍵詞',
      thCount: '次數',
      thPercentage: '佔比',
      noStatsData: '暫無數據',
      btnExportStats: '匯出報表',
      btnClearStats: '清空數據',
      dateToday: '今天',
      dateYesterday: '昨天'
    },

    'en': {
      brandTitle: 'ThreadsFilter',
      brandSub: 'Threads Companion',
      masterToggleTitle: 'Enable/Disable filter',
      themeToggleTitle: 'Toggle Light/Dark Theme',
      scopeUsername: 'Users',
      scopePost: 'Posts',
      scopeComment: 'Replies',
      inputPlaceholder: 'Type keyword and hit Enter',
      btnAdd: 'Add',
      presetTitle: 'Presets:',
      presetBuyFans: 'buy fans',
      presetJobPart: 'part-time',
      presetDmMe: 'DM me',
      presetCrypto: 'crypto',
      presetGamble: 'casino',
      presetTraffic: 'promo',
      listTitle: 'Blocked Words',
      btnExpandAll: 'Expand All',
      btnCollapse: 'Collapse',
      expandShowAll: 'Show All ({count})',
      collapseList: 'Collapse',
      btnBatch: 'Batch',
      btnClearAll: 'Clear',
      emptyKeywords: 'No blocked words yet',
      confirmClearAll: 'Clear all blocked words?',
      batchModalTitle: 'Batch Edit',
      batchPlaceholder: 'One keyword per line or comma-separated...',
      btnCopyAll: 'Copy',
      btnSaveBatch: 'Save',
      copiedSuccess: 'Copied',
      batchUpdated: 'Updated {count} keywords',
      tradSimpTitle: 'Simp/Trad Chinese',
      statToday: 'Today',
      statTotal: 'Total',
      btnViewDetailStats: 'Statistics',
      confirmResetStats: 'Clear all statistics?',
      statusEnabled: 'Enabled',
      statusDisabled: 'Disabled',
      statusTradSimpOn: 'Simp/Trad on',
      statusTradSimpOff: 'Simp/Trad off',
      statusAdded: 'Added {count} keyword(s)',
      statusExist: 'Already exists',
      statusRemoved: 'Removed "{word}"',
      statusCleared: 'Cleared',
      statusStatsReset: 'Stats reset',
      statusSaved: 'Saved',
      btnRescan: 'Rescan',
      statusRescanSuccess: 'Rescanned',
      statusRescanFail: 'Refresh Threads to take effect',
      statusNotThreads: 'Not on Threads',
      statsPageTitle: 'ThreadsFilter - Statistics',
      statsHeaderTitle: 'Filter Statistics',
      statsHeaderSub: 'ThreadsFilter Analytics Center',
      statCardTotal: 'Total Blocked',
      statCardToday: 'Today Blocked',
      statCardKeywords: 'Active Words',
      statCardMaxDay: 'Single-Day Peak',
      statsTrendTitle: '14-Day Trend',
      statsRankTitle: 'Top 100 Blocked',
      statsDailyDetailTitle: 'Daily Details',
      selectDate: 'Select Date',
      thKeyword: 'Keyword',
      thCount: 'Hits',
      thPercentage: 'Share',
      noStatsData: 'No data yet',
      btnExportStats: 'Export',
      btnClearStats: 'Clear',
      dateToday: 'Today',
      dateYesterday: 'Yesterday'
    },

    'ja': {
      brandTitle: 'Threads伴侶',
      brandSub: 'ThreadsFilter',
      masterToggleTitle: 'フィルターの有効/無効',
      themeToggleTitle: 'テーマ切り替え',
      scopeUsername: 'ユーザー名',
      scopePost: '本文',
      scopeComment: '返信',
      inputPlaceholder: 'キーワードを入力しEnter',
      btnAdd: '追加',
      presetTitle: 'おすすめ：',
      presetBuyFans: 'フォロワー購入',
      presetJobPart: '副業',
      presetDmMe: 'DMください',
      presetCrypto: '仮想通貨',
      presetGamble: 'カジノ',
      presetTraffic: '宣伝',
      listTitle: '登録キーワード',
      btnExpandAll: 'すべて展開',
      btnCollapse: '折りたたむ',
      expandShowAll: 'すべて表示 ({count})',
      collapseList: '折りたたむ',
      btnBatch: '一括',
      btnClearAll: 'クリア',
      emptyKeywords: 'キーワードは未登録です',
      confirmClearAll: 'すべてのキーワードを削除しますか？',
      batchModalTitle: '一括編集',
      batchPlaceholder: '1行に1つ、またはカンマ区切り...',
      btnCopyAll: 'コピー',
      btnSaveBatch: '保存',
      copiedSuccess: 'コピーしました',
      batchUpdated: '{count} 個更新しました',
      tradSimpTitle: '簡繁中国語変換',
      statToday: '今日',
      statTotal: '累計',
      btnViewDetailStats: '統計',
      confirmResetStats: '統計データをクリアしますか？',
      statusEnabled: '有効化',
      statusDisabled: '無効化',
      statusTradSimpOn: '簡繁互換 ON',
      statusTradSimpOff: '簡繁互換 OFF',
      statusAdded: '{count} 個追加しました',
      statusExist: '既に存在します',
      statusRemoved: '「{word}」を削除',
      statusCleared: 'クリアしました',
      statusStatsReset: '統計をリセットしました',
      statusSaved: '保存しました',
      btnRescan: '再スキャン',
      statusRescanSuccess: '再スキャン完了',
      statusRescanFail: 'Threads をリロードしてください',
      statusNotThreads: 'Threads ページではありません',
      statsPageTitle: 'Threads伴侶 - 統計センター',
      statsHeaderTitle: 'フィルター統計',
      statsHeaderSub: 'ThreadsFilter データセンター',
      statCardTotal: '累計ブロック',
      statCardToday: '本日ブロック',
      statCardKeywords: '登録語数',
      statCardMaxDay: '1日最高記録',
      statsTrendTitle: '過去14日間の推移',
      statsRankTitle: 'ランキング TOP 100',
      statsDailyDetailTitle: '日別明細',
      selectDate: '日付を選択',
      thKeyword: 'キーワード',
      thCount: '回数',
      thPercentage: '割合',
      noStatsData: 'データはありません',
      btnExportStats: 'エクスポート',
      btnClearStats: 'データ削除',
      dateToday: '今日',
      dateYesterday: '昨日'
    },

    'ko': {
      brandTitle: 'Threads 메이트',
      brandSub: 'ThreadsFilter',
      masterToggleTitle: '필터 켜기/끄기',
      themeToggleTitle: '테마 전환',
      scopeUsername: '사용자',
      scopePost: '본문',
      scopeComment: '댓글',
      inputPlaceholder: '키워드 입력 후 Enter',
      btnAdd: '추가',
      presetTitle: '추천:',
      presetBuyFans: '팔로워 구매',
      presetJobPart: '부업알바',
      presetDmMe: '디엠문의',
      presetCrypto: '코인',
      presetGamble: '카지노',
      presetTraffic: '광고',
      listTitle: '차단 키워드',
      btnExpandAll: '전체 펼치기',
      btnCollapse: '접기',
      expandShowAll: '전체 보기 ({count})',
      collapseList: '목록 접기',
      btnBatch: '일괄',
      btnClearAll: '비우기',
      emptyKeywords: '등록된 키워드가 없습니다',
      confirmClearAll: '모든 키워드를 비우시겠습니까?',
      batchModalTitle: '일괄 편집',
      batchPlaceholder: '한 줄에 하나씩 또는 쉼표 구분...',
      btnCopyAll: '복사',
      btnSaveBatch: '저장',
      copiedSuccess: '복사됨',
      batchUpdated: '{count}개 키워드 업데이트됨',
      tradSimpTitle: '간체/번체 호환',
      statToday: '오늘',
      statTotal: '누적',
      btnViewDetailStats: '상세 통계',
      confirmResetStats: '모든 통계를 초기화하시겠습니까?',
      statusEnabled: '활성화됨',
      statusDisabled: '비활성화됨',
      statusTradSimpOn: '간체/번체 호환 켜짐',
      statusTradSimpOff: '간체/번체 호환 꺼짐',
      statusAdded: '{count}개 추가됨',
      statusExist: '이미 등록된 키워드',
      statusRemoved: '"{word}" 삭제됨',
      statusCleared: '비워짐',
      statusStatsReset: '통계 초기화됨',
      statusSaved: '저장됨',
      btnRescan: '다시 스캔',
      statusRescanSuccess: '다시 스캔 완료',
      statusRescanFail: 'Threads 페이지를 새로고침하세요',
      statusNotThreads: 'Threads 탭이 아님',
      statsPageTitle: 'Threads 메이트 - 통계',
      statsHeaderTitle: '필터 통계',
      statsHeaderSub: 'ThreadsFilter 데이터 센터',
      statCardTotal: '누적 차단',
      statCardToday: '오늘 차단',
      statCardKeywords: '등록 단어 수',
      statCardMaxDay: '일일 최고',
      statsTrendTitle: '최근 14일 추이',
      statsRankTitle: '차단 순위 TOP 100',
      statsDailyDetailTitle: '일자별 명세',
      selectDate: '날짜 선택',
      thKeyword: '키워드',
      thCount: '횟수',
      thPercentage: '비율',
      noStatsData: '데이터 없음',
      btnExportStats: '내보내기',
      btnClearStats: '데이터 초기화',
      dateToday: '오늘',
      dateYesterday: '어제'
    }
  };

  function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'zh-CN';
    const l = lang.toLowerCase();
    if (l.startsWith('zh-tw') || l.startsWith('zh-hk') || l.startsWith('zh-mo') || l === 'zh-hant') return 'zh-TW';
    if (l.startsWith('zh')) return 'zh-CN';
    if (l.startsWith('en')) return 'en';
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    return 'zh-CN';
  }

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

  let currentLang = 'zh-CN';

  function initLanguage(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['threads_filter_lang'], (res) => {
        if (res && res.threads_filter_lang) {
          currentLang = normalizeLang(res.threads_filter_lang);
        } else {
          currentLang = detectBestLanguage();
        }
        if (typeof callback === 'function') callback(currentLang);
      });
    } else {
      currentLang = detectBestLanguage();
      if (typeof callback === 'function') callback(currentLang);
    }
  }

  function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['zh-CN'];
    let text = dict[key] || TRANSLATIONS['zh-CN'][key] || key;
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
    return text;
  }

  function applyI18n(container = document) {
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });

    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
  }

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
    getCurrentLanguage: () => currentLang
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
  } else {
    global.I18n = I18n;
  }
})(typeof window !== 'undefined' ? window : this);
