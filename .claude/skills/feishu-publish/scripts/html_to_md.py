#!/usr/bin/env python3
"""
html_to_md.py — 将旅行攻略 HTML 转换为 Markdown
专门处理 my-travel 项目的自定义 CSS 组件，输出到 stdout

用法：python3 html_to_md.py <html_path>
"""

import sys
import re
from bs4 import BeautifulSoup

def get_text(el, sep=' '):
    return el.get_text(separator=sep, strip=True) if el else ''

def process(el, lines):
    if not el or not el.name:
        return
    tag = el.name
    cls = el.get('class', [])

    # 跳过非内容标签
    if tag in ['style', 'script', 'head']:
        return

    # Hero 区域
    if 'hero' in cls:
        h1 = el.find('h1')
        if h1:
            lines.append(f'# {get_text(h1)}\n')
        sub = el.find(class_='subtitle')
        if sub:
            lines.append(f'**{get_text(sub)}**\n')
        meta = el.find(class_='meta')
        if meta:
            for span in meta.find_all('span'):
                lines.append(f'- {get_text(span)}')
            lines.append('')
        return

    # Day 卡片（每日行程）
    if 'day' in cls:
        header = el.find(class_='day-header')
        if header:
            title = get_text(header.find(class_='day-title'))
            date = get_text(header.find(class_='day-date'))
            lines.append(f'\n## {title}　{date}\n')

        for tb in el.find_all(class_='time-block', recursive=True):
            time_txt = get_text(tb.find(class_='time'))
            act_el = tb.find(class_='activity')
            act_txt = get_text(act_el) if act_el else get_text(tb)
            if time_txt:
                lines.append(f'**{time_txt}** {act_txt}')
            else:
                lines.append(act_txt)

        for callout in el.find_all(class_=['tip', 'warn', 'info'], recursive=True):
            # 避免重复处理已处理过的子元素
            if callout.parent and 'time-block' not in (callout.parent.get('class') or []):
                lines.append(f'> {get_text(callout, " ")}')

        lines.append('')
        return

    # Transport 交通卡片
    if 'transport-item' in cls:
        icon_el = el.find(class_='transport-icon')
        icon = get_text(icon_el).replace('\n', ' ').strip() if icon_el else ''
        route = get_text(el.find(class_='route'))
        sched = get_text(el.find(class_='schedule'))
        meta = get_text(el.find(class_='meta-line'))
        why = get_text(el.find(class_='why'), ' ')

        lines.append(f'\n### {icon} {route}')
        if sched:
            lines.append(sched)
        if meta:
            lines.append(f'*{meta}*')
        if why:
            lines.append(f'> {why}')
        lines.append('')
        return

    # Place card（酒店/餐厅推荐）
    if 'place-card' in cls:
        name = get_text(el.find(class_='name'))
        price = get_text(el.find(class_='price'))
        desc = get_text(el.find(class_='desc'), ' ')
        lines.append(f'**{name}**' + (f'　{price}' if price else ''))
        if desc:
            lines.append(desc)
        lines.append('')
        return

    # Email/code block
    if 'email-block' in cls:
        lines.append('```')
        lines.append(el.get_text(strip=True))
        lines.append('```')
        lines.append('')
        return

    # Callout 标注框
    if any(c in cls for c in ['tip', 'warn', 'info']):
        lines.append(f'> {get_text(el, " ")}\n')
        return

    # 标题
    if tag == 'h2':
        lines.append(f'\n## {get_text(el)}\n')
        return
    if tag == 'h3':
        lines.append(f'\n### {get_text(el)}\n')
        return
    if tag == 'h4':
        lines.append(f'\n#### {get_text(el)}\n')
        return

    # 表格
    if tag == 'table':
        rows = el.find_all('tr')
        for i, row in enumerate(rows):
            cells = row.find_all(['th', 'td'])
            line = '| ' + ' | '.join(get_text(c, ' ') for c in cells) + ' |'
            lines.append(line)
            if i == 0:
                lines.append('| ' + ' | '.join(['---'] * len(cells)) + ' |')
        lines.append('')
        return

    # Steps 有序步骤列表
    if 'steps' in cls:
        for i, li in enumerate(el.find_all('li', recursive=False), 1):
            lines.append(f'{i}. {get_text(li, " ")}')
        lines.append('')
        return

    # Checklist 待办清单
    if 'checklist' in cls:
        for li in el.find_all('li', recursive=False):
            lines.append(f'- [ ] {get_text(li, " ")}')
        lines.append('')
        return

    # 普通列表
    if tag == 'ul':
        for li in el.find_all('li', recursive=False):
            lines.append(f'- {get_text(li, " ")}')
        lines.append('')
        return
    if tag == 'ol':
        for i, li in enumerate(el.find_all('li', recursive=False), 1):
            lines.append(f'{i}. {get_text(li, " ")}')
        lines.append('')
        return

    # 段落
    if tag == 'p':
        txt = get_text(el, ' ')
        if txt:
            lines.append(txt + '\n')
        return

    # Footer
    if tag == 'footer':
        lines.append(f'\n---\n{get_text(el)}\n')
        return

    # 容器（递归处理子元素）
    if tag in ['section', 'div', 'body', 'main', 'article']:
        for child in el.children:
            if hasattr(child, 'name') and child.name:
                process(child, lines)
        return


def convert(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')
    lines = []
    process(soup.body, lines)

    result = '\n'.join(lines)
    # 清理超过 3 个连续空行
    result = re.sub(r'\n{4,}', '\n\n\n', result)
    # 清理携程深链接
    result = re.sub(r'\[([^\]]+)\]\(<superlink://[^)]+>\)', r'\1', result)
    result = re.sub(r'\[([^\]]+)\]\(superlink://[^)]+\)', r'\1', result)
    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法：python3 html_to_md.py <html_path>', file=sys.stderr)
        sys.exit(1)
    print(convert(sys.argv[1]))
