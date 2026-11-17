#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
책 속 QR용 고정 주소 만들기 — go/<시리즈>/<키>/index.html

  python3 make_go.py

go/<시리즈>.json 의 {키: 유튜브 영상 ID 또는 null} 을 읽어
  · 영상 ID 가 있으면 → 그 영상으로 바로 넘어가는 페이지
  · null 이면       → "해설 영상 공개 예정" 안내 + 채널 구독 버튼
을 만든다. 책에 찍힌 QR 주소는 바뀌지 않고, 영상이 나오면 json 에 ID 만 넣고 다시 실행하면 된다.
"""
import json, os, glob, html

HERE = os.path.dirname(os.path.abspath(__file__))
CH = 'https://www.youtube.com/@EPIC21korean?sub_confirmation=1'
HUB = 'https://epic21korean.github.io/epic21/'

PAGE = '''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>{title} · EPIC21</title>{redirect}
<style>body{{margin:0;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;background:#0e1730;color:#f5f0e3;
display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}}
.c{{max-width:420px;padding:28px}}h1{{font-size:20px;margin:0 0 6px}}p{{color:#c9cfdd;line-height:1.6;margin:6px 0}}
a.b{{display:inline-block;margin:14px 6px 0;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700}}
.y{{background:#e8913c;color:#0e1730}}.h{{border:1px solid #8e9ab4;color:#f5f0e3}}</style></head>
<body><div class="c"><h1>{title}</h1>{body}</div></body></html>'''


def main():
    n = 0
    for spec in sorted(glob.glob(os.path.join(HERE, 'go', '*.json'))):
        series = os.path.splitext(os.path.basename(spec))[0]
        data = json.load(open(spec, encoding='utf-8'))
        for key, v in data['links'].items():
            vid, title = (v.get('video'), v.get('title', key)) if isinstance(v, dict) else (v, key)
            t = html.escape(title)
            if vid:
                url = f'https://www.youtube.com/watch?v={vid}'
                page = PAGE.format(title=t, redirect=f'<meta http-equiv="refresh" content="0;url={url}">',
                                   body=f'<p><a class="b y" href="{url}">▶ 영상 보기 · Watch</a></p>')
            else:
                page = PAGE.format(title=t, redirect='', body=(
                    '<p>정답과 해설 영상을 곧 공개합니다.<br>채널을 구독하면 공개될 때 알림을 받을 수 있어요.</p>'
                    '<p style="font-size:13px">The answer &amp; explanation video is coming soon.<br>'
                    'Subscribe to get notified. Subtitles in 20 languages.</p>'
                    f'<a class="b y" href="{CH}">▶ 구독 · Subscribe</a><a class="b h" href="{HUB}">교재 허브 · Hub</a>'))
            d = os.path.join(HERE, 'go', series, key)
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
            n += 1
    print('go 페이지', n)


if __name__ == '__main__':
    main()
