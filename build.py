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
           'dl_short': 'PDF', 'top': 'Back to top', 'install': 'Install app', 'sub_title': "Your PDF is opening in a new tab", 'sub_text': "Subscribe to EPIC21 on YouTube to get new free textbooks and videos.", 'sub_btn': "Subscribe", 'later': "Later", 'start': "Where should I start?", 'q1': "Can you read Hangul (한글)?", 'q2': "Can you introduce yourself and order at a café in Korean?", 'q3': "Can you read TOPIK II passages or Korean news?", 'yes': "Yes", 'no': "Not yet", 'r_hangul': "Start with the textbook Hangul First Steps: learn to read Korean letters from zero with pictures, videos and sounds.", 'r_level': "Your level: {level}", 'show': "Show these textbooks", 'again': "Start over", 'new_title': "New textbooks", 'done': "Studied", 'done_count': "{d} / {n} studied", 'qr': "QR code", 'qr_text': "Scan to open this page on a phone.", 'go': 'Open the {lang} page', 'dismiss': 'No thanks'},
    'ko': {'lede': '여러분의 언어로 설명한 한국어 교재입니다. 교재마다 EPIC21 영상이 짝으로 있습니다. PDF를 받아 무료로 공부하세요.',
           'books': '권', 'languages': '개 언어', 'search': '교재 찾기', 'level': '수준',
           'alllv': '모든 수준', 'series': '시리즈', 'saved': '담은 교재', 'save': '이 교재 담기',
           'saved_toast': '담았습니다', 'unsaved_toast': '담기를 뺐습니다', 'recent': '최근 받은 교재',
           'watch': '영상 보기', 'share': '공유', 'copied': '주소를 복사했습니다', 'theme': '밝은 화면·어두운 화면',
           'close': '닫기', 'none': '맞는 교재가 없습니다.', 'reset': '모든 교재 보기', 'count': '교재 {n}권',
           'dl_short': 'PDF', 'top': '맨 위로', 'install': '앱으로 설치', 'sub_title': "PDF가 새 탭에서 열리고 있어요", 'sub_text': "유튜브에서 EPIC21을 구독하면 새 무료 교재와 영상 소식을 받을 수 있어요.", 'sub_btn': "구독하기", 'later': "나중에", 'start': "어디서부터 시작할까요?", 'q1': "한글을 읽을 수 있나요?", 'q2': "한국어로 자기소개를 하고 카페에서 주문할 수 있나요?", 'q3': "TOPIK II 지문이나 한국어 뉴스를 읽을 수 있나요?", 'yes': "네", 'no': "아직요", 'r_hangul': "『한글 첫걸음』 교재부터 시작하세요. 그림과 영상, 소리로 한글을 처음부터 배울 수 있어요.", 'r_level': "추천 수준: {level}", 'show': "이 교재 보기", 'again': "처음부터 다시", 'new_title': "새 교재", 'done': "공부 끝", 'done_count': "{d} / {n}권 공부 끝", 'qr': "QR 코드", 'qr_text': "휴대폰으로 찍으면 이 페이지가 열려요.", 'go': '{lang} 페이지로 가기', 'dismiss': '괜찮아요'},
}
LEVEL_ORDER = ['입문', '초급', '중급', '고급']
# 허브 v4 (2026-11-25): 수준별 층 대신 학습 목적별 '축'으로 묶고, 축·시리즈를 접어 둔다.
AXES = [('eps', '🧑‍🏭', ['eps']),
        ('topik', '📝', ['mv1', 'dlg', 'cls', 'core', 'mv2', 'mag', 'wrt']),
        ('kiip', '🏛️', ['kiip']),
        ('start', '🔤', ['hangul', 's100']),
        ('more', '➕', ['easy', 'poem', 'ttg'])]
AX_TEXT = {  # [이름, 축 설명, 지도 칸 한 줄(누구를 위한가), 왜 필요한가]
    'en': {'eps': ['EPS-TOPIK', 'Korean for working in Korea — mock tests with video explanations',
                   'If you want to work in Korea',
                   "Korea's Employment Permit System (EPS) brings workers from partner countries to factories, farms, fishing, construction and service jobs on an E-9 visa. You take the EPS-TOPIK in your own country, and Korean employers choose workers from the list of people who passed — so your score really matters."],
           'topik': ['TOPIK I · II', "Korea's official Korean test — songs, dialogues, grammar and writing",
                     'If you want to study or build a career in Korea',
                     "TOPIK is Korea's official Korean language test. Universities use it for admission (usually level 3 or higher) and graduation, and companies, scholarships and some visa point systems use it too. TOPIK I covers levels 1–2, TOPIK II covers levels 3–6. A score is valid for 2 years."],
           'kiip': ['KIIP · Social Integration Program', 'Prepare for the KIIP pre-test, level tests and mid-term test',
                    'If you want to live in Korea long-term',
                    "KIIP is the Ministry of Justice program for foreigners living in Korea. Completing it gives extra points when you apply to extend or change your visa, and it counts toward the requirements for permanent residency and naturalization (Korean citizenship)."],
           'start': ['First steps', 'Hangul and your first 100 sentences — start here',
                     'If you are learning Korean for the first time',
                     'EPS-TOPIK, TOPIK and KIIP all begin with Hangul, the Korean alphabet. Learn to read it with pictures and sounds, then learn 100 sentences you can use with Koreans right away.'],
           'more': ['More', 'Other series', '', '']},
    'ko': {'eps': ['EPS-TOPIK', '한국 취업을 위한 한국어 — 영상 해설이 있는 실전 모의고사',
                   '한국에서 일하고 싶다면',
                   '고용허가제(EPS)는 협약을 맺은 나라의 근로자가 E-9 비자로 한국의 공장·농장·어업·건설·서비스 현장에서 일하게 하는 제도예요. EPS-TOPIK은 자기 나라에서 치르고, 한국 회사는 합격자 명단에서 근로자를 골라요. 그래서 점수가 정말 중요해요.'],
           'topik': ['TOPIK I · II', '한국어능력시험 — 노래·대화·문법·쓰기',
                     '한국에서 공부하거나 일하고 싶다면',
                     'TOPIK은 한국 정부가 운영하는 공식 한국어 시험이에요. 한국 대학 입학(보통 3급 이상)과 졸업에 쓰이고, 회사 취업·장학금·일부 비자 점수에도 쓰여요. TOPIK I은 1~2급, TOPIK II는 3~6급이고, 성적은 2년 동안 유효해요.'],
           'kiip': ['사회통합프로그램', '사전평가·단계평가·중간평가 대비',
                    '한국에서 오래 살고 싶다면',
                    '사회통합프로그램은 한국에 사는 외국인을 위한 법무부 교육이에요. 이수하면 비자를 연장하거나 바꿀 때 가점을 받고, 영주권과 귀화(한국 국적) 신청 요건을 채울 수 있어요.'],
           'start': ['처음 시작', '한글과 첫 100문장 — 여기서 시작하세요',
                     '한국어를 처음 배운다면',
                     'EPS-TOPIK도, TOPIK도, 사회통합프로그램도 모두 한글에서 시작해요. 그림과 소리로 한글을 읽는 법을 배우고, 한국 사람과 바로 쓸 수 있는 100문장을 익히세요.'],
           'more': ['더 보기', '다른 시리즈', '', '']},
}
AX_LINK = {'eps': 'https://epstopik.hrdkorea.or.kr', 'topik': 'https://www.topik.go.kr', 'kiip': 'https://www.socinet.go.kr'}
UI_V4 = {
    'en': {'map_title': 'What do you want to study?', 'tap_open': 'Tap to open',
           'sub_title_v': 'Did the video help?', 'sub_text_v': "Subscribe to EPIC21 so you don't miss the next lesson.",
           'why': 'Why do I need this?', 'official': 'Official website'},
    'ko': {'map_title': '무엇을 공부할까요?', 'tap_open': '눌러서 펼치기',
           'sub_title_v': '영상이 도움이 되었나요?', 'sub_text_v': 'EPIC21을 구독하면 다음 강의를 놓치지 않아요.',
           'why': '왜 필요할까요?', 'official': '공식 사이트'},
}

# 홈 화면 추가 안내 문구 — ?app=ko 로 열면 어느 페이지에서든 안내 창만 한국어로 바뀐다(교사용)
APP_KEYS = ['app_title', 'app_lede', 'app_btn', 'ios1', 'ios2', 'ios3', 'menu', 'inapp', 'inapp_btn', 'inapp_ios', 'copylink', 'app_done']
# 컴퓨터(데스크톱)에서 열었을 때 바꿔 쓰는 안내 문구 — 크롬·엣지 설치, 맥 사파리 Dock, 그 밖의 브라우저
PC_KEYS = ['pc_title', 'pc_lede', 'pc_btn', 'pc_menu', 'pc_mac', 'pc_other', 'pc_done']


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
    # 한국어 단일판(언어별 판이 없는 책)은 모든 언어 페이지에서 같은 파일을 준다
    for n in names:
        if n.lower().endswith('_korean.pdf'):
            return n
    return None


def cover_exists(book_id, lang_file):
    return os.path.exists(os.path.join(HERE, 'covers', book_id, lang_file + '.jpg'))


def build_page(site, env, lang, is_root, collect=None, preview=False):
    site_url = site['site_url'].rstrip('/')
    code = lang['code']
    T = site['text']
    t = T.get(code, T['en'])
    count = len(site['books'])
    t = json.loads(json.dumps(t))  # 복사
    ui = dict(UI_NEW['en']); ui.update(UI_NEW.get(code, {})); ui.update(t['ui'])
    ui.update({k: v for k, v in UI_V4['en'].items() if k not in ui}); ui.update(UI_V4.get(code, {})); ui.update(t['ui'].get('v4', {}) if isinstance(t['ui'].get('v4'), dict) else {}); t['ui'] = ui
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
            # 재생목록: 교재 덩어리의 "playlist" → 없으면 그 묶음(groups)의 "playlist"
            plist = b.get('playlist') or next((g.get('playlist', '') for g in site['groups'] if g['key'] == b['group']), '')
            if vid:
                video_url = f"https://www.youtube.com/watch?v={vid}" + (f"&list={plist}" if plist else '')
            elif plist:
                video_url = f"https://www.youtube.com/playlist?list={plist}"
            else:
                video_url = site['youtube'].rstrip('/') + '/search?query=' + quote(q)
            search = ' '.join(x for x in [tr or '', b['ko'], b.get('en', ''), b.get('ko_sub', ''), b.get('en_sub', ''),
                                         gt['name'], b.get('slug', '')] if x).lower()
            page = f"{base}{'en/' if is_root else ''}{b['slug']}/" if is_root else f"{b['slug']}/"
            if preview:
                page = f"{base}{code}/{b['slug']}/"
            bk = dict(b, page=page, gname=gt['name'], gdesc=gt['desc'], added=site.get('added', {}).get(b['id'], ''), sub=sub, sub_lang=sub_lang, size=size, short=short, video=vid, video_list=plist if vid else '', video_url=video_url, search=search, pdf=pdf, cover=cover, cover_fallback=cover_fallback, vol_label=vol_label, name=name, single=single, lv=lv)
            books.append(bk)
            if collect is not None:
                collect.append(bk)
            if pdf:
                items.append({'@type': 'Book', 'name': f"{vol_label + ' ' if vol_label else ''}{gt['name']}"
                              + (f" — {b['ko_sub']}" if b.get('ko_sub') else ''),
                              'inLanguage': ['ko', 'en' if code == '_root' else code],
                              'url': f"{site_url}/{'en' if code == '_root' else code}/{b['slug']}/", 'isAccessibleForFree': True,
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

    # 축: 시리즈를 학습 목적별로 묶는다. 축 이름은 site.json text.<코드>.axes 가 있으면 그것, 없으면 AX_TEXT
    _gt = guide_text(lv_code)
    axt = dict(AX_TEXT['en']); axt.update(AX_TEXT.get(lv_code, {}))
    if _gt:
        axt.update({k: [v[0], v[1], '' if v[2] == '-' else v[2], ''] for k, v in _gt['axes'].items()})
        t['ui'].update(_gt['v4'])
    gmap = {g['key']: g for g in groups}
    axes = []
    for ak, icon, gkeys in AXES:
        subs = [gmap[k] for k in gkeys if k in gmap and gmap[k]['books']]
        if not subs:
            continue
        lvs = sorted({b['lv']['step'] for x in subs for b in x['books'] if b['lv'] and b['lv']['key'] != 'all'})
        axes.append(dict(key=ak, icon=icon, name=axt[ak][0], desc=axt[ak][1], who=axt[ak][2], why=axt[ak][3], link=AX_LINK.get(ak, ''), ko=AX_TEXT['ko'][ak][0], groups=subs,
                         n=sum(len(x['books']) for x in subs), lvs=lvs, minor=(ak == 'more')))

    itemlist = {'@type': 'ItemList', 'name': t['title'],
              'url': page_url, 'numberOfItems': len(items),
              'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': it}
                                  for i, it in enumerate(items)]}
    website = {'@type': 'WebSite', '@id': site_url + '/#website', 'name': 'EPIC21',
               'alternateName': ['EPIC21 Korean', 'EPIC21 무료 한국어 교재'], 'url': site_url + '/'}
    jsonld = {'@context': 'https://schema.org', '@graph': [website, itemlist]}

    alternates = [{'code': L['code'], 'url': f"{site_url}/{L['code']}/"} for L in site['langs']]

    levels = [level_info(L, lv_code) for L in LEVEL_ORDER
              if any(x.get('level') == L for x in site['books'])]
    lang_names = {L['code'].split('-')[0] if L['code'] != 'zh-Hans' else 'zh-Hans': L['name'] for L in site['langs']}

    _G = load_guides()
    guides = ([{'key': k, 'title': _gt[k]['title'], 'short': _gt[k]['short']} for k in _G['order']], _gt['ui']) if _gt else None
    for A in axes:
        A['guide'] = bool(_gt) and A['key'] in _G['order']
    tpl = env.get_template('template.html')
    return tpl.render(guides=guides, guide_base=('en/' if is_root else ''), 
        lang=lang, t=t, is_root=is_root, base=base, page_url=page_url, site_url=site_url,
        og_image=og_image, og_locale=OG_LOCALE.get(code, 'en_US'),
        level_names={L['key']: L['ko'] + ('' if code == 'ko' else ' ' + L['word']) for L in levels}, goatcounter=site.get('goatcounter', ''), qrname=('root' if is_root else lang['code']), youtube_sub=site['youtube'].rstrip('/') + '?sub_confirmation=1', alternates=alternates, langs=site['langs'], groups=groups, tiers=tiers, axes=axes, book_count=count, preview=preview,
        youtube=site['youtube'], archive_user=site['archive_user'], license=site['license'],
        about_ko=T['ko']['about'], levels=levels, lang_names=lang_names,
        app_ko={k: T['ko']['ui'][k] for k in APP_KEYS + PC_KEYS},
        app_ko_pc={k: T['ko']['ui'][k] for k in PC_KEYS},
        pc_ui={k: t['ui'][k] for k in PC_KEYS},
        jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'),
    )


BOOK_FREE = {  # 상세 페이지 제목에 붙는 "무료 PDF 교재" — 없으면 영어
    'en': 'Free Korean textbook (PDF)', 'ko': '무료 한국어 교재 (PDF)',
}


def build_book_pages(site, env, lang, books):
    """교재 × 언어 상세 페이지: /<언어>/<slug>/index.html — 짝 영상이 맨 위, 그다음 PDF."""
    site_url = site['site_url'].rstrip('/')
    code = lang['code']
    T = site['text']
    t = json.loads(json.dumps(T.get(code, T['en'])))
    ui = dict(UI_NEW['en']); ui.update(UI_NEW.get(code, {})); ui.update(t['ui']); t['ui'] = ui
    free = t['title'].split(' — ')[0].split(' | ')[0].strip()
    tpl = env.get_template('book.html')
    lic_url = 'https://creativecommons.org/licenses/by-nc-nd/4.0/'
    for i, b in enumerate(books):
        d = os.path.join(HERE, code, b['slug'])
        os.makedirs(d, exist_ok=True)
        page_url = f"{site_url}/{code}/{b['slug']}/"
        ko_name = b['ko']
        sub = b['sub'] or b.get('en_sub') or b.get('en', '')
        title = f"{ko_name} — {sub} | {free} | EPIC21" if sub else f"{ko_name} | {free} | EPIC21"
        desc = (f"{sub}. " if sub else '') + b['gdesc']
        cover_abs = f"{site_url}/covers/{b['id']}/{lang['file']}.jpg" if cover_exists(b['id'], lang['file']) else ''
        alternates = [{'code': L['code'], 'url': f"{site_url}/{L['code']}/{b['slug']}/", 'name': L['name']} for L in site['langs']]
        node = {'@type': ['Book', 'LearningResource'], 'name': ko_name + (f' — {sub}' if sub else ''),
                'url': page_url, 'inLanguage': ['ko', code], 'isAccessibleForFree': True, 'license': lic_url,
                'learningResourceType': 'Textbook', 'educationalUse': 'Self-study',
                'teaches': 'Korean language', 'bookFormat': 'https://schema.org/EBook',
                'author': {'@type': 'Organization', 'name': 'EPIC21', 'url': site['youtube']},
                'publisher': {'@type': 'Organization', 'name': 'EPIC21', 'url': site_url + '/'},
                'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD', 'availability': 'https://schema.org/InStock'}}
        if b['lv']:
            node['educationalLevel'] = b['lv']['word'] + ' / ' + b['lv']['ko']
        if cover_abs:
            node['image'] = cover_abs
        if b['pdf']:
            node['encoding'] = {'@type': 'MediaObject', 'contentUrl': b['pdf'], 'encodingFormat': 'application/pdf'}
        if b['video']:
            node['subjectOf'] = {'@type': 'VideoObject', 'name': ko_name, 'description': sub or ko_name,
                                 'embedUrl': f"https://www.youtube.com/embed/{b['video']}",
                                 'url': f"https://www.youtube.com/watch?v={b['video']}",
                                 'thumbnailUrl': f"https://i.ytimg.com/vi/{b['video']}/hqdefault.jpg"}
        crumbs = {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'EPIC21', 'item': site_url + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': lang['name'], 'item': f"{site_url}/{code}/"},
            {'@type': 'ListItem', 'position': 3, 'name': ko_name, 'item': page_url}]}
        jsonld = {'@context': 'https://schema.org', '@graph': [node, crumbs]}
        others = [x for x in books if x['group'] == b['group'] and x['slug'] != b['slug']][:6]
        html_out = tpl.render(lang=lang, t=t, b=b, title=title, desc=desc, page_url=page_url, site_url=site_url,
                              alternates=alternates, cover_abs=cover_abs, og_locale=OG_LOCALE.get(code, 'en_US'),
                              others=others, goatcounter=site.get('goatcounter', ''),
                              youtube_sub=site['youtube'].rstrip('/') + '?sub_confirmation=1', youtube=site['youtube'],
                              license=site['license'], lic_url=lic_url,
                              jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'))
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(html_out)
    return len(books)


def load_guides():
    with open(os.path.join(HERE, 'guides.json'), encoding='utf-8') as f:
        G = json.load(f)
    G.pop('text', None)
    return G


def guide_text(code):
    import guides_tool
    return guides_tool.load_lang(code)


def build_guides(site, env, lang, outdir, home, preview=False):
    """시험·제도 안내 페이지: <outdir>/guide/<주제>/index.html. 그 언어 본문이 없으면 만들지 않는다."""
    G = load_guides(); code = lang['code']; tx = guide_text(code)
    if not tx:
        return []
    site_url = site['site_url'].rstrip('/'); tpl = env.get_template('guide.html'); made = []
    for key in G['order']:
        g = tx[key]; d = os.path.join(outdir, 'guide', key); os.makedirs(d, exist_ok=True)
        page_url = f"{site_url}/{code}/guide/{key}/"
        alternates = [{'code': L['code'], 'url': f"{site_url}/{L['code']}/guide/{key}/"} for L in site['langs'] if guide_text(L['code'])]
        jsonld = {'@context': 'https://schema.org', '@type': 'Article', 'headline': g['title'], 'description': g['lead'],
                  'inLanguage': code, 'dateModified': G['checked'], 'url': page_url,
                  'author': {'@type': 'Organization', 'name': 'EPIC21'}, 'publisher': {'@type': 'Organization', 'name': 'EPIC21'}}
        out = tpl.render(lang=lang, g=g, u=tx['ui'], key=key, links=G['links'][key], checked=G['checked'], home=home,
                         others=[{'key': k, 'title': tx[k]['title']} for k in G['order'] if k != key],
                         page_url=page_url, site_url=site_url, alternates=alternates, preview=preview,
                         goatcounter=site.get('goatcounter', ''), jsonld=json.dumps(jsonld, ensure_ascii=False).replace('</', '<\\/'))
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(out)
        made.append(page_url)
    return made


def main():
    site = load()
    if '--refresh-files' in sys.argv:
        print('아카이브에서 파일 목록 갱신')
        refresh_files(site)

    env = Environment(loader=FileSystemLoader(HERE), autoescape=select_autoescape(['html']))
    site_url = site['site_url'].rstrip('/')
    if '--preview' in sys.argv:
        en_l = next(L for L in site['langs'] if L['code'] == 'en')
        for L in [en_l, dict(en_l, code='ko', name='한국어', en='Korean', ko='한국어')]:
            d = os.path.join(HERE, 'preview', L['code']); os.makedirs(d, exist_ok=True)
            out = build_page(site, env, L, False, preview=True)
            out = out.replace('href="../', 'href="../../').replace('src="../', 'src="../../').replace("'../sw.js'", "'../../sw.js'").replace('"../sw.js"', '"../../sw.js"')
            with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(out)
            print('preview/' + L['code'] + '/index.html')
            build_guides(site, env, L, d, '../../', preview=True)
        return

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
    book_urls = []
    for L in site['langs']:
        d = os.path.join(HERE, L['code'])
        os.makedirs(d, exist_ok=True)
        got = []
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(build_page(site, env, L, False, collect=got))
        urls.append(f"{site_url}/{L['code']}/")
        print(f"{L['code']}/index.html")
        urls += build_guides(site, env, L, d, '../../')
        n = build_book_pages(site, env, L, got)
        book_urls += [f"{site_url}/{L['code']}/{b['slug']}/" for b in got]
        print(f"  {L['code']}/<교재>/ ×{n}")
    urls += book_urls

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
