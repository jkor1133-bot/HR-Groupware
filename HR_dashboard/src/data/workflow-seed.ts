import type { WorkflowBundle, WorkflowProcess } from "@/lib/types";

function processes(now: string): WorkflowProcess[] {
  return [
    {
      id: "wf1",
      name: "채용 → 입사 온보딩",
      domain: "hr",
      category: "채용",
      description: "채용 확정부터 Day1 온보딩까지 인수인계용 표준 프로세스",
      updatedAt: now,
      steps: [
        {
          id: "s1",
          title: "처우 협의·입사 확정",
          ownerId: "m1",
          dueLabel: "D-14",
          stage: 1,
        },
        {
          id: "s2",
          title: "근로계약·구비서류 안내",
          ownerId: "m2",
          dueLabel: "D-10",
          stage: 2,
        },
        {
          id: "s3",
          title: "계정·장비·좌석 신청",
          ownerId: "m5",
          dueLabel: "D-5",
          stage: 3,
        },
        {
          id: "s4",
          title: "Day1 체크리스트 실행",
          ownerId: "m3",
          dueLabel: "D-Day",
          stage: 4,
        },
        {
          id: "s5",
          title: "필수 교육 배정",
          ownerId: "m4",
          dueLabel: "D+3",
          stage: 4,
        },
        {
          id: "s6",
          title: "온보딩 피드백 수집",
          ownerId: "m2",
          dueLabel: "D+14",
          stage: 4,
        },
      ],
    },
    {
      id: "wf2",
      name: "퇴직 정산 프로세스",
      domain: "hr",
      category: "퇴직",
      description: "퇴직 신청부터 정산·계정 회수까지",
      updatedAt: now,
      steps: [
        {
          id: "r1",
          title: "퇴직 신청 접수",
          ownerId: "m2",
          dueLabel: "D-30",
          stage: 1,
        },
        {
          id: "r2",
          title: "인수인계 체크리스트",
          ownerId: "m1",
          dueLabel: "D-14",
          stage: 2,
        },
        {
          id: "r3",
          title: "계정·자산 회수",
          ownerId: "m5",
          dueLabel: "D-1",
          stage: 3,
        },
        {
          id: "r4",
          title: "급여·퇴직금 정산",
          ownerId: "m5",
          dueLabel: "D+7",
          stage: 4,
        },
      ],
    },
    {
      id: "wf3",
      name: "월간 급여 마감",
      domain: "ga",
      category: "급여",
      description: "월중 변동분 검토부터 급여 확정까지",
      updatedAt: now,
      steps: [
        {
          id: "p1",
          title: "변동분 취합",
          ownerId: "m5",
          dueLabel: "매월 15일",
          stage: 1,
        },
        {
          id: "p2",
          title: "1차 검토",
          ownerId: "m5",
          dueLabel: "매월 18일",
          stage: 2,
        },
        {
          id: "p3",
          title: "팀장 승인",
          ownerId: "m1",
          dueLabel: "매월 20일",
          stage: 3,
        },
        {
          id: "p4",
          title: "급여 이체·명세서",
          ownerId: "m5",
          dueLabel: "매월 25일",
          stage: 4,
        },
      ],
    },
    {
      id: "wf4",
      name: "인허가 갱신 프로세스",
      domain: "ga",
      category: "인허가",
      description: "만료 도래 인허가 점검부터 갱신·보관까지",
      updatedAt: now,
      steps: [
        {
          id: "g1",
          title: "만료 예정 목록 점검",
          ownerId: "m3",
          dueLabel: "매월 1일",
          stage: 1,
        },
        {
          id: "g2",
          title: "구비서류·수수료 준비",
          ownerId: "m4",
          dueLabel: "D-30",
          stage: 2,
        },
        {
          id: "g3",
          title: "관청 접수·결과 확인",
          ownerId: "m3",
          dueLabel: "D-14",
          stage: 3,
        },
        {
          id: "g4",
          title: "원본 보관·이력 등록",
          ownerId: "m4",
          dueLabel: "D+3",
          stage: 4,
        },
      ],
    },
    {
      id: "wf5",
      name: "업무용 차량 배정",
      domain: "ga",
      category: "차량",
      description: "배정 요청부터 보험·인수인계까지",
      updatedAt: now,
      steps: [
        {
          id: "v1",
          title: "배정 요청 접수",
          ownerId: "m3",
          dueLabel: "요청일",
          stage: 1,
        },
        {
          id: "v2",
          title: "차량·보험 상태 확인",
          ownerId: "m5",
          dueLabel: "D+2",
          stage: 2,
        },
        {
          id: "v3",
          title: "사용자 인수인계",
          ownerId: "m3",
          dueLabel: "D+5",
          stage: 3,
        },
      ],
    },
    {
      id: "wf6",
      name: "주간 운영 계획 수립",
      domain: "planning",
      category: "기획",
      description: "주간 목표 설정부터 공유·점검까지",
      updatedAt: now,
      steps: [
        {
          id: "pl1",
          title: "팀 이슈·우선순위 수집",
          ownerId: "m1",
          dueLabel: "매주 월",
          stage: 1,
        },
        {
          id: "pl2",
          title: "주간계획 초안 작성",
          ownerId: "m2",
          dueLabel: "매주 월",
          stage: 2,
        },
        {
          id: "pl3",
          title: "팀장 확정·공유",
          ownerId: "m1",
          dueLabel: "매주 화",
          stage: 3,
        },
      ],
    },
  ];
}

export function buildWorkflowSeed(): WorkflowBundle {
  const now = new Date().toISOString();
  return {
    version: 4,
    updatedAt: now,
    processes: processes(now).map((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        standardLabel: s.standardLabel ?? "",
        attachments: s.attachments ?? [],
        changeHistory: s.changeHistory ?? [],
      })),
    })),
  };
}
