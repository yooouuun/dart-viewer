# DART 공시 재무제표 비교 조회 시스템

금융감독원 DART OpenAPI 기반 기업 재무제표 통합 비교 조회 서비스

## 구조

```
src/worker.js    ← Cloudflare Worker (API 프록시)
public/          ← 정적 파일 (프론트엔드)
wrangler.toml    ← Cloudflare 설정
```

## 배포

GitHub 연동 후 자동 배포. Deploy command: `npx wrangler deploy`
