# -*- coding: utf-8 -*-
"""안내 코너 문구: guides/<언어>.txt (한 줄에 한 문장, 순서 고정) ↔ 구조. build.py 가 load_lang() 을 쓴다."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
UI = ['corner', 'corner_sub', 'more', 'back', 'official', 'checked', 'notice', 'study', 'study_btn', 'others']
V4 = ['map_title', 'sub_title_v', 'sub_text_v']
AX = ['eps', 'topik', 'kiip', 'start', 'more']
SHAPE = {  # 주제별 절 모양: (p, list, steps, p2) 개수
    'eps': [(3, 0, 0, 0), (1, 0, 5, 1), (0, 4, 0, 0), (0, 3, 0, 1), (0, 3, 0, 0)],
    'topik': [(0, 5, 0, 0), (0, 4, 0, 1), (0, 5, 0, 0), (0, 3, 0, 0), (0, 4, 0, 0)],
    'kiip': [(0, 4, 0, 1), (0, 3, 0, 1), (0, 3, 4, 0), (0, 3, 0, 0), (0, 3, 0, 0)],
}
TOTAL = len(UI) + len(V4) + len(AX) * 3 + sum(2 + sum(1 + sum(s) for s in v) + 1 for v in SHAPE.values())

def parse(code):
    L = [x.strip() for x in open(os.path.join(HERE, 'guides', code + '.txt'), encoding='utf-8').read().split('\n') if x.strip()]
    assert len(L) == TOTAL, (code, len(L), TOTAL)
    it = iter(L); nx = lambda: next(it)
    d = {'ui': {k: nx() for k in UI}, 'v4': {k: nx() for k in V4}, 'axes': {}}
    for a in AX:
        d['axes'][a] = [nx(), nx(), nx()]
    for key, shape in SHAPE.items():
        g = {'title': nx(), 'lead': nx(), 'short': d['axes'][key][2], 'sections': []}
        for p, li, st, p2 in shape:
            s = {'h': nx()}
            if p: s['p'] = [nx() for _ in range(p)]
            if li: s['list'] = [nx() for _ in range(li)]
            if st: s['steps'] = [nx() for _ in range(st)]
            if p2: s['p2'] = [nx() for _ in range(p2)]
            g['sections'].append(s)
        g['study'] = nx(); d[key] = g
    return d

def load_lang(code):
    return parse(code) if os.path.exists(os.path.join(HERE, 'guides', code + '.txt')) else None

if __name__ == '__main__':
    import sys
    for f in sorted(os.listdir(os.path.join(HERE, 'guides'))):
        parse(f[:-4]); print('ok', f)
