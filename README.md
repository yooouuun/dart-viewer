# DART 공시 재무제표 비교 조회 시스템

금융감독원 전자공시시스템(DART) OpenAPI를 활용한 기업 재무제표 통합 비교 조회 서비스입니다.

## 주요 기능

- **다중 기업 비교**: 최대 5개 기업을 동시 선택하여 재무제표 비교
- **분기별 조회**: 1분기~사업보고서까지 원하는 기간 선택
- **주요 지표 / 전체 재무제표 토글**: 핵심 지표와 전체 계정과목 전환
- **손익 분석 지표**: 매출, 영업이익, 인건비, 판관비 등 포함
- **누적값 표시**: 분기보고서의 경우 해당 분기까지 누적값 사용
- **단일(별도) 재무제표 기준**: OFS 기준으로 조회
- **보고서 원본 링크**: DART 원문 보고서 바로가기
- **조회 히스토리**: 최근 3건 자동 저장 (중복 제거)
- **수익성 지표 자동 계산**: 영업이익률, 순이익률, 부채비율

## 아키텍처

```
[브라우저] → [Cloudflare Pages] → [Pages Functions (API Proxy)] → [DART OpenAPI]
```

- **프론트엔드**: 정적 HTML/CSS/JS (프레임워크 없음, `public/` 디렉터리)
- **백엔드**: Cloudflare Pages Functions (`functions/` 디렉터리)
  - DART API는 CORS를 지원하지 않으므로, Pages Functions가 서버사이드 프록시 역할
- **배포**: Cloudflare Pages (GitHub 연동 자동 빌드/배포)

## 사용하는 DART API

| API | 용도 |
|-----|------|
| `fnlttSinglAcntAll.json` | 단일회사 전체 재무제표 (모든 계정과목) |
| `fnlttSinglAcnt.json` | 단일회사 주요계정 (폴백용) |
| `corpCode.xml` | 기업 고유번호 목록 |

## 배포 방법

### 1. GitHub 저장소 생성 & 코드 Push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dart-viewer.git
git push -u origin main
```

### 2. Cloudflare Pages 연동

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHub 저장소 선택 (`dart-viewer`)
4. 빌드 설정:
   - **Build command**: (비워두기 - 정적 파일이므로 빌드 불필요)
   - **Build output directory**: `public`
5. **환경 변수** 설정:
   - `DART_API_KEY` = `a9a1b6d42a2414cc31a9f0f809369d8eab15a2ba`
6. **Save and Deploy**

### 3. 환경 변수 (API Key 관리)

API Key는 두 가지 방식으로 관리 가능합니다:

**방법 A: Cloudflare 환경 변수 (권장)**
- Cloudflare Dashboard → Pages 프로젝트 → Settings → Environment variables
- `DART_API_KEY` 추가

**방법 B: wrangler.toml 하드코딩**
- `wrangler.toml` 파일의 `[vars]` 섹션에 직접 기재
- ⚠️ GitHub에 push되므로 공개 저장소에서는 비권장

### 로컬 개발

```bash
# wrangler 설치
npm install -g wrangler

# 로컬 서버 실행
npx wrangler pages dev ./public --port 8788
```

## 디렉터리 구조

```
dart-viewer/
├── public/
│   └── index.html          # 프론트엔드 (SPA)
├── functions/
│   └── api/
│       └── [[path]].js     # Cloudflare Pages Function (DART API 프록시)
├── wrangler.toml            # Cloudflare 설정
├── package.json
├── .gitignore
└── README.md
```

## 참고

- [DART OpenAPI 개발가이드](https://opendart.fss.or.kr/guide/main.do)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)

## 라이선스

MIT
