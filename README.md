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
