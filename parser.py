#!/usr/bin/env python3
"""Parse the changelog Markdown into structured JSON."""

import re
import json
from datetime import datetime, timezone, timedelta

def parse_md(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    versions = []
    lines = content.split('\n')

    current = None
    section = None  # 'entries' or 'supplement'

    for line in lines:
        # Version header
        m = re.match(r'^## (v[\d.]+(?:-[a-z0-9.\-]+)?)$', line)
        if m:
            if current:
                versions.append(current)
            current = {
                'tag': m.group(1),
                'entries': [],
                'supplement_entries': [],
                'sections': {}
            }
            section = None
            continue

        if not current:
            continue

        # Metadata
        if '发布日期时间' in line:
            m = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
            if m:
                current['datetime'] = m.group(1)
                current['date'] = m.group(1)[:10]

        if '类型' in line and '：' in line and 'pre-release' not in line:
            val = line.split('：')[-1].strip()
            if val in ('正式版', '预发布'):
                current['type'] = val

        if '发布者' in line and '：' in line:
            current['publisher'] = line.split('：')[-1].strip()

        if '变更日志' in line and line.startswith('###'):
            section = 'entries'
            continue

        if '补充提交记录' in line and line.startswith('###'):
            section = 'supplement'
            continue

        # Sub-section headers (新增/变更/Bug 修复 etc.)
        m = re.match(r'^### (.+)$', line)
        if m and section == 'entries':
            sec_name = m.group(1).strip()
            current['sections'][sec_name] = []
            current['_current_section'] = sec_name
            continue

        # Bullet points
        if line.startswith('- ') and section == 'entries':
            entry = line[2:].strip()
            if entry and not entry.startswith('**') and not entry.startswith('`'):
                sec = current.get('_current_section', '其他')
                current['sections'].setdefault(sec, [])
                current['sections'][sec].append(entry)
                current['entries'].append(entry)

        if line.startswith('- ') and section == 'supplement':
            entry = line[2:].strip()
            if entry:
                current['supplement_entries'].append(entry)

    if current:
        versions.append(current)

    # Derived fields
    SH = timezone(timedelta(hours=8))
    for i, v in enumerate(versions):
        v['bullet_count'] = len(v['entries'])
        v['supplement_count'] = len(v['supplement_entries'])
        v['total_entries'] = v['bullet_count'] + v['supplement_count']

        if 'datetime' in v:
            dt = datetime.strptime(v['datetime'], '%Y-%m-%d %H:%M:%S')
            v['timestamp'] = int(dt.timestamp())

        # Days since previous version
        if i > 0 and 'timestamp' in v and 'timestamp' in versions[i-1]:
            v['days_since_prev'] = round((v['timestamp'] - versions[i-1]['timestamp']) / 86400, 1)
        else:
            v['days_since_prev'] = 0

        # URL
        v['url'] = f"https://github.com/Axolotl-Launcher/Axolotl/releases/tag/{v['tag']}"

        # Clean up
        v.pop('_current_section', None)

    return versions

if __name__ == '__main__':
    import os
    md_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'changelog.md')
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'changelog.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    versions = parse_md(md_path)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({'versions': versions}, f, ensure_ascii=False, indent=2)
    print(f'Parsed {len(versions)} versions -> {out_path}')

    # Summary
    for v in versions[:3]:
        print(f"  {v['tag']}: {v['total_entries']} entries ({v['type']})")
    print(f"  ...")
    for v in versions[-3:]:
        print(f"  {v['tag']}: {v['total_entries']} entries ({v['type']})")
