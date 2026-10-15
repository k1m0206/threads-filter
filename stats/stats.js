/**
 * Threads伴侣 - 统计中心页面控制器
 */

document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
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

  let currentTheme = 'light';
  let statsData = {
    totalBlocked: 0,
    dailyStats: {},
    keywordTotals: {}
  };

  let activeKeywordsList = [];

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
    renderTrendChart();
  }

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

  function loadAllData() {
    const storageLocal = (chrome.storage && chrome.storage.local) ? chrome.storage.local : chrome.storage.sync;
    if (!storageLocal) return;

    storageLocal.get(['threads_filter_stats'], (res) => {
      if (res && res.threads_filter_stats) {
        statsData = Object.assign(statsData, res.threads_filter_stats);
      }

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

  function renderTrendChart() {
    const days = getLastNDays(14);
    const counts = days.map(d => (statsData.dailyStats[d] && statsData.dailyStats[d].total) || 0);

    const maxVal = Math.max(...counts, 10);
    const svgWidth = 760;
    const svgHeight = 150;
    const barWidth = 32;
    const gap = (svgWidth - barWidth * days.length) / (days.length + 1);

    let svgInnerHtml = '';

    days.forEach((day, index) => {
      const count = counts[index];
      const barHeight = Math.max(3, Math.round((count / maxVal) * (svgHeight - 20)));
      const x = gap + index * (barWidth + gap);
      const y = svgHeight - barHeight;

      svgInnerHtml += `
        <rect class="trend-bg-bar" x="${x}" y="0" width="${barWidth}" height="${svgHeight}">
          <title>${day}: ${count}</title>
        </rect>
      `;

      if (count > 0) {
        svgInnerHtml += `
          <rect class="trend-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}">
            <title>${day}: ${count}</title>
          </rect>
        `;
      }
    });

    trendSvg.innerHTML = svgInnerHtml;

    trendDates.innerHTML = `
      <span>${days[0]}</span>
      <span>${days[Math.floor(days.length / 2)]}</span>
      <span>${days[days.length - 1]} (${window.I18n ? window.I18n.t('dateToday') : '今天'})</span>
    `;
  }

  function renderRanking() {
    const totals = statsData.keywordTotals || {};
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      rankList.innerHTML = `<div class="empty-hint">${window.I18n ? window.I18n.t('noStatsData') : '暂无数据'}</div>`;
      return;
    }

    const topEntries = entries.slice(0, 100);
    const highest = topEntries[0][1] || 1;

    let html = '';
    topEntries.forEach(([word, count], idx) => {
      const percent = Math.min(100, Math.round((count / highest) * 100));
      html += `
        <div class="rank-item">
          <div class="rank-meta">
            <span class="rank-word">#${idx + 1} ${escapeHtml(word)}</span>
            <span class="rank-count">${count}</span>
          </div>
          <div class="rank-progress-bg">
            <div class="rank-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    });

    rankList.innerHTML = html;
  }

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
      opt.textContent = `${d} (${count})`;
      dateSelect.appendChild(opt);
    });

    const selectedDate = dates[0];
    dateSelect.value = selectedDate;
    renderDailyTable(selectedDate);

    dateSelect.onchange = () => {
      renderDailyTable(dateSelect.value);
    };
  }

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

  function renderAll() {
    renderOverview();
    renderTrendChart();
    renderRanking();
    renderDailySection();
  }

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

  clearStatsBtn.addEventListener('click', () => {
    const confirmMsg = window.I18n ? window.I18n.t('confirmResetStats') : '确定清空所有统计数据吗？';
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

  themeToggleBtn.addEventListener('click', toggleTheme);

  initTheme();
  setupI18n();
});
