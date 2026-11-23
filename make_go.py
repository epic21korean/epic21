#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
책 속 QR용 고정 주소 만들기 — go/<시리즈>/<키>/index.html

  python3 make_go.py

go/<시리즈>.json 의 {키: 유튜브 영상 ID 또는 null} 을 읽어
  · 영상 ID 가 있으면 → 그 영상으로 바로 넘어가는 페이지
  · null 이면       → "해설 영상 공개 예정" 안내 + 채널 구독 버튼
을 만든다. 책에 찍힌 QR 주소는 바뀌지 않고, 영상이 나오면 json 에 ID 만 넣고 다시 실행하면 된다.

쇼츠까지 모으는 단원 페이지(예: go/vocab500.json):
  "v1-u01": {"title": "...", "video": "본편ID 또는 null", "shorts": ["쇼츠ID", ...]}
  · shorts 가 있으면 바로 넘기지 않고, 본편 + 쇼츠를 한 페이지에 모아 보여 준다
  · "from": "2026-11-21T10:00:00+09:00" — 예약 공개 시각. 그 전엔 '공개 예정', 지나면 자동으로 영상으로 넘어감
  · "t": 초 — 긴 모음 영상의 그 챕터 시각부터 재생 (예: 1단계 3과 → 모음 영상 7:43)
  · "answers": [[제목, 내용], ...] — 교재 정답 쪽(정답을 책에 싣지 않고 QR로 여기 보여 줌)
  · 시리즈 json 의 "soon": {"ko": "...", "en": "..."} 로 '공개 예정' 문구를 바꿀 수 있다
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
.c{{max-width:560px;padding:28px}}.v{{position:relative;aspect-ratio:16/9;margin:14px 0;border-radius:12px;overflow:hidden}}.v iframe,.s iframe{{position:absolute;inset:0;width:100%;height:100%;border:0}}.g{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}}.s{{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden}}h2{{font-size:15px;margin:18px 0 0;color:#e8913c}}h1{{font-size:20px;margin:0 0 6px}}p{{color:#c9cfdd;line-height:1.6;margin:6px 0}}
a.b{{display:inline-block;margin:14px 6px 0;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700}}
.y{{background:#e8913c;color:#0e1730}}.h{{border:1px solid #8e9ab4;color:#f5f0e3}}</style></head>
<body><div class="c"><h1>{title}</h1>{body}</div></body></html>'''


def main():
    n = 0
    for spec in sorted(glob.glob(os.path.join(HERE, 'go', '*.json'))):
        series = os.path.splitext(os.path.basename(spec))[0]
        data = json.load(open(spec, encoding='utf-8'))
        soon = data.get('soon', {'ko': '정답과 해설 영상을 곧 공개합니다.', 'en': 'The answer &amp; explanation video is coming soon.'})
        for key, v in data['links'].items():
            vid, title = (v.get('video'), v.get('title', key)) if isinstance(v, dict) else (v, key)
            shorts = v.get('shorts', []) if isinstance(v, dict) else []
            t = html.escape(title)
            emb = lambda i, c: f'<div class="{c}"><iframe src="https://www.youtube-nocookie.com/embed/{i}" allowfullscreen loading="lazy"></iframe></div>'
            if isinstance(v, dict) and v.get('answers'):      # 교재 정답 쪽: 정답 + 그 장면 영상
                body = ''.join(f'<h2>{html.escape(h)}</h2><p style="text-align:left">{html.escape(x)}</p>' for h, x in v['answers'])
                if vid:
                    body += emb(vid + (f'?start={int(v["t"])}' if v.get('t') else ''), 'v')
                body += f'<a class="b y" href="{CH}">▶ 구독 · Subscribe</a><a class="b h" href="{HUB}">교재 허브 · Hub</a>'
                page = PAGE.format(title=t, redirect='', body=body)
            elif shorts:
                body = (emb(vid, 'v') if vid else f'<p>{soon["ko"]}<br><span style="font-size:13px">{soon["en"]}</span></p>')
                body += '<h2>쇼츠 · Shorts</h2><div class="g">' + ''.join(emb(i, 's') for i in shorts) + '</div>'
                body += f'<a class="b y" href="{CH}">▶ 구독 · Subscribe</a><a class="b h" href="{HUB}">교재 허브 · Hub</a>'
                page = PAGE.format(title=t, redirect='', body=body)
            elif vid:
                url = f'https://www.youtube.com/watch?v={vid}'
                if isinstance(v, dict) and v.get('t'):      # 모음 영상의 해당 챕터 시각(초)으로 바로
                    url += f'&t={int(v["t"])}s'
                frm = v.get('from') if isinstance(v, dict) else None
                if frm:                                         # 예약 공개 전에는 '공개 예정', 공개 시각이 지나면 자동으로 영상으로
                    page = PAGE.format(title=t, redirect=(
                        f'<script>if(Date.now()>=Date.parse("{frm}"))location.replace("{url}")</script>'), body=(
                        f'<p>{soon["ko"]}<br>공개: {frm[:16].replace("T", " ")} (한국 시간)</p>'
                        f'<p style="font-size:13px">{soon["en"]}</p>'
                        f'<a class="b y" href="{url}">▶ 영상 보기 · Watch</a><a class="b h" href="{CH}">구독 · Subscribe</a>'))
                else:
                    page = PAGE.format(title=t, redirect=f'<meta http-equiv="refresh" content="0;url={url}">',
                                       body=f'<p><a class="b y" href="{url}">▶ 영상 보기 · Watch</a></p>')
            else:
                page = PAGE.format(title=t, redirect='', body=(
                    f'<p>{soon["ko"]}<br>채널을 구독하면 공개될 때 알림을 받을 수 있어요.</p>'
                    f'<p style="font-size:13px">{soon["en"]}<br>'
                    'Subscribe to get notified. Subtitles in 20 languages.</p>'
                    f'<a class="b y" href="{CH}">▶ 구독 · Subscribe</a><a class="b h" href="{HUB}">교재 허브 · Hub</a>'))
            d = os.path.join(HERE, 'go', series, key)
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
            n += 1
    print('go 페이지', n)


if __name__ == '__main__':
    main()
