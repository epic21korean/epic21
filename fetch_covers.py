#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
빠진 표지를 인터넷 아카이브에서 가져온다.

  python fetch_covers.py

covers/<id>/<Language>.jpg 가 없는 것만 처리한다.
1) 아카이브가 만들어 둔 1쪽 이미지를 먼저 시도하고,
2) 안 되면 PDF 를 임시로 내려받아 1쪽을 그린 뒤 PDF 는 지운다.
끝나면 og.png 와 og/<코드>.png 를 다시 만든다.
"""
import json, os, sys, time, tempfile, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_covers import render_page1, make_og

site = json.load(open(os.path.join(HERE, 'site.json'), encoding='utf-8'))
UA = {'User-Agent': 'Mozilla/5.0 (EPIC21 cover fetch)'}

lang_by_token = {}
for L in site['langs']:
    lang_by_token[L['file'].lower()] = L['file']
    lang_by_token[L['file'].lower().replace('-', '')] = L['file']


def lang_of(name):
    nl = name.lower()
    for tkn, lf in lang_by_token.items():
        if (tkn + '_') in nl or (tkn + '.') in nl:
            return lf
    return None


def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')


def try_page_image(bid, fname, out):
    stem = fname[:-4]
    q = urllib.parse.quote
    cands = [
        f'https://archive.org/download/{bid}/{q(fname)}/page/n0_w480.jpg',
        f'https://archive.org/download/{bid}/{q(stem)}/page/n0_w480.jpg',
        f'https://archive.org/download/{bid}/{q(stem)}_jp2.zip/{q(stem)}_jp2%2F{q(stem)}_0000.jp2&ext=jpg',
    ]
    for u in cands:
        try:
            data, ctype = get(u, timeout=40)
        except Exception:
            continue
        if 'image' in ctype and len(data) > 4000:
            with open(out, 'wb') as f:
                f.write(data)
            return True
    return False


def fetch_pdf_render(bid, fname, out):
    url = f'https://archive.org/download/{bid}/{urllib.parse.quote(fname)}'
    tmp = os.path.join(tempfile.gettempdir(), fname)
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=120) as r, open(tmp, 'wb') as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        ok = render_page1(tmp, out)
    except Exception as e:
        print('     실패:', e)
        ok = False
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass
    return ok


import urllib.parse
todo = []
for b in site['books']:
    for fname in site['files'].get(b['id'], []):
        lf = lang_of(fname)
        if not lf:
            continue
        out = os.path.join(HERE, 'covers', b['id'], lf + '.jpg')
        if not os.path.exists(out):
            todo.append((b['id'], fname, lf, out))

print(f'가져올 표지: {len(todo)}장')
done = 0
for i, (bid, fname, lf, out) in enumerate(todo, 1):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    print(f'[{i}/{len(todo)}] {bid} / {lf}', end=' ', flush=True)
    if try_page_image(bid, fname, out):
        print('(이미지)')
        done += 1
    elif fetch_pdf_render(bid, fname, out):
        print('(PDF)')
        done += 1
    else:
        print('✗')
    time.sleep(0.5)

print(f'\n표지 {done}장 추가 완료')
make_og(site, None)
