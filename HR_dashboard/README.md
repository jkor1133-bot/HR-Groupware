# HR Dashboard

인사팀을 위한 **주간업무계획 대시보드**입니다.
비전공자도 바이브코딩으로 기능을 계속 키워 갈 수 있게 구성했습니다.

## 지금 되는 것

- 주차별 업무 목록 보기 (지난주 / 이번 주 / 다음주)
- 업무 추가 · 수정 · 삭제
- 담당자 · 상태 필터
- 진행 요약 (전체 / 예정 / 진행 중 / 지연)
- JSON 내보내기 · 불러오기 (팀 공유·히스토리 백업)
- 샘플 인사팀 데이터 자동 제공

## 폴더 안내

```
HR_dashboard/
├── docs/                 # 시작 가이드, 작성 요령 (한글)
├── materials/            # CSV 템플릿, 샘플 JSON
├── src/                  # 대시보드 앱 코드
└── README.md
```

## 실행 방법

```bash
cd cursor_project/HR_dashboard
npm install
npm run dev
```

브라우저에서 [http://127.0.0.1:4321](http://127.0.0.1:4321) 을 엽니다.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- 브라우저 localStorage (서버/DB 없이 바로 사용)

## 다음 업그레이드 후보

구성원 관리, 채용 파이프라인, 교육·온보딩 체크리스트, 주간 히스토리 아카이브
