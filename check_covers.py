#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
표지 점검: 어느 교재의 표지가 빠졌고, 컴퓨터에 있는 교재 PDF 는 어떤 이름인지 보여 준다.

  python check_covers.py                      (C: 드라이브 사용자 폴더와 바탕화면을 뒤진다)
  python check_covers.py D:\ E:\교재           (다른 곳도 함께 뒤진다)
"""
import json, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
site = json.load(open(os.path.join(HERE, 'site.json'), encoding='utf-8'))

print('=== 1. 교재별 표지 장수 (20장이 정상) ===')
missing = []
for b in site['books']:
    d = os.path.join(HERE, 'covers', b['id'])
    n = len(glob.glob(os.path.join(d, '*.jpg'))) if os.path.isdir(d) else 0
    mark = '' if n == 20 else '   ← 부족'
    print(f'{n:3d}  {b["id"]}{mark}')
    if n < 20:
        missing.append(b)

print()
print('=== 2. 빠진 교재가 아카이브에 올라간 파일명 (예시 1개씩) ===')
known = set()
for bid, names in site['files'].items():
    known.update(n.lower() for n in names)
for b in missing:
    names = site['files'].get(b['id'], [])
    print(f'{b["id"]}:  {names[0] if names else "(파일 목록 없음)"}')

roots = sys.argv[1:] or [os.path.expanduser('~'), os.path.join(os.path.expanduser('~'), 'Desktop')]
print()
print('=== 3. 컴퓨터에서 찾은 EPIC21 관련 PDF 중 site.json 과 이름이 다른 것 ===')
print('   (뒤진 곳: ' + ', '.join(roots) + ')')
seen = set()
shown = 0
for root in roots:
    for p in glob.glob(os.path.join(root, '**', '*.pdf'), recursive=True):
        name = os.path.basename(p)
        nl = name.lower()
        if not any(k in nl for k in ('epic21', 'topik', 'korean', '한국어', 'grammar')):
            continue
        if nl in known or nl in seen:
            continue
        seen.add(nl)
        print('  ', p)
        shown += 1
        if shown >= 80:
            print('   ... (80개까지만 표시)')
            break
    if shown >= 80:
        break
if shown == 0:
    print('   (없음 — 나머지 PDF 는 다른 드라이브나 외장 디스크에 있을 가능성이 큽니다)')
