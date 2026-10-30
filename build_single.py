#!/usr/bin/env python3
"""Generate a self-contained single HTML file with all assets inlined."""

import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def read_file(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()

# Read all assets
echarts = read_file('src/echarts.min.js')
css = read_file('src/styles.css')
js = read_file('src/app.js')
data = read_file('data/changelog.json')

# Generate single HTML
html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Axolotl Launcher 变更日志可视化</title>
    <style>
{css}
    </style>
</head>
<body>
    <div id="app">
        <header>
            <div class="header-left">
                <h1>Axolotl Launcher 变更日志可视化</h1>
                <span class="subtitle" id="versionCount">加载中...</span>
            </div>
            <div class="header-right">
                <div class="control-group">
                    <label>分析视角</label>
                    <select id="perspective">
                        <option value="changes">版本改动图</option>
                        <option value="distribution">版本分布图</option>
                        <option value="speed">版本更新速度图</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>图表类型</label>
                    <select id="chartType">
                        <option value="bar">条形图</option>
                        <option value="stackedBar">堆叠图</option>
                        <option value="radar">雷达图</option>
                        <option value="line">折线图</option>
                        <option value="area">面积图</option>
                        <option value="stackedArea">堆叠面积图</option>
                        <option value="histogram">直方图</option>
                        <option value="boxplot">箱线图</option>
                        <option value="scatter">散点图</option>
                        <option value="bubble">气泡图</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>配色</label>
                    <select id="colorScheme">
                        <option value="default">默认</option>
                        <option value="warm">暖色</option>
                        <option value="cool">冷色</option>
                        <option value="dark">深色</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>字号</label>
                    <select id="fontSize">
                        <option value="12">小</option>
                        <option value="14" selected>中</option>
                        <option value="16">大</option>
                    </select>
                </div>
            </div>
        </header>
        <main>
            <div id="chart"></div>
        </main>
        <section id="changelogPanel" class="hidden">
            <div class="panel-header">
                <div class="panel-title">
                    <span id="clVersion"></span>
                    <span id="clDate" class="cl-date"></span>
                    <span id="clType" class="cl-type"></span>
                </div>
                <div class="panel-actions">
                    <a id="clUrl" target="_blank" class="cl-link">GitHub 链接</a>
                    <button id="clClose" class="cl-close">关闭</button>
                </div>
            </div>
            <div id="clBody" class="panel-body"></div>
        </section>
        <div id="hint" class="hint">点击图表中的顶点查看对应版本的更新日志</div>
    </div>
    <script>
{echarts}
    </script>
    <script>
const CHANGELOG_DATA = {data};
    </script>
    <script>
{js}
    </script>
</body>
</html>'''

# Modify app.js to use inline data instead of fetch
js_modified = js.replace(
    "const res = await fetch('data/changelog.json');\n        const data = await res.json();\n        versions = data.versions;",
    "versions = CHANGELOG_DATA.versions;"
)

html = html.replace(js, js_modified)

# Write output
out_path = os.path.join(ROOT, 'Axolotl-Changelog-Viewer.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Generated: {out_path}')
print(f'Size: {os.path.getsize(out_path) / 1024 / 1024:.1f} MB')
