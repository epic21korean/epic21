#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
사이트 파일만 골라서 GitHub 저장소 폴더로 복사한다.

  python copy_to_repo.py                       (Documents\GitHub\epic21 으로)
  python copy_to_repo.py "D:\다른\경로\epic21"   (다른 곳으로)

복사 대상: index.html, 언어 폴더 20개, covers, og, og.png, sitemap.xml, robots.txt, .nojekyll,
          site.json, template.html, build.py, make_covers.py, fetch_covers.py, check_covers.py,
          copy_to_repo.py, README.md
그 밖의 파일(업로드 스크립트, 썸네일 png, zip 등)은 건드리지 않는다.
"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Documents', 'GitHub', 'epic21')

if not os.path.isdir(dst):
    print('저장소 폴더를 찾지 못했습니다:', dst)
    print('GitHub Desktop 에서 Repository → Show in Explorer 로 연 폴더의 경로를 뒤에 붙여 주세요.')
    sys.exit(1)

site = json.load(open(os.path.join(HERE, 'site.json'), encoding='utf-8'))
dirs = [L['code'] for L in site['langs']] + ['covers', 'og']
files = ['index.html', 'og.png', 'sitemap.xml', 'robots.txt', '.nojekyll', 'site.json', 'template.html',
         'build.py', 'make_covers.py', 'fetch_covers.py', 'check_covers.py', 'copy_to_repo.py', 'README.md']

n = 0
for d in dirs:
    s = os.path.join(HERE, d)
    if not os.path.isdir(s):
        print('  (없음)', d)
        continue
    t = os.path.join(dst, d)
    if os.path.isdir(t):
        shutil.rmtree(t)
    shutil.copytree(s, t)
    c = sum(len(f) for _, _, f in os.walk(t))
    n += c
    print(f'  {d}/  {c}개')
for f in files:
    s = os.path.join(HERE, f)
    if not os.path.isfile(s):
        print('  (없음)', f)
        continue
    shutil.copy2(s, os.path.join(dst, f))
    n += 1
    print('  ' + f)

print(f'\n총 {n}개 파일을 복사했습니다 → {dst}')
print('이제 GitHub Desktop 으로 돌아가 Summary 에 "hub v2" 라고 쓰고 Commit to main → Push origin.')
