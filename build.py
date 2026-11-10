#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPIC21 교재 허브 생성기

  python3 build.py                 site.json + template.html → index.html, <code>/index.html ×20,
                                   sitemap.xml, robots.txt, .nojekyll
  python3 build.py --refresh-files 아카이브에 물어 site.json 의 files 목록을 갱신한 뒤 생성
                                   (예전 make_filelist.py 의 역할)

교재 추가: site.json 의 "books" 에 한 덩어리 추가 → --refresh-files → 커밋.
표지 썸네일: make_covers.py 로 covers/<id>/<Language>.jpg 를 만들어 두면 자동으로 쓰인다.
없으면 아카이브 아이템 썸네일로 대신 보여 준다.
"""
import json, os, re, sys, html, datetime
from urllib.parse import quote
from jinja2 import Environment, FileSystemLoader, select_autoescape

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, 'site.json')

OG_LOCALE = {'en':'en_US','es':'es_ES','fr':'fr_FR','pt':'pt_BR','id':'id_ID','vi':'vi_VN','tl':'tl_PH',
             'uz':'uz_UZ','ru':'ru_RU','mn':'mn_MN','ja':'ja_JP','zh-Hans':'zh_CN','th':'th_TH','km':'km_KH',
             'my':'my_MM','ne':'ne_NP','bn':'bn_BD','si':'si_LK','ar':'ar_AR','ur':'ur_PK','ko':'ko_KR'}


# 수준 표시 (영상 제목과 같은 4단계 + 초급~고급) — 2026-11-10
LEVEL_KEY = {'입문': 'start', '초급': 'beg', '중급': 'int', '고급': 'adv', '전체': 'all'}
LEVEL_KO = {'입문': '입문', '초급': '초급', '중급': '중급', '고급': '고급', '전체': '초급~고급'}
LEVEL_IDX = {'입문': 0, '초급': 1, '중급': 2, '고급': 3, '전체': 4}
LEVEL_WORDS = {
    'en': ['Starter', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    'ne': ['सुरुवात', 'प्रारम्भिक', 'मध्यम', 'उच्च', 'सबै स्तर'],
    'ru': ['Вводный', 'Начальный', 'Средний', 'Продвинутый', 'Все уровни'],
    'mn': ['Эхлэл', 'Анхан шат', 'Дунд шат', 'Ахисан шат', 'Бүх түвшин'],
    'my': ['အစပြု', 'အခြေခံ', 'အလယ်အလတ်', 'အဆင့်မြင့်', 'အဆင့်အားလုံး'],
    'vi': ['Nhập môn', 'Sơ cấp', 'Trung cấp', 'Cao cấp', 'Mọi trình độ'],
    'bn': ['সূচনা', 'প্রাথমিক', 'মধ্যবর্তী', 'উচ্চতর', 'সব স্তর'],
    'es': ['Introductorio', 'Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles'],
    'si': ['හැඳින්වීම', 'ආරම්භක', 'මධ්‍යම', 'උසස්', 'සියලු මට්ටම්'],
    'ar': ['تمهيدي', 'مبتدئ', 'متوسط', 'متقدم', 'جميع المستويات'],
    'ur': ['تعارفی', 'ابتدائی', 'درمیانہ', 'اعلیٰ', 'تمام سطحیں'],
    'uz': ['Kirish', 'Boshlang‘ich', 'O‘rta', 'Yuqori', 'Barcha darajalar'],
    'id': ['Pengenalan', 'Pemula', 'Menengah', 'Mahir', 'Semua Level'],
    'ja': ['入門', '初級', '中級', '上級', '全レベル'],
    'zh-Hans': ['入门', '初级', '中级', '高级', '全级别'],
    'km': ['ចាប់ផ្ដើម', 'កម្រិតដំបូង', 'កម្រិតមធ្យម', 'កម្រិតខ្ពស់', 'គ្រប់កម្រិត'],
    'tl': ['Panimula', 'Baguhan', 'Katamtaman', 'Mataas', 'Lahat ng Antas'],
    'th': ['เบื้องต้น', 'ระดับต้น', 'ระดับกลาง', 'ระดับสูง', 'ทุกระดับ'],
    'pt': ['Introdutório', 'Iniciante', 'Intermediário', 'Avançado', 'Todos os níveis'],
    'fr': ['Découverte', 'Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'],
}


# 허브 v3 새 문구 — 언어별 번역이 site.json text.<코드>.ui 에 없으면 영어로 채운다
UI_NEW = {
    'en': {'lede': 'Korean textbooks explained in your language, each paired with an EPIC21 video. Download the PDF and study for free.',
           'books': 'textbooks', 'languages': 'languages', 'search': 'Search textbooks', 'level': 'Level',
           'alllv': 'All levels', 'series': 'Series', 'saved': 'Saved', 'save': 'Save this textbook',
           'saved_toast': 'Saved', 'unsaved_toast': 'Removed from saved', 'recent': 'Recently downloaded',
           'watch': 'Watch the video', 'share': 'Share', 'copied': 'Link copied', 'theme': 'Light or dark screen',
           'close': 'Close', 'none': 'No textbooks match.', 'reset': 'Show all textbooks', 'count': '{n} textbooks',
           'dl_short': 'PDF', 'top': 'Back to top', 'install': 'Install app', 'next_ep': "Look forward to the next episode!", 'ep_vowels': "Basic vowels", 'intro_desc': "Learn to read Korean letters from zero — a free video course.", 'intro_title': "Hangul First Steps", 'sub_title': "Your PDF is opening in a new tab", 'sub_text': "Subscribe to EPIC21 on YouTube to get new free textbooks and videos.", 'sub_btn': "Subscribe", 'later': "Later", 'start': "Where should I start?", 'q1': "Can you read Hangul (한글)?", 'q2': "Can you introduce yourself and order at a café in Korean?", 'q3': "Can you read TOPIK II passages or Korean news?", 'yes': "Yes", 'no': "Not yet", 'r_hangul': "Start with Hangul First Steps, our free video course that teaches you to read Korean letters.", 'r_level': "Your level: {level}", 'show': "Show these textbooks", 'again': "Start over", 'new_title': "New textbooks", 'done': "Studied", 'done_count': "{d} / {n} studied", 'qr': "QR code", 'qr_text': "Scan to open this page on a phone.", 'go': 'Open the {lang} page', 'dismiss': 'No thanks'},
    'ko': {'lede': '여러분의 언어로 설명한 한국어 교재입니다. 교재마다 EPIC21 영상이 짝으로 있습니다. PDF를 받아 무료로 공부하세요.',
           'books': '권', 'languages': '개 언어', 'search': '교재 찾기', 'level': '수준',
           'alllv': '모든 수준', 'series': '시리즈', 'saved': '담은 교재', 'save': '이 교재 담기',
           'saved_toast': '담았습니다', 'unsaved_toast': '담기를 뺐습니다', 'recent': '최근 받은 교재',
           'watch': '영상 보기', 'share': '공유', 'copied': '주소를 복사했습니다', 'theme': '밝은 화면·어두운 화면',
           'close': '닫기', 'none': '맞는 교재가 없습니다.', 'reset': '모든 교재 보기', 'count': '교재 {n}권',
           'dl_short': 'PDF', 'top': '맨 위로', 'install': '앱으로 설치', 'next_ep': "다음 편을 기대해 주세요!", 'ep_vowels': "기본 모음", 'intro_desc': "한글을 처음부터 읽을 수 있게 배우는 무료 영상 강좌예요.", 'intro_title': "한글 첫걸음", 'sub_title': "PDF가 새 탭에서 열리고 있어요", 'sub_text': "유튜브에서 EPIC21을 구독하면 새 무료 교재와 영상 소식을 받을 수 있어요.", 'sub_btn': "구독하기", 'later': "나중에", 'start': "어디서부터 시작할까요?", 'q1': "한글을 읽을 수 있나요?", 'q2': "한국어로 자기소개를 하고 카페에서 주문할 수 있나요?", 'q3': "TOPIK II 지문이나 한국어 뉴스를 읽을 수 있나요?", 'yes': "네", 'no': "아직요", 'r_hangul': "「한글 첫걸음」 영상 강좌부터 시작하세요. 한글을 처음부터 읽을 수 있게 알려 드려요.", 'r_level': "추천 수준: {level}", 'show': "이 교재 보기", 'again': "처음부터 다시", 'new_title': "새 교재", 'done': "공부 끝", 'done_count': "{d} / {n}권 공부 끝", 'qr': "QR 코드", 'qr_text': "휴대폰으로 찍으면 이 페이지가 열려요.", 'go': '{lang} 페이지로 가기', 'dismiss': '괜찮아요'},
}
LEVEL_ORDER = ['입문', '초급', '중급', '고급']


def level_info(level, code):
    if level not in LEVEL_KEY:
        return None
    words = LEVEL_WORDS.get(code, LEVEL_WORDS['en'])
    return {'key': LEVEL_KEY[level], 'ko': LEVEL_KO[level], 'word': words[LEVEL_IDX[level]], 'step': LEVEL_IDX[level]}


def load():
    with open(SITE, encoding='utf-8') as f:
        return json.load(f)


def save(site):
    with open(SITE, 'w', encoding='utf-8') as f:
        json.dump(site, f, ensure_ascii=False, indent=1)


def refresh_files(site):
    """아카이브 메타데이터에서 PDF 파일명을 다시 읽어 온다."""
    import urllib.request
    for b in site['books']:
        url = 'https://archive.org/metadata/' + b['id']
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                j = json.load(r)
        except Exception as e:
            print('  !', b['id'], e)
            continue
        pdfs = [f for f in j.get('files', [])
                if f['name'].lower().endswith('.pdf') and f.get('source', 'original') == 'original']
        names = sorted(f['name'] for f in pdfs)
        site['files'][b['id']] = names
        site.setdefault('sizes', {})[b['id']] = {f['name']: int(f.get('size', 0)) for f in pdfs}
        md = j.get('metadata', {})
        if md.get('publicdate') or md.get('addeddate'):
            site.setdefault('added', {})[b['id']] = (md.get('publicdate') or md.get('addeddate'))[:10]
        print('  ', b['id'], len(names))
    save(site)


def match_pdf(names, lang_file):
    """파일명 속 언어 이름으로 PDF 를 찾는다. Chinese-Simplified / ChineseSimplified 둘 다 인정."""
    base = lang_file.lower()
    tokens = [base] + ([base.replace('-', '')] if '-' in base else [])
    for n in names:
        nl = n.lower()
        for tkn in tokens:
            if (tkn + '_') in nl or (tkn + '.') in nl:
                return n
    return None


def cover_exists(book_id, lang_file):
    return os.path.exists(os.path.join(HERE, 'covers', book_id, lang_file + '.jpg'))


def build_page(site, env, lang, is_root):
    site_url = site['site_url'].rstrip('/')
    code = lang['code']
    T = site['text']
    t = T.get(code, T['en'])
    count = len(site['books'])
    t = json.loads(json.dumps(t))  # 복사
    ui = dict(UI_NEW['en']); ui.update(UI_NEW.get(code, {})); ui.update(t['ui']); t['ui'] = ui
    for k in ('title', 'desc'):
        t[k] = t[k].replace('{count}', str(count))

    base = '' if is_root else '../'
    page_url = site_url + '/' if is_root else f'{site_url}/{code}/'

    # 언어별 OG 이미지가 있으면 그것, 없으면 공용 og.png
    og_rel = f'og/{code}.png' if os.path.exists(os.path.join(HERE, 'og', code + '.png')) else 'og.png'
    og_image = f'{site_url}/{og_rel}'

    groups = []
    items = []
    for g in site['groups']:
        gk = g['key']
        gt = t['groups'][gk]
        gko = T['ko']['groups'][gk]['name']
        books = []
        for b in site['books']:
            if b['group'] != gk:
                continue
            names = site['files'].get(b['id'], [])
            hit = match_pdf(names, lang['file'])
            pdf = f"https://archive.org/download/{b['id']}/{quote(hit)}" if hit else None
            nbytes = site.get('sizes', {}).get(b['id'], {}).get(hit, 0) if hit else 0
            mb = nbytes / 1048576
            size = (f"{mb:.0f} MB" if mb >= 10 else f"{mb:.1f} MB") if nbytes else ''
            # 표지: 로컬 → 아카이브 아이템 썸네일
            cover = f"{base}covers/{b['id']}/{lang['file']}.jpg"
            cover_fallback = f"https://archive.org/services/img/{b['id']}"
            vol_label = t['ui']['vol'].replace('{n}', str(b['vol'])) if b.get('vol') else ''
            name = gt['name'] if code != 'ko' else b['ko'].split('·')[0].strip()
            if code == 'ko' and b.get('vol') and b['group'] == 'dlg':
                name = b['ko']
                vol_label = ''
            lv = level_info(b.get('level'), 'en' if code == '_root' else code)
            single = sum(1 for x in site['books'] if x['group'] == gk) == 1
            short = b['ko'].split('·')[-1].strip() if '·' in b['ko'] else b['ko']
            # 부제: 그 언어 번역(tr) → 없으면 영어 (한 권짜리 시리즈는 en, 여러 권은 en_sub)
            en_line = b['en'] if single else b.get('en_sub', '')
            tr = (b.get('tr') or {}).get(code)
            sub, sub_lang = (tr, code) if tr else (en_line, 'en')
            vid = b.get('video') or ''
            q = b.get('ko_sub') or b['ko'].split('·')[-1].strip()
            video_url = (f"https://www.youtube.com/watch?v={vid}" if vid
                         else site['youtube'].rstrip('/') + '/search?query=' + quote(q))
            search = ' '.join(x for x in [tr or '', b['ko'], b.get('en', ''), b.get('ko_sub', ''), b.get('en_sub', ''),
                                         gt['name'], b.get('slug', '')] if x).lower()
            bk = dict(b, added=site.get('added', {}).get(b['id'], ''), sub=sub, sub_lang=sub_lang, size=size, short=short, video=vid, video_url=video_url, search=search, pdf=pdf, cover=cover, cover_fallback=cover_fallback, vol_label=vol_label, name=name, single=single, lv=lv)
            books.append(bk)
            if pdf:
                items.append({'@type': 'Book', 'name': f"{vol_label + ' ' if vol_label else ''}{gt['name']}"
                              + (f" — {b['ko_sub']}" if b.get('ko_sub') else ''),
                              'inLanguage': ['ko', 'en' if code == '_root' else code], 'url': pdf, 'isAccessibleForFree': True,
                              'license': 'https://creativecommons.org/licenses/by-nc-nd/4.0/'})
        groups.append(dict(key=gk, name=gt['name'], desc=gt['desc'], ko=gko, books=books))

    # 수준별 층: 입문 → 초급 → 중급 → 고급 → 모든 수준(전체). 수준이 없는 교재는 '전체'에 둔다.
    lv_code = 'en' if code == '_root' else code
    TOPIK_LBL = {'입문': 'Pre-TOPIK', '초급': 'TOPIK I · 1–2', '중급': 'TOPIK II · 3–4',
                 '고급': 'TOPIK II · 5–6', '전체': 'TOPIK I – II'}
    tiers = []
    for L in LEVEL_ORDER + ['전체']:
        subs = []
        for g in groups:
            bs = [b for b in g['books'] if (b.get('level') if b.get('level') in LEVEL_KEY else '전체') == L]
            if bs:
                subs.append(dict(g, books=bs))
        if subs:
            info = level_info(L, lv_code)
            tiers.append(dict(info, topik=TOPIK_LBL[L], groups=subs,
                              n=sum(len(x['books']) for x in subs)))

    itemlist = {'@type': 'ItemList', 'name': t['title'],
              'url': page_url, 'numberOfItems': len(items),
              'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': it}
                                  for i, it in enumerate(items)]}
    website = {'@type': 'WebSite', '@id': site_url + '/#website', 'name': 'EPIC21',
               'alternateName': ['EPIC21 Korean', 'EPIC21 무료 한국어 교재'], 'url': site_url + '/'}
    jsonld = {'@context': 'https://schema.org', '@graph': [website, itemlist]}

    alternates = [{'code': L['code'], 'url': f"{site_url}/{L['code']}/"} for L in site['langs']]

    levels = [level_info(L, lv_code) for L in LEVEL_ORDER
              if any(x.get('level') == L for x in site['books']) or (L == '입문' and site.get('intro'))]
    intro = [dict(v, title=t['ui'].get(v['key'], ''), ep=t['ui']['vol'].replace('{n}', str(v['no']))) for v in site.get('intro', [])]
    lang_names = {L['code'].split('-')[0] if L['code'] != 'zh-Hans' else 'zh-Hans': L['name'] for L in site['langs']}

    tpl = env.get_template('template.html')
    return tpl.render(
        lang=lang, t=t, is_root=is_root, base=base, page_url=page_url, site_url=site_url,
        og_image=og_image, og_locale=OG_LOCALE.get(code, 'en_US'),
        intro=intro, intro_lv=level_info('입문', lv_code), level_names={L['key']: L['ko'] + ('' if code == 'ko' else ' ' + L['word']) for L in levels}, goatcounter=site.get('goatcounter', ''), qrname=('root' if is_root else lang['code']), youtube_sub=site['youtube'].rstrip('/') + '?sub_confirmation=1', alternates=alternates, langs=site['langs'], groups=groups, tiers=tiers, book_count=count,
        youtube=site['youtube'], archive_user=site['archive_user'], license=site['license'],
        about_ko=T['ko']['about'], levels=levels, lang_names=lang_names,
        jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'),
    )


def main():
    site = load()
    if '--refresh-files' in sys.argv:
        print('아카이브에서 파일 목록 갱신')
        refresh_files(site)

    env = Environment(loader=FileSystemLoader(HERE), autoescape=select_autoescape(['html']))
    site_url = site['site_url'].rstrip('/')

    # 첫 화면: 언어표 + 영어 목록 (검색 엔진이 읽을 수 있도록 정적으로 넣는다)
    en = next(L for L in site['langs'] if L['code'] == 'en')
    root_lang = dict(en)
    root_text = site['text']['en']
    # 첫 화면 제목·설명만 허브용으로 바꾼다
    site['text']['_root'] = dict(root_text,
        title='EPIC21 — Free Korean Textbooks in 20 Languages · 무료 한국어 교재 (TOPIK I & II, PDF)',
        desc=root_text['desc'].replace('with English explanations', 'explained in 20 languages'),
        h1='무료 한국어 교재')
    root_lang['code'] = '_root'
    html_root = build_page(site, env, root_lang, True)
    html_root = html_root.replace('<html lang="_root">', '<html lang="en">')
    del site['text']['_root']
    with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html_root)
    print('index.html')

    urls = [site_url + '/']
    for L in site['langs']:
        d = os.path.join(HERE, L['code'])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(build_page(site, env, L, False))
        urls.append(f"{site_url}/{L['code']}/")
        print(f"{L['code']}/index.html")

    today = datetime.date.today().isoformat()
    with open(os.path.join(HERE, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write(f'  <url><loc>{html.escape(u)}</loc><lastmod>{today}</lastmod></url>\n')
        f.write('</urlset>\n')
    with open(os.path.join(HERE, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(f'User-agent: *\nAllow: /\nSitemap: {site_url}/sitemap.xml\n')
    open(os.path.join(HERE, '.nojekyll'), 'a').close()

    # 홈 화면 앱(PWA): 언어마다 manifest — 설치한 언어 페이지로 바로 열린다
    def manifest(start, scope, lang_code, desc):
        return {
            'name': 'EPIC21 — Free Korean Textbooks', 'short_name': 'EPIC21',
            'description': desc, 'lang': lang_code, 'start_url': start, 'scope': scope, 'id': start,
            'display': 'standalone', 'background_color': '#0F1A36', 'theme_color': '#0F1A36',
            'icons': [
                {'src': f'{scope}icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                {'src': f'{scope}icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                {'src': f'{scope}icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}
    with open(os.path.join(HERE, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(manifest('./', './', 'en', site['text']['en']['desc'].replace('{count}', str(len(site['books'])))), f, ensure_ascii=False, indent=1)
    for L in site['langs']:
        with open(os.path.join(HERE, L['code'], 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
            json.dump(manifest('./', '../', L['code'], site['text'][L['code']]['desc'].replace('{count}', str(len(site['books'])))), f, ensure_ascii=False, indent=1)
    print('manifest.webmanifest (+20)')

    # QR 코드: 페이지마다 qr/<코드>.svg (segno 가 있을 때만 새로 만든다 — pip install segno)
    try:
        import segno
        os.makedirs(os.path.join(HERE, 'qr'), exist_ok=True)
        for code, url in [('root', site_url + '/')] + [(L['code'], f"{site_url}/{L['code']}/") for L in site['langs']]:
            segno.make(url, error='m').save(os.path.join(HERE, 'qr', f'{code}.svg'), scale=8, border=2, dark='#0F1A36')
        print('qr/*.svg')
    except ImportError:
        print('segno 없음 — QR 은 그대로 둔다')

    # 저장본 버전: 만들 때마다 바뀌어 옛 표지·페이지 저장본이 비워진다
    import hashlib
    sw_path = os.path.join(HERE, 'sw.js')
    if os.path.exists(sw_path):
        covers = sorted((r, f, os.path.getsize(os.path.join(r, f))) for r, _, fs in os.walk(os.path.join(HERE, 'covers')) for f in fs)
        tpl_txt = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
        sig = hashlib.md5((json.dumps(site, sort_keys=True, ensure_ascii=False) + str(covers) + tpl_txt).encode()).hexdigest()[:8]
        sw = re.sub(r"const V = '[^']*';", f"const V = 'epic21-{sig}';", open(sw_path, encoding='utf-8').read())
        open(sw_path, 'w', encoding='utf-8').write(sw)
        print('sw.js 버전', sig)
    print('sitemap.xml robots.txt .nojekyll')


if __name__ == '__main__':
    main()
