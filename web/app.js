/* ============================================================
 * Axolotl Launcher 变更日志可视化 - 核心逻辑
 * ============================================================ */

// ===== Global State =====
let chart = null;
let versions = [];
let currentPerspective = 'changes';
let currentChartType = 'bar';
let currentColorScheme = 'default';
let currentFontSize = 14;
let searchQuery = '';
let typeFilter = 'all';
let sortOrder = 'time-desc';
let isFullscreen = false;
let isTableView = false;
let systemDark = false;

// ===== Color Schemes =====
const COLOR_SCHEMES = {
    default: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'],
    warm:    ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#f43f5e', '#fb7185', '#fda4af', '#fdba74', '#fcd34d', '#fbbf24'],
    cool:    ['#06b6d4', '#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#6366f1', '#a78bfa', '#22d3ee', '#60a5fa', '#2dd4bf'],
    dark:    ['#818cf8', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#818cf8'],
};

const SECTION_COLORS = {
    '新增': 0, '变更': 1, 'Bug 修复': 2, '安全修复': 3, '其他': 4,
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    chart = echarts.init(document.getElementById('chart'));
    readURL();
    loadData();
    bindControls();
    bindPanel();
});

// ===== Data Loading =====
async function loadData() {
    try {
        const res = await fetch('/api/changelog');
        if (!res.ok) {
            // Fallback to local file
            const res2 = await fetch('changelog.json');
            const data2 = await res2.json();
            versions = data2.versions;
            renderStats();
            document.getElementById('versionCount').textContent =
                `${versions.length} 个版本 · ${versions[0].date} ~ ${versions[versions.length-1].date}`;
            render();
            return;
        }
        const data = await res.json();
        versions = data.versions;
        renderStats();
        document.getElementById('versionCount').textContent =
            `${versions.length} 个版本 · ${versions[0].date} ~ ${versions[versions.length-1].date}`;
        render();
    } catch (e) {
        document.getElementById('chart').innerHTML =
            `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">数据加载失败: ${e.message}</div>`;
    }
}

// ===== Controls =====
function bindControls() {
    document.getElementById('perspective').addEventListener('change', (e) => {
        currentPerspective = e.target.value;
        render();
    });
    document.getElementById('chartType').addEventListener('change', (e) => {
        currentChartType = e.target.value;
        render();
    });
    document.getElementById('colorScheme').addEventListener('change', (e) => {
        currentColorScheme = e.target.value;
        applyDarkMode();
        render();
    });
    document.getElementById('fontSize').addEventListener('change', (e) => {
        currentFontSize = parseInt(e.target.value);
        render();
    });
    // Search
    document.getElementById('searchBox').addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        saveSearchHistory(searchQuery);
        updateURL();
        render();
    });
    // Export PNG
    document.getElementById('btnExport').addEventListener('click', () => {
        if (!chart) return;
        const url = chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: currentColorScheme === 'dark' ? '#1a1a2e' : '#ffffff'
        });
        const a = document.createElement('a');
        a.href = url;
        a.download = `axolotl-changelog-${currentPerspective}-${currentChartType}.png`;
        a.click();
    });
    // Export JSON
    document.getElementById('btnExportJson').addEventListener('click', () => {
        const filtered = versions.filter(v => {
            if (typeFilter !== 'all') {
                const vt = v.type || '正式版';
                if (vt !== typeFilter && vt !== typeFilter.replace('版', '')) return false;
            }
            if (searchQuery && !v.tag.toLowerCase().includes(searchQuery)) return false;
            return true;
        });
        const blob = new Blob([JSON.stringify({ versions: filtered }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'axolotl-changelog.json';
        a.click();
        showToast(`已导出 ${filtered.length} 个版本`);
    });
    // Export CSV
    document.getElementById('btnExportCsv').addEventListener('click', () => {
        const filtered = versions.filter(v => {
            if (typeFilter !== 'all') {
                const vt = v.type || '正式版';
                if (vt !== typeFilter && vt !== typeFilter.replace('版', '')) return false;
            }
            if (searchQuery && !v.tag.toLowerCase().includes(searchQuery)) return false;
            return true;
        });
        const header = '版本,日期时间,类型,发布者,条目数,补充提交\n';
        const rows = filtered.map(v =>
            `${v.tag},${v.datetime || v.date || ''},${v.type || '正式版'},${v.publisher || ''},${v.total_entries || 0},${v.supplement_count || 0}`
        ).join('\n');
        const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'axolotl-changelog.csv';
        a.click();
        showToast(`已导出 ${filtered.length} 个版本`);
    });
    // Fullscreen
    document.getElementById('btnFullscreen').addEventListener('click', () => {
        isFullscreen = !isFullscreen;
        document.getElementById('chart').classList.toggle('fullscreen', isFullscreen);
        document.getElementById('btnFullscreen').classList.toggle('active', isFullscreen);
        setTimeout(() => chart && chart.resize(), 100);
    });
    // Table view
    document.getElementById('btnTable').addEventListener('click', () => {
        isTableView = !isTableView;
        document.getElementById('tableView').classList.toggle('hidden', !isTableView);
        document.getElementById('chart').style.display = isTableView ? 'none' : '';
        document.getElementById('timelineView').classList.add('hidden');
        document.getElementById('btnTable').classList.toggle('active', isTableView);
        if (isTableView) renderTable();
    });
    // Type filter
    document.getElementById('typeFilter').addEventListener('change', (e) => {
        typeFilter = e.target.value;
        render();
    });
    // Sort order
    document.getElementById('sortOrder').addEventListener('change', (e) => {
        sortOrder = e.target.value;
        render();
    });
    // Share link
    document.getElementById('btnShare').addEventListener('click', () => shareLink());
    // Compare panel
    document.getElementById('compareClose').addEventListener('click', () => {
        document.getElementById('comparePanel').classList.add('hidden');
    });
    document.getElementById('compareClear').addEventListener('click', () => {
        compareVersions = [];
        document.getElementById('comparePanel').classList.add('hidden');
        showToast('已清空对比');
    });
}

function applyDarkMode() {
    const dark = currentColorScheme === 'dark' ||
        (currentColorScheme === 'auto' && systemDark);
    document.body.classList.toggle('dark', dark);
}

// Detect system dark mode preference
if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark = mq.matches;
    mq.addEventListener('change', (e) => {
        systemDark = e.matches;
        if (currentColorScheme === 'auto') {
            applyDarkMode();
            render();
        }
    });
}

// ===== Table View =====
function renderTable() {
    const tbody = document.querySelector('#dataTable tbody');
    let html = '';
    for (const v of versions) {
        if (typeFilter !== 'all') {
            const vt = v.type || '正式版';
            if (vt !== typeFilter && vt !== typeFilter.replace('版', '')) continue;
        }
        if (searchQuery && !v.tag.toLowerCase().includes(searchQuery)) continue;
        html += `<tr>
            <td class="tag-cell" data-tag="${v.tag}">${v.tag}</td>
            <td>${v.datetime || v.date || ''}</td>
            <td>${v.type || '正式版'}</td>
            <td>${v.publisher || ''}</td>
            <td>${v.total_entries || 0}</td>
            <td>${v.supplement_count || 0}</td>
        </tr>`;
    }
    tbody.innerHTML = html;
    tbody.querySelectorAll('.tag-cell').forEach(td => {
        td.addEventListener('click', () => {
            const tag = td.getAttribute('data-tag');
            const v = versions.find(v => v.tag === tag);
            if (v) showChangelog(v);
        });
    });
}

// ===== Panel =====
function bindPanel() {
    document.getElementById('clClose').addEventListener('click', () => {
        document.getElementById('changelogPanel').classList.add('hidden');
    });
    const hint = document.getElementById('hint');
    setTimeout(() => hint.classList.add('fade'), 6000);
}

function showChangelog(version) {
    const panel = document.getElementById('changelogPanel');
    panel.classList.remove('hidden');

    document.getElementById('clVersion').textContent = version.tag;
    document.getElementById('clDate').textContent = version.datetime || version.date;
    document.getElementById('clType').textContent = version.type || '正式版';
    document.getElementById('clUrl').href = version.url;
    document.getElementById('clCompare').onclick = () => addToCompare(version);

    const body = document.getElementById('clBody');
    let html = '';

    // Group entries by section
    const sections = version.sections || {};
    const sectionOrder = ['新增', '变更', 'Bug 修复', '安全修复', '其他'];
    for (const sec of sectionOrder) {
        if (sections[sec] && sections[sec].length) {
            html += `<div class="cl-section"><div class="cl-section-title">${sec}</div>`;
            for (const entry of sections[sec]) {
                html += `<div class="cl-entry">${escapeHtml(entry)}</div>`;
            }
            html += `</div>`;
        }
    }
    // Any other sections not in the standard order
    for (const [sec, entries] of Object.entries(sections)) {
        if (!sectionOrder.includes(sec) && entries.length) {
            html += `<div class="cl-section"><div class="cl-section-title">${sec}</div>`;
            for (const entry of entries) {
                html += `<div class="cl-entry">${escapeHtml(entry)}</div>`;
            }
            html += `</div>`;
        }
    }

    // Supplement entries
    if (version.supplement_entries && version.supplement_entries.length) {
        html += `<div class="cl-supplement"><div class="cl-section-title">补充提交记录 (${version.supplement_entries.length} 条)</div>`;
        for (const entry of version.supplement_entries) {
            html += `<div class="cl-entry">${escapeHtml(entry)}</div>`;
        }
        html += `</div>`;
    }

    // Fallback: if no sections, show raw entries
    if (!html && version.entries && version.entries.length) {
        html += `<div class="cl-section"><div class="cl-section-title">更新日志</div>`;
        for (const entry of version.entries) {
            html += `<div class="cl-entry">${escapeHtml(entry)}</div>`;
        }
        html += `</div>`;
    }

    if (!html) {
        html = '<div style="color:#999;padding:20px;">该版本无详细更新日志。</div>';
    }

    body.innerHTML = html;
    makeExpandable(body);
    panel.scrollTop = 0;
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ===== Data Preparation =====
function getColors() {
    return COLOR_SCHEMES[currentColorScheme];
}

function getFontSize() {
    return currentFontSize;
}

function getTextColor() {
    return currentColorScheme === 'dark' ? '#e0e0e0' : '#1a1a2e';
}

function getAxisColor() {
    return currentColorScheme === 'dark' ? '#9ca3af' : '#6b7280';
}

function getSplitLineColor() {
    return currentColorScheme === 'dark' ? '#2a2a4a' : '#e0e3eb';
}

/**
 * Prepare data based on analysis perspective
 * Returns { categories, series, vertexMap }
 * vertexMap: index -> version object (for click handling)
 */
function prepareData() {
    if (currentPerspective === 'changes') return prepareChangesData();
    if (currentPerspective === 'distribution') return prepareDistributionData();
    if (currentPerspective === 'speed') return prepareSpeedData();
    if (currentPerspective === 'timeline') return prepareTimelineData();
    return prepareChangesData();
}

// Timeline view: chronological version list
function prepareTimelineData() {
    const sorted = sortVersions(versions);
    return { sorted, vertexMap: {}, categories: sorted.map(v => shortTag(v.tag)) };
}

// 版本改动图: entry counts per version
function sortVersions(arr) {
    const filtered = arr.filter(v => {
        if (typeFilter !== 'all') {
            const vt = v.type || '正式版';
            if (vt !== typeFilter && vt !== typeFilter.replace('版', '')) return false;
        }
        if (searchQuery && !v.tag.toLowerCase().includes(searchQuery)) return false;
        return true;
    });
    switch (sortOrder) {
        case 'time-asc':
            return [...filtered].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        case 'time-desc':
            return [...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        case 'entries-desc':
            return [...filtered].sort((a, b) => (b.total_entries || 0) - (a.total_entries || 0));
        case 'entries-asc':
            return [...filtered].sort((a, b) => (a.total_entries || 0) - (b.total_entries || 0));
        case 'speed-desc':
            return [...filtered].sort((a, b) => (b.days_since_prev || 0) - (a.days_since_prev || 0));
        default:
            return [...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
}

// 版本改动图: entry counts per version
function prepareChangesData() {
    const sorted = sortVersions(versions);
    const categories = sorted.map(v => shortTag(v.tag));
    const vertexMap = {};
    sorted.forEach((v, i) => { vertexMap[i] = v; });

    // For stacked charts: break down by section
    const sectionNames = ['新增', '变更', 'Bug 修复', '安全修复', '其他', '补充提交'];
    const series = sectionNames.map((sec, idx) => ({
        name: sec,
        type: 'bar',
        data: sorted.map(v => {
            if (sec === '补充提交') return v.supplement_count || 0;
            const entries = (v.sections && v.sections[sec]) ? v.sections[sec].length : 0;
            return entries;
        }),
        itemStyle: { color: getColors()[idx % getColors().length] },
    }));

    // For non-stacked: total entry count
    const totalSeries = [{
        name: '变更条目数',
        type: 'bar',
        data: sorted.map(v => v.total_entries),
        itemStyle: { color: getColors()[0] },
    }];

    return { categories, sorted, vertexMap, sectionNames, series, totalSeries };
}

// 版本分布图: version count by type
function prepareDistributionData() {
    const types = ['正式版', '预发布'];
    const categories = types;
    const vertexMap = {};

    // Group versions by type
    const typeGroups = {};
    types.forEach(t => { typeGroups[t] = []; });
    versions.forEach(v => {
        const t = v.type || '正式版';
        if (typeGroups[t]) typeGroups[t].push(v);
    });

    // For stacked: by major version
    const majorVersions = [...new Set(versions.map(v => {
        const m = v.tag.match(/^v(\d+)\./);
        return m ? m[1] : '其他';
    }))].sort();

    const series = majorVersions.map((mv, idx) => ({
        name: `v${mv}.x`,
        type: 'bar',
        data: types.map(t => typeGroups[t].filter(v => {
            const m = v.tag.match(/^v(\d+)\./);
            return m && m[1] === mv;
        }).length),
        itemStyle: { color: getColors()[idx % getColors().length] },
    }));

    const totalSeries = [{
        name: '版本数',
        type: 'bar',
        data: types.map(t => typeGroups[t].length),
        itemStyle: { color: getColors()[0] },
    }];

    // Store grouped versions for click
    let idx = 0;
    for (const t of types) {
        for (const v of typeGroups[t]) {
            vertexMap[idx] = v;
            idx++;
        }
    }

    return { categories, sorted: versions, vertexMap, series, totalSeries, typeGroups };
}

// 版本更新速度图: days between versions
function prepareSpeedData() {
    const sorted = sortVersions(versions);
    const categories = sorted.map(v => shortTag(v.tag));
    const vertexMap = {};
    sorted.forEach((v, i) => { vertexMap[i] = v; });

    const series = [{
        name: '距上一版本天数',
        type: 'bar',
        data: sorted.map(v => v.days_since_prev || 0),
        itemStyle: { color: getColors()[0] },
    }];

    return { categories, sorted, vertexMap, series, totalSeries: series };
}

function shortTag(tag) {
    // v1.10.3 -> 1.10.3, v1.10.0-beta.5 -> 1.10.0b5
    return tag.replace(/^v/, '').replace(/-beta\./, 'b').replace(/-alpha\./, 'a');
}

// ===== Chart Rendering =====
function render() {
    if (!chart || !versions.length) return;

    const data = prepareData();

    // Timeline perspective uses HTML, not ECharts
    if (currentPerspective === 'timeline') {
        document.getElementById('chart').style.display = 'none';
        document.getElementById('timelineView').classList.remove('hidden');
        document.getElementById('tableView').classList.add('hidden');
        renderTimeline(data);
        updateURL();
        return;
    }

    document.getElementById('chart').style.display = '';
    document.getElementById('timelineView').classList.add('hidden');
    document.getElementById('tableView').classList.add('hidden');

    let option;
    switch (currentChartType) {
        case 'bar': option = renderBar(data); break;
        case 'stackedBar': option = renderStackedBar(data); break;
        case 'radar': option = renderRadar(data); break;
        case 'line': option = renderLine(data); break;
        case 'area': option = renderArea(data); break;
        case 'stackedArea': option = renderStackedArea(data); break;
        case 'histogram': option = renderHistogram(data); break;
        case 'boxplot': option = renderBoxplot(data); break;
        case 'scatter': option = renderScatter(data); break;
        case 'bubble': option = renderBubble(data); break;
        default: option = renderBar(data);
    }

    chart.setOption(option, true);
    bindChartClick(data);
    updateURL();
}

function baseGrid() {
    return {
        left: '8%', right: '5%', top: '12%', bottom: '15%',
        containLabel: true,
    };
}

function baseTooltip() {
    return {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontSize: getFontSize() },
    };
}

function baseLegend() {
    return {
        top: 5,
        textStyle: { fontSize: getFontSize() - 1, color: getTextColor() },
    };
}

function baseAxisLabel() {
    return {
        fontSize: getFontSize() - 1,
        color: getAxisColor(),
        rotate: currentPerspective === 'changes' || currentPerspective === 'speed' ? 45 : 0,
        interval: 0,
    };
}

function baseDataZoom(data) {
    if ((currentPerspective === 'changes' || currentPerspective === 'speed') && data.categories.length > 20) {
        return [
            { type: 'slider', show: true, bottom: 8, height: 18, start: 0, end: 100 },
            { type: 'inside', start: 0, end: 100 },
        ];
    }
    return [];
}

// ===== Bar Chart =====
function renderBar(data) {
    const fs = getFontSize();
    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: baseTooltip(),
        legend: data.series.length > 1 ? baseLegend() : { show: false },
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: baseAxisLabel(),
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        dataZoom: baseDataZoom(data),
        series: data.totalSeries,
    };
}

// ===== Stacked Bar =====
function renderStackedBar(data) {
    const fs = getFontSize();
    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: baseTooltip(),
        legend: baseLegend(),
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: baseAxisLabel(),
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        dataZoom: baseDataZoom(data),
        series: data.series.map(s => ({ ...s, stack: 'total' })),
    };
}

// ===== Radar =====
function renderRadar(data) {
    const fs = getFontSize();
    const colors = getColors();

    if (currentPerspective === 'distribution') {
        const indicators = data.categories.map(c => ({ name: c, max: Math.max(...data.totalSeries[0].data) + 2 }));
        return {
            backgroundColor: 'transparent',
            textStyle: { fontSize: fs, color: getTextColor() },
            tooltip: { trigger: 'item' },
            legend: baseLegend(),
            radar: {
                indicator: indicators,
                axisName: { fontSize: fs, color: getTextColor() },
                splitLine: { lineStyle: { color: getSplitLineColor() } },
                splitArea: { areaStyle: { color: currentColorScheme === 'dark' ? ['#1e1b4b', '#16213e'] : ['#f9fafb', '#fff'] } },
                axisLine: { lineStyle: { color: getSplitLineColor() } },
            },
            series: [{
                type: 'radar',
                data: [{
                    value: data.totalSeries[0].data,
                    name: '版本数',
                    itemStyle: { color: colors[0] },
                    areaStyle: { color: colors[0], opacity: 0.3 },
                }],
            }],
        };
    }

    // For changes/speed: show top versions by metric
    const sorted = [...data.sorted].sort((a, b) => {
        const metric = currentPerspective === 'speed' ? (b.days_since_prev || 0) : (b.total_entries || 0);
        const aMetric = currentPerspective === 'speed' ? (a.days_since_prev || 0) : (a.total_entries || 0);
        return metric - aMetric;
    }).slice(0, 10);

    const indicators = sorted.map(v => ({ name: shortTag(v.tag), max: 0 }));
    const maxVal = Math.max(...sorted.map(v => currentPerspective === 'speed' ? (v.days_since_prev || 0) : (v.total_entries || 0))) || 1;
    indicators.forEach(i => { i.max = maxVal + 2; });

    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        tooltip: { trigger: 'item' },
        legend: { show: false },
        radar: {
            indicator: indicators,
            axisName: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
            splitArea: { areaStyle: { color: currentColorScheme === 'dark' ? ['#1e1b4b', '#16213e'] : ['#f9fafb', '#fff'] } },
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        series: [{
            type: 'radar',
            data: [{
                value: sorted.map(v => currentPerspective === 'speed' ? (v.days_since_prev || 0) : (v.total_entries || 0)),
                name: currentPerspective === 'speed' ? '距上一版本天数' : '变更条目数',
                itemStyle: { color: colors[0] },
                areaStyle: { color: colors[0], opacity: 0.3 },
            }],
        }],
    };
}

// ===== Line =====
function renderLine(data) {
    const fs = getFontSize();
    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: baseTooltip(),
        legend: data.series.length > 1 ? baseLegend() : { show: false },
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: baseAxisLabel(),
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        dataZoom: baseDataZoom(data),
        series: data.series.map(s => ({ ...s, type: 'line', smooth: true, symbol: 'circle', symbolSize: 6 })),
    };
}

// ===== Area =====
function renderArea(data) {
    const fs = getFontSize();
    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: baseTooltip(),
        legend: data.series.length > 1 ? baseLegend() : { show: false },
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: baseAxisLabel(),
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        dataZoom: baseDataZoom(data),
        series: data.series.map((s, i) => ({
            ...s,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            areaStyle: { color: getColors()[i % getColors().length], opacity: 0.3 },
        })),
    };
}

// ===== Stacked Area =====
function renderStackedArea(data) {
    const fs = getFontSize();
    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: baseTooltip(),
        legend: baseLegend(),
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: baseAxisLabel(),
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        dataZoom: baseDataZoom(data),
        series: data.series.map((s, i) => ({
            ...s,
            type: 'line',
            stack: 'total',
            smooth: true,
            symbol: 'circle',
            symbolSize: 5,
            areaStyle: { color: getColors()[i % getColors().length], opacity: 0.5 },
        })),
    };
}

// ===== Histogram =====
function renderHistogram(data) {
    const fs = getFontSize();
    const colors = getColors();
    const values = currentPerspective === 'speed'
        ? data.sorted.map(v => v.days_since_prev || 0)
        : data.sorted.map(v => v.total_entries);

    // Bin values
    const maxVal = Math.max(...values) || 1;
    const binSize = Math.max(5, Math.ceil(maxVal / 10));
    const bins = [];
    for (let i = 0; i <= maxVal; i += binSize) {
        bins.push(`${i}-${i + binSize - 1}`);
    }
    const binData = bins.map((b, i) => {
        const [lo, hi] = b.split('-').map(Number);
        return values.filter(v => v >= lo && v <= hi).length;
    });

    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { show: false },
        xAxis: {
            type: 'category',
            data: bins,
            axisLabel: { fontSize: fs - 1, color: getAxisColor(), rotate: 30 },
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        series: [{
            type: 'bar',
            data: binData,
            itemStyle: {
                color: colors[0],
                borderRadius: [4, 4, 0, 0],
            },
        }],
    };
}

// ===== Box Plot =====
function renderBoxplot(data) {
    const fs = getFontSize();
    const colors = getColors();

    // Group by type for box plot
    const types = ['正式版', '预发布'];
    const groups = types.map(t => {
        const vals = data.sorted
            .filter(v => (v.type || '正式版') === t)
            .map(v => currentPerspective === 'speed' ? (v.days_since_prev || 0) : (v.total_entries || 0))
            .filter(v => v > 0);
        if (!vals.length) return [0, 0, 0, 0, 0];
        const sorted = [...vals].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
        const median = sorted[Math.floor(sorted.length * 0.5)] || 0;
        const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
        return [sorted[0] || 0, q1, median, q3, sorted[sorted.length - 1] || 0];
    });

    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: { trigger: 'item' },
        legend: { show: false },
        xAxis: {
            type: 'category',
            data: types,
            axisLabel: { fontSize: fs, color: getAxisColor() },
            axisLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        series: [{
            type: 'boxplot',
            data: groups,
            itemStyle: { color: colors[0], borderColor: colors[0] },
        }],
    };
}

// ===== Scatter =====
function renderScatter(data) {
    const fs = getFontSize();
    const colors = getColors();
    const sorted = data.sorted;

    let xData, yData;
    if (currentPerspective === 'speed') {
        xData = sorted.map(v => v.days_since_prev || 0);
        yData = sorted.map(v => v.total_entries);
    } else if (currentPerspective === 'distribution') {
        xData = sorted.map((v, i) => i);
        yData = sorted.map(v => v.total_entries);
    } else {
        // changes: x = version index, y = entry count
        xData = sorted.map((v, i) => i);
        yData = sorted.map(v => v.total_entries);
    }

    const seriesData = sorted.map((v, i) => ({
        value: [xData[i], yData[i]],
        name: v.tag,
        itemStyle: { color: colors[0], opacity: 0.7 },
    }));

    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: {
            trigger: 'item',
            formatter: (p) => `${p.data.name}<br/>X: ${p.value[0]}<br/>Y: ${p.value[1]}`,
        },
        legend: { show: false },
        xAxis: {
            type: 'value',
            name: currentPerspective === 'speed' ? '距上一版本天数' : '版本序号',
            nameTextStyle: { fontSize: fs - 1, color: getAxisColor() },
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            name: '变更条目数',
            nameTextStyle: { fontSize: fs - 1, color: getAxisColor() },
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        series: [{
            type: 'scatter',
            data: seriesData,
            symbolSize: 10,
        }],
    };
}

// ===== Bubble =====
function renderBubble(data) {
    const fs = getFontSize();
    const colors = getColors();
    const sorted = data.sorted;

    const seriesData = sorted.map((v, i) => {
        let x, y, size;
        if (currentPerspective === 'speed') {
            x = v.days_since_prev || 0;
            y = v.total_entries;
            size = (v.supplement_count || 0) * 3 + 8;
        } else {
            x = i;
            y = v.total_entries;
            size = (v.supplement_count || 0) * 3 + 8;
        }
        return {
            value: [x, y, size],
            name: v.tag,
            itemStyle: { color: colors[i % colors.length], opacity: 0.6 },
        };
    });

    return {
        backgroundColor: 'transparent',
        textStyle: { fontSize: fs, color: getTextColor() },
        grid: baseGrid(),
        tooltip: {
            trigger: 'item',
            formatter: (p) => `${p.data.name}<br/>X: ${p.value[0]}<br/>Y: ${p.value[1]}<br/>大小: ${p.value[2]}`,
        },
        legend: { show: false },
        xAxis: {
            type: 'value',
            name: currentPerspective === 'speed' ? '距上一版本天数' : '版本序号',
            nameTextStyle: { fontSize: fs - 1, color: getAxisColor() },
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        yAxis: {
            type: 'value',
            name: '变更条目数',
            nameTextStyle: { fontSize: fs - 1, color: getAxisColor() },
            axisLabel: { fontSize: fs - 1, color: getAxisColor() },
            splitLine: { lineStyle: { color: getSplitLineColor() } },
        },
        series: [{
            type: 'scatter',
            data: seriesData,
            symbolSize: (val) => val[2],
        }],
    };
}

// ===== Timeline Rendering =====
function renderTimeline(data) {
    const el = document.getElementById('timelineView');
    el.classList.remove('hidden');
    el.innerHTML = '';

    // Calculate stats for milestone detection
    const entryCounts = data.sorted.map(v => v.total_entries || 0);
    const avgEntries = entryCounts.reduce((a, b) => a + b, 0) / (entryCounts.length || 1);

    for (const v of data.sorted) {
        const isMajor = !v.tag.includes('-beta') && !v.tag.includes('-alpha');
        const isBeta = v.tag.includes('-beta') || v.tag.includes('-alpha');
        const isMilestone = isMajor && (v.total_entries || 0) > avgEntries * 1.5;
        const isHighEntry = (v.total_entries || 0) > avgEntries * 2;

        const cls = isMilestone ? 'major milestone' : (isMajor ? 'major' : (isBeta ? 'beta' : ''));
        const entries = v.entries || [];
        const summary = entries.slice(0, 2).join('；') || '（无详细描述）';

        const badges = [];
        if (isMilestone) badges.push('<span class="tl-badge tl-milestone">里程碑</span>');
        if (isHighEntry) badges.push('<span class="tl-badge tl-high">高变更</span>');

        const item = document.createElement('div');
        item.className = `timeline-item ${cls}`;
        item.innerHTML = `<div><span class="timeline-version" data-tag="${v.tag}">${v.tag}</span>${badges.join('')}<span class="timeline-date">${v.datetime || v.date || ''} · ${v.type || '正式版'}</span></div><div class="timeline-summary">${escapeHtml(summary)}${entries.length > 2 ? '…' : ''}</div>`;
        item.querySelector('.timeline-version').addEventListener('click', () => showChangelog(v));
        el.appendChild(item);
    }
}

// ===== Version Compare =====
let compareVersions = [];
function addToCompare(version) {
    if (compareVersions.find(v => v.tag === version.tag)) { showToast('该版本已在对比中'); return; }
    if (compareVersions.length >= 3) { showToast('最多对比 3 个版本'); return; }
    compareVersions.push(version);
    renderCompare();
    showToast(`已添加 ${version.tag} 到对比`);
}
function renderCompare() {
    if (!compareVersions.length) { document.getElementById('comparePanel').classList.add('hidden'); return; }
    document.getElementById('comparePanel').classList.remove('hidden');
    const body = document.getElementById('compareBody');
    const info = document.getElementById('compareInfo');
    if (compareVersions.length === 1) {
        info.textContent = `${compareVersions[0].tag} · ${compareVersions[0].datetime || compareVersions[0].date}`;
    } else {
        info.textContent = `${compareVersions[0].tag} → ${compareVersions[compareVersions.length-1].tag}（共 ${compareVersions.length} 个版本）`;
    }
    let html = '';
    for (let ci = 0; ci < compareVersions.length; ci++) {
        const v = compareVersions[ci];
        html += `<div class="compare-col"><h4>${v.tag} <span class="cl-date">${v.datetime || v.date || ''}</span></h4>`;
        const sections = v.sections || {};
        for (const sec of ['新增', '变更', 'Bug 修复', '安全修复', '其他']) {
            if (sections[sec] && sections[sec].length) {
                html += `<div class="cl-section"><div class="cl-section-title">${sec} (${sections[sec].length})</div>`;
                for (const e of sections[sec].slice(0, 10)) {
                    let diffClass = '';
                    if (compareVersions.length > 1) {
                        const existsInOthers = compareVersions.some((other, oi) => oi !== ci && (other.entries || []).includes(e));
                        if (!existsInOthers) diffClass = ' cl-entry-added';
                    }
                    html += `<div class="cl-entry${diffClass}">${escapeHtml(e)}</div>`;
                }
                if (sections[sec].length > 10) html += `<div class="cl-entry">…共 ${sections[sec].length} 条</div>`;
                html += `</div>`;
            }
        }
        if (v.supplement_count) html += `<div class="cl-section"><div class="cl-section-title">补充提交 (${v.supplement_count})</div></div>`;
        html += `</div>`;
    }
    body.innerHTML = html;
}

// ===== URL Parameter Sharing =====
function updateURL() {
    const params = new URLSearchParams();
    if (currentPerspective !== 'changes') params.set('p', currentPerspective);
    if (currentChartType !== 'bar') params.set('c', currentChartType);
    if (currentColorScheme !== 'default') params.set('theme', currentColorScheme);
    if (searchQuery) params.set('q', searchQuery);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}
function readURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('p')) currentPerspective = params.get('p');
    if (params.get('c')) currentChartType = params.get('c');
    if (params.get('theme')) currentColorScheme = params.get('theme');
    if (params.get('q')) { searchQuery = params.get('q'); document.getElementById('searchBox').value = searchQuery; }
}
function shareLink() {
    updateURL();
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => showToast('链接已复制到剪贴板')).catch(() => {
        const input = document.createElement('input');
        input.value = url; document.body.appendChild(input); input.select();
        document.execCommand('copy'); input.remove(); showToast('链接已复制');
    });
}

// ===== Search History =====
function saveSearchHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    history = history.filter(q => q !== query);
    history.unshift(query);
    history = history.slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    // Update datalist
    const dl = document.getElementById('searchHistory');
    if (dl) {
        dl.innerHTML = history.map(q => `<option value="${q}">`).join('');
    }
}

// ===== Expandable Sections =====
function makeExpandable(panelBody) {
    const headers = panelBody.querySelectorAll('.cl-section-title');
    headers.forEach(h => {
        h.classList.add('cl-section-header');
        const section = h.closest('.cl-section');
        if (section) {
            const content = section.querySelectorAll('.cl-entry');
            h.addEventListener('click', () => {
                h.classList.toggle('collapsed');
                content.forEach(c => c.classList.toggle('collapsed'));
            });
        }
    });
}

// ===== Toast =====
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== Click Handling =====
function bindChartClick(data) {
    chart.off('click');
    chart.on('click', (params) => {
        if (!params.componentType) return;

        // Find which version this click corresponds to
        let version = null;

        if (params.componentType === 'series' || params.componentType === 'xAxis') {
            if (data.vertexMap && data.vertexMap[params.dataIndex] !== undefined) {
                version = data.vertexMap[params.dataIndex];
            }
        }

        // For scatter/bubble: use dataIndex
        if (!version && params.dataIndex !== undefined && data.vertexMap) {
            version = data.vertexMap[params.dataIndex];
        }

        // For radar: find by name
        if (!version && params.name) {
            const idx = data.categories.indexOf(params.name);
            if (idx >= 0 && data.vertexMap[idx]) {
                version = data.vertexMap[idx];
            }
        }

        // For histogram/boxplot: show group info
        if (!version && currentChartType === 'histogram') {
            // Show a message about the bin
            const binLabel = params.name;
            document.getElementById('changelogPanel').classList.remove('hidden');
            document.getElementById('clVersion').textContent = '直方图区间';
            document.getElementById('clDate').textContent = binLabel;
            document.getElementById('clType').textContent = '统计';
            document.getElementById('clUrl').href = '#';
            document.getElementById('clBody').innerHTML =
                `<div style="color:#999;padding:20px;">该区间包含 ${params.value} 个版本。切换到条形图或折线图可查看各版本详情。</div>`;
            return;
        }

        if (!version && currentChartType === 'boxplot') {
            const groupLabel = params.name;
            document.getElementById('changelogPanel').classList.remove('hidden');
            document.getElementById('clVersion').textContent = '箱线图分组';
            document.getElementById('clDate').textContent = groupLabel;
            document.getElementById('clType').textContent = '统计';
            document.getElementById('clUrl').href = '#';
            const vals = data.sorted.filter(v => (v.type || '正式版') === groupLabel);
            document.getElementById('clBody').innerHTML =
                `<div style="color:#999;padding:20px;">${groupLabel} 共 ${vals.length} 个版本。切换到条形图或折线图可查看各版本详情。</div>`;
            return;
        }

        if (version) {
            showChangelog(version);
        }
    });
}

// ===== Resize =====
window.addEventListener('resize', () => {
    if (chart) chart.resize();
});

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch (e.key.toLowerCase()) {
        case 'f':
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); document.getElementById('searchBox').focus(); }
            break;
        case 't':
            document.getElementById('btnTable').click();
            break;
        case 'x':
            document.getElementById('btnFullscreen').click();
            break;
        case 'e':
            document.getElementById('btnExport').click();
            break;
        case 's':
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); shareLink(); }
            break;
        case 'escape':
            document.getElementById('changelogPanel').classList.add('hidden');
            document.getElementById('comparePanel').classList.add('hidden');
            break;
    }
});

// ===== Statistics Summary =====
function renderStats() {
    const total = versions.length;
    const formal = versions.filter(v => (v.type || '正式版') === '正式版').length;
    const beta = versions.filter(v => (v.type || '正式版').includes('预发布')).length;
    const totalEntries = versions.reduce((sum, v) => sum + (v.total_entries || 0), 0);
    const firstDate = versions[versions.length - 1]?.date || '';
    const lastDate = versions[0]?.date || '';
    const span = (versions[0]?.timestamp && versions[versions.length-1]?.timestamp)
        ? Math.round((versions[0].timestamp - versions[versions.length-1].timestamp) / 86400)
        : 0;

    const stats = document.getElementById('versionCount');
    if (stats) {
        stats.textContent = `${total} 版本 · ${formal} 正式 / ${beta} 预发布 · ${totalEntries} 条变更 · ${firstDate}~${lastDate}（${span}天）`;
    }
}
