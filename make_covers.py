#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
표지 썸네일과 공유용 OG 이미지 만들기

  python3 make_covers.py --pdf-dir /path/to/pdfs [--font /path/NotoSansKR-Black.ttf]

1. --pdf-dir 아래(하위 폴더 포함)의 PDF 중 site.json 의 files 에 적힌 파일명과 같은 것을 찾아
   1쪽을 covers/<id>/<Language>.jpg (너비 480px) 로 저장한다.
2. covers/ 가 채워지면 og.png (공용) 과 og/<code>.png (언어별) 을 만든다.
   표지가 하나도 없으면 글자만 있는 og.png 를 만든다.

필요: pip install pymupdf pillow      (pymupdf 가 없으면 pdftoppm(poppler) 를 쓴다)
"""
import argparse, json, os, subprocess, sys, shutil, glob
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
INK, INK2, CREAM, AMBER, MUTED = (14,23,48), (24,38,72), (245,240,227), (232,145,60), (142,154,180)
COVER_W = 480


def render_page1(pdf, out, width=COVER_W):
    try:
        import fitz  # pymupdf
        doc = fitz.open(pdf)
        page = doc[0]
        zoom = width / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        pix.save(out + '.png')
        Image.open(out + '.png').convert('RGB').save(out, 'JPEG', quality=82, optimize=True)
        os.remove(out + '.png')
        return True
    except ImportError:
        pass
    if shutil.which('pdftoppm'):
        tmp = out[:-4]
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-jpeg', '-r', '72', '-scale-to-x', str(width),
                        '-scale-to-y', '-1', '-singlefile', pdf, tmp], check=True)
        return os.path.exists(out)
    print('pymupdf 도 pdftoppm 도 없습니다. pip install pymupdf', file=sys.stderr)
    return False


def make_covers(site, pdf_dir):
    index = {}
    for p in glob.glob(os.path.join(pdf_dir, '**', '*.pdf'), recursive=True):
        index.setdefault(os.path.basename(p), p)
    lang_by_token = {}
    for L in site['langs']:
        lang_by_token[L['file'].lower()] = L['file']
        lang_by_token[L['file'].lower().replace('-', '')] = L['file']
    made = 0
    for bid, names in site['files'].items():
        for n in names:
            src = index.get(n)
            if not src:
                continue
            nl = n.lower()
            lang = next((lf for tkn, lf in lang_by_token.items() if (tkn + '_') in nl or (tkn + '.') in nl), None)
            if not lang:
                continue
            outdir = os.path.join(HERE, 'covers', bid)
            os.makedirs(outdir, exist_ok=True)
            out = os.path.join(outdir, lang + '.jpg')
            if os.path.exists(out):
                continue
            if render_page1(src, out):
                made += 1
                print(' ', bid, lang)
    print(f'표지 {made}장 생성')


def font(path, size):
    cands = [path] if path else []
    cands += ['/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc',
              '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
              '/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf',
              'C:/Windows/Fonts/malgunbd.ttf', '/System/Library/Fonts/AppleSDGothicNeo.ttc']
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def compose_og(site, out, lang_file, title, sub, font_path):
    """남색 바탕, 왼쪽 글자, 오른쪽에 표지 6장을 비스듬히 겹쳐 놓는다."""
    W, H = 1200, 630
    im = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(im)
    # 위쪽 은은한 빛
    for i in range(0, 300, 4):
        c = tuple(int(INK[k] + (INK2[k] - INK[k]) * (1 - i / 300)) for k in range(3))
        d.rectangle([0, i, W, i + 4], fill=c)

    covers = []
    for b in site['books']:
        p = os.path.join(HERE, 'covers', b['id'], lang_file + '.jpg')
        if os.path.exists(p):
            covers.append(p)
    covers = covers[:6]
    if covers:
        cw, ch = 210, int(210 * 1.414)
        x0, y0 = 620, 70
        for i, p in enumerate(covers):
            c = Image.open(p).convert('RGB').resize((cw, ch))
            # 그림자
            sh = Image.new('RGBA', (cw + 30, ch + 30), (0, 0, 0, 0))
            ImageDraw.Draw(sh).rectangle([15, 15, cw + 15, ch + 15], fill=(0, 0, 0, 120))
            x = x0 + (i % 3) * 165 + (i // 3) * 40
            y = y0 + (i // 3) * 200
            im.paste(sh, (x - 15, y - 5), sh)
            im.paste(c, (x, y))
            d.rectangle([x, y, x + cw, y + ch], outline=(245, 240, 227, 60))

    d.text((80, 70), 'EPIC21', font=font(font_path, 30), fill=AMBER)
    f_big = font(font_path, 64)
    y = 130
    for line in title.split('\n'):
        d.text((80, y), line, font=f_big, fill=CREAM)
        y += 78
    d.text((80, y + 14), sub, font=font(font_path, 30), fill=MUTED)
    # 배지
    fb = font(font_path, 26)
    bx, by = 80, H - 110
    for label in ['20 languages', 'TOPIK I · II', 'Free · No sign-up']:
        w = d.textlength(label, font=fb) + 40
        d.rounded_rectangle([bx, by, bx + w, by + 52], radius=26, outline=AMBER, width=2)
        d.text((bx + 20, by + 10), label, font=fb, fill=AMBER)
        bx += w + 14
    im.save(out, 'PNG', optimize=True)
    print(' ', os.path.relpath(out, HERE))


def make_og(site, font_path):
    compose_og(site, os.path.join(HERE, 'og.png'), 'English',
               '무료 한국어 교재\nFree Korean Textbooks', 'PDF · 20 languages · epic21korean.github.io/epic21', font_path)
    os.makedirs(os.path.join(HERE, 'og'), exist_ok=True)
    for L in site['langs']:
        if not any(os.path.exists(os.path.join(HERE, 'covers', b['id'], L['file'] + '.jpg')) for b in site['books']):
            continue
        t = site['text'].get(L['code'], site['text']['en'])
        compose_og(site, os.path.join(HERE, 'og', L['code'] + '.png'), L['file'],
                   'Free Korean Textbooks\n' + L['name'], 'PDF · TOPIK I · II · epic21korean.github.io/epic21', font_path)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf-dir', help='교재 PDF 가 있는 폴더 (하위 폴더 포함)')
    ap.add_argument('--font', help='OG 이미지 글꼴 (ttf/ttc). 한글이 깨지면 지정')
    a = ap.parse_args()
    site = json.load(open(os.path.join(HERE, 'site.json'), encoding='utf-8'))
    if a.pdf_dir:
        make_covers(site, a.pdf_dir)
    make_og(site, a.font)
