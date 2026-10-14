/**
 * Threads 关键词过滤助手 - 统计中心页面控制器
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 引用
  const langSelect = document.getElementById('langSelect');
  const exportBtn = document.getElementById('exportBtn');
  const clearStatsBtn = document.getElementById('clearStatsBtn');

  const valTotalBlocked = document.getElementById('valTotalBlocked');
  const valTodayBlocked = document.getElementById('valTodayBlocked');
  const valActiveKeywords = document.getElementById('valActiveKeywords');
  const valMaxDayBlocked = document.getElementById('valMaxDayBlocked');

  const trendSvg = document.getElementById('trendSvg');
  const trendDates = document.getElementById('trendDates');
  const rankList = document.getElementById('rankList');

  const dateSelect = document.getElementById('dateSelect');
  const dailyTableBody = document.getElementById('dailyTableBody');

  let statsData = {
    totalBlocked: 0,
    dailyStats: {},
    keywordTotals: {}
  };

  let activeKeywordsList = [];

  /**
   * 初始化语言环境
   */
  function setupI18n() {
    if (window.I18n) {
      window.I18n.initLanguage((lang) => {
        langSelect.value = lang;
        window.I18n.applyI18n();
        loadAllData();
      });

      langSelect.addEventListener('change', () => {
        window.I18n.setLanguage(langSelect.value, () => {
          renderAll();
        });
      });
    } else {
      loadAllData();
    }
  }

  /**
   * 加载数据
   */
  function loadAllData() {
    const storageLocal = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
    if (!storageLocal) return;

    // 读取统计
    storageLocal.get(['threads_filter_stats'], (res) => {
      if (res && res.threads_filter_stats) {
        statsData = Object.assign(statsData, res.threads_filter_stats);
      }

      // 读取关键词配置
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['threads_filter_config'], (cfgRes) => {
          if (cfgRes && cfgRes.threads_filter_config && cfgRes.threads_filter_config.keywords) {
            activeKeywordsList = cfgRes.threads_filter_config.keywords;
          }
          renderAll();
        });
      } else {
        renderAll();
      }
    });
  }

  /**
   * 格式化最近 N 天的日期数组 (YYYY-MM-DD)
   */
  function getLastNDays(n) {
    const dates = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  /**
   * 渲染数据总览
   */
  function renderOverview() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = (statsData.dailyStats[todayStr] && statsData.dailyStats[todayStr].total) || 0;

    let maxDayCount = 0;
    Object.values(statsData.dailyStats).forEach(dayObj => {
      if (dayObj && dayObj.total > maxDayCount) {
        maxDayCount = dayObj.total;
      }
    });

    valTotalBlocked.textContent = statsData.totalBlocked.toLocaleString();
    valTodayBlocked.textContent = todayCount.toLocaleString();
    valActiveKeywords.textContent = activeKeywordsList.length.toLocaleString();
    valMaxDayBlocked.textContent = maxDayCount.toLocaleString();
  }

  /**
   * 渲染 14 天过滤趋势柱状图 (SVG)
   */
  function renderTrendChart() {
    const days = getLastNDays(14);
    const counts = days.map(d => (statsData.dailyStats[d] && statsData.dailyStats[d].total) || 0);

    const maxVal = Math.max(...counts, 10);
    const svgWidth = 760;
    const svgHeight = 160;
    const barWidth = 32;
    const gap = (svgWidth - barWidth * days.length) / (days.length + 1);

    let svgInnerHtml = '';

    days.forEach((day, index) => {
      const count = counts[index];
      const barHeight = Math.max(3, Math.round((count / maxVal) * (svgHeight - 20)));
      const x = gap + index * (barWidth + gap);
      const y = svgHeight - barHeight;

      // 槽位背景柱
      svgInnerHtml += `
        <rect class="trend-bg-bar" x="${x}" y="0" width="${barWidth}" height="${svgHeight}">
          <title>${day}: ${count} 次拦截</title>
        </rect>
      `;

      // 实际计数柱
      if (count > 0) {
        svgInnerHtml += `
          <rect class="trend-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}">
            <title>${day}: ${count} 次拦截</title>
          </rect>
        `;
      }
    });

    trendSvg.innerHTML = svgInnerHtml;

    // 显示首尾与中间日期标签
    trendDates.innerHTML = `
      <span>${days[0]}</span>
      <span>${days[Math.floor(days.length / 2)]}</span>
      <span>${days[days.length - 1]} (${window.I18n ? window.I18n.t('dateToday') : '今天'})</span>
    `;
  }

  /**
   * 渲染关键词累计拦截排行榜
   */
  function renderRanking() {
    const totals = statsData.keywordTotals || {};
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      rankList.innerHTML = `<div class="empty-hint">${window.I18n ? window.I18n.t('noStatsData') : '暂无数据'}</div>`;
      return;
    }

    const topEntries = entries.slice(0, 10);
    const highest = topEntries[0][1] || 1;

    let html = '';
    topEntries.forEach(([word, count], idx) => {
      const percent = Math.min(100, Math.round((count / highest) * 100));
      html += `
        <div class="rank-item">
          <div class="rank-meta">
            <span class="rank-word">#${idx + 1} ${escapeHtml(word)}</span>
            <span class="rank-count">${count} 次</span>
          </div>
          <div class="rank-progress-bg">
            <div class="rank-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    });

    rankList.innerHTML = html;
  }

  /**
   * 填充并渲染每日明细
   */
  function renderDailySection() {
    const dates = Object.keys(statsData.dailyStats || {}).sort().reverse();

    dateSelect.innerHTML = `<option value="">${window.I18n ? window.I18n.t('selectDate') : '选择日期'}</option>`;

    if (dates.length === 0) {
      dailyTableBody.innerHTML = `<tr><td colspan="3" class="empty-hint">${window.I18n ? window.I18n.t('noStatsData') : '暂无数据'}</td></tr>`;
      return;
    }

    dates.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      const count = statsData.dailyStats[d].total || 0;
      opt.textContent = `${d} (${count} 次)`;
      dateSelect.appendChild(opt);
    });

    // 默认选中最新一天
    const selectedDate = dates[0];
    dateSelect.value = selectedDate;
    renderDailyTable(selectedDate);

    dateSelect.onchange = () => {
      renderDailyTable(dateSelect.value);
    };
  }

  /**
   * 渲染选定日期的关键词拦截表格
   */
  function renderDailyTable(dateStr) {
    if (!dateStr || !statsData.dailyStats[dateStr]) {
      dailyTableBody.innerHTML = `<tr><td colspan="3" class="empty-hint">${window.I18n ? window.I18n.t('noStatsData') : '暂无数据'}</td></tr>`;
      return;
    }

    const dayObj = statsData.dailyStats[dateStr];
    const keywords = dayObj.keywords || {};
    const entries = Object.entries(keywords).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      dailyTableBody.innerHTML = `<tr><td colspan="3" class="empty-hint">${window.I18n ? window.I18n.t('noStatsData') : '暂无数据'}</td></tr>`;
      return;
    }

    const dayTotal = dayObj.total || 1;
    let rowsHtml = '';
    entries.forEach(([word, count]) => {
      const share = ((count / dayTotal) * 100).toFixed(1) + '%';
      rowsHtml += `
        <tr>
          <td><strong>${escapeHtml(word)}</strong></td>
          <td>${count}</td>
          <td>${share}</td>
        </tr>
      `;
    });

    dailyTableBody.innerHTML = rowsHtml;
  }

  /**
   * 渲染全部组件
   */
  function renderAll() {
    renderOverview();
    renderTrendChart();
    renderRanking();
    renderDailySection();
  }

  /**
   * 导出统计数据报表
   */
  exportBtn.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    const exportPayload = {
      exportTime: new Date().toISOString(),
      summary: {
        totalBlocked: statsData.totalBlocked,
        activeKeywordsCount: activeKeywordsList.length
      },
      keywordTotals: statsData.keywordTotals,
      dailyStats: statsData.dailyStats
    };

    const dataBlob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(dataBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `threads-filter-stats-${today}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  });

  /**
   * 清空统计数据
   */
  clearStatsBtn.addEventListener('click', () => {
    const confirmMsg = window.I18n ? window.I18n.t('confirmResetStats') : '确定将所有拦截统计重置为 0 吗？';
    if (confirm(confirmMsg)) {
      statsData = {
        totalBlocked: 0,
        dailyStats: {},
        keywordTotals: {}
      };

      const storageLocal = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
      if (storageLocal) {
        storageLocal.set({ threads_filter_stats: statsData }, () => {
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({
              threads_filter_stats_summary: { totalBlocked: 0, todayBlocked: 0, lastDate: '' }
            });
          }
          renderAll();
        });
      }
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 启动
  setupI18n();
});
