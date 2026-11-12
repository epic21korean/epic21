# EPIC21 교재 허브 — 작업 방법

## 파일 구성
| 파일 | 역할 |
|---|---|
| `site.json` | **유일한 편집 대상.** 교재 목록(books)·아카이브 파일명(files)·20개 언어 문구(text) |
| `template.html` | 첫 화면과 언어별 페이지가 공유하는 틀 (디자인 손볼 때만) |
| `build.py` | `site.json` → `index.html`, `<코드>/index.html` ×20, `sitemap.xml`, `robots.txt` |
| `make_covers.py` | 로컬 PDF 1쪽 → `covers/<id>/<Language>.jpg` 썸네일, `og.png`·`og/<코드>.png` 공유 이미지 |
| `covers/`, `og/`, `og.png` | 생성물. 커밋해서 올린다 |

## 처음 한 번
```bash
pip install jinja2 pillow pymupdf
python3 make_covers.py --pdf-dir /교재PDF가/있는/폴더     # 표지 400장 + OG 이미지
python3 build.py
git add -A && git commit -m "hub v2" && git push
```
그다음 Google Search Console 에 `https://epic21korean.github.io/epic21/` 등록 →
사이트맵 `https://epic21korean.github.io/epic21/sitemap.xml` 제출.

## 교재를 새로 올렸을 때
1. 아카이브 업로드가 끝난 뒤 `site.json` 의 `"books"` 끝에 한 덩어리 추가
   ```json
   {"id":"epic21-…","group":"mv1","slug":"…","ko":"뮤직비디오로 배우는 TOPIK I · 제11편 …","en":"…","vol":11,"ko_sub":"…","en_sub":"…"}
   ```
   `group` 은 core / dlg / wrt / mv2 / mv1 중 하나. 새 묶음이 필요하면 `"groups"` 와 각 언어 `text.<코드>.groups` 에 이름·설명을 더한다.
2. `python3 build.py --refresh-files` (아카이브에서 파일명을 읽어 와 `files` 갱신 후 생성)
3. `python3 make_covers.py --pdf-dir …` (새 표지만 추가로 만든다)
4. 커밋·푸시

## 영상 고정 댓글에 쓸 주소
- 언어별 페이지가 생겼으니 **루트보다 언어 페이지**를 붙이는 편이 좋다.
  - 베트남어권: `https://epic21korean.github.io/epic21/vi/`
  - 특정 교재를 맨 위에: `https://epic21korean.github.io/epic21/vi/#two-hands`
- 기존 `…/epic21/#two-hands` 형식도 그대로 동작한다 (첫 화면은 영어 목록).
- 페이스북·메신저에 붙이면 `og.png`(언어별 이미지가 있으면 `og/vi.png`) 가 미리보기로 뜬다.
  이미 한 번 붙였던 주소는 페이스북 캐시 때문에 이전 모습이 남을 수 있다 → Sharing Debugger 에서 "Scrape Again".

## 언어별 문구
`site.json` → `text.<코드>` 에 제목·설명·묶음 이름·버튼 문구가 있다.
번역은 초안이므로 각 언어판 교재의 실제 제목과 맞춰 고쳐 쓰면 된다. 특히 확인이 필요한 언어: km, my, si, bn, ne, ur.

## 허브 v3 (2026-11-10)
- 교재는 수준별 층(입문→초급→중급→고급→초급~고급)으로 나뉘어 보인다. 층은 site.json 각 교재의 "level" 값으로 정해진다. 수준 표시는 원고지 4칸(입문 1칸·초급 2칸·중급 3칸·고급 4칸, 칸 색 = 수준 색).
- 새 디자인: 원고지 제목, 큰 표지, 찾기 줄(검색·수준·시리즈), ♥ 담기, 최근 받은 교재, 공유, 밝은/어두운 화면, 첫 화면 내 언어 안내.
- 새 문구는 `site.json` → `text.<코드>.ui` 에 들어 있다 (없으면 `build.py` 의 `UI_NEW` 영어로 채운다).
- 교재 부제는 site.json 각 교재의 "tr": {"vi": "…", …} 에 언어별로 넣는다(없으면 영어).
- PDF 용량은 `python build.py --refresh-files` 때 아카이브에서 함께 읽어 site.json "sizes" 에 저장되고 버튼에 표시된다.
- 주의: 허브는 반드시 최신 저장소(문서\GitHub\epic21)를 바탕으로 고친다. 옛 사본으로 다시 만들면 새 기능·표지가 사라진다(2026-11-10 시리즈 4 추가 때 실제로 일어남). copy_to_repo.py 는 이제 covers·og 를 지우지 않고 덧붙이기만 한다.
- 입문 층: site.json "intro" 에 한글 첫걸음 영상 편을 추가하면(no·id·ko·key) 영상 칸이 늘어난다. 편 제목 번역은 text.<코드>.ui 의 key(예: ep_vowels)에 넣는다.
- 짝 영상 26권 연결(2026-11-10, videos.json 기준). 『한국어 필수 문법 완결판』은 짝 영상이 없어 채널 검색으로 연결.
- 교재에 짝 영상을 붙이려면 `site.json` 의 그 교재 덩어리에 `"video": "유튜브영상ID"` 한 줄을 넣고 `python build.py`.
  넣으면 ▶ 버튼이 허브 안에서 바로 재생되고, 없으면 채널 검색으로 연결된다.
- 홈 화면 앱: `icons/`(새 로고로 만든 아이콘), `sw.js`(저장본), 각 폴더의 `manifest.webmanifest`(build.py 가 만듦).
- 방문 통계: site.json `"goatcounter": "epic21korean"` → https://epic21korean.goatcounter.com 에서 본다. PDF 받기는 `pdf/교재/언어`, 영상 버튼은 `video/교재` 로 센다.
- 구독 권유: PDF 버튼을 누르면 아래에 구독 카드가 뜬다(구독 누르면 다시 안 뜸, 나중에 누르면 7일 뒤). PDF는 새 탭으로 열린다.
- 어디서부터 시작할까요?: 질문 2~3개로 수준을 골라 준다.
- NEW: 아카이브 공개일(site.json "added", --refresh-files 때 갱신)이 30일 이내인 교재.
- 공부 끝 체크: 표지 왼쪽 아래 ✓, 층 머리에 진도 표시(학습자 휴대폰에만 저장).
- QR: 위쪽 QR 버튼. `qr/<언어>.svg` 는 segno 가 있으면 build 때 새로 만든다(`pip install segno`), 없으면 있던 파일을 그대로 쓴다.
- 통계 행사 이름: pdf/교재/언어, video/교재, subscribe/언어, guide/결과, done/교재, qr/언어.

## 홈 화면 추가 안내 링크
- 주소 끝에 `?app` 을 붙여 보내면, 받은 사람의 휴대폰에 맞는 "홈 화면에 추가" 안내 창이 그 언어로 바로 열린다.
  - 예: `https://epic21korean.github.io/epic21/vi/?app` (베트남어), `https://epic21korean.github.io/epic21/mn/?app` (몽골어)
  - 특정 교재까지: `https://epic21korean.github.io/epic21/vi/?app#two-hands`
- 안드로이드 크롬 → 설치 버튼 / 아이폰 사파리 → 공유 → 홈 화면에 추가 3단계 그림 안내 /
  카카오톡·메신저·인스타그램·잘로 등 앱 안 브라우저 → "브라우저로 열기"(안드로이드는 크롬, 카카오톡은 외부 브라우저로 자동 전환) + 링크 복사
- 교사용(한국어 안내): 주소 끝을 `?app=ko` 로 — 예: `https://epic21korean.github.io/epic21/?app=ko`. 어느 언어 페이지에서든 안내 창 문구만 한국어로 바뀐다.
- 위쪽 설치 버튼도 이제 아이폰과 앱 안 브라우저에서 보인다(누르면 같은 안내 창).
- 문구는 `site.json` → `text.<코드>.ui` 의 `app_title … app_done`, `copylink`.
- 방문 통계(GoatCounter)에 `app/<언어>/<방식>` 으로 안내 창 열림·설치 선택이 기록된다.
