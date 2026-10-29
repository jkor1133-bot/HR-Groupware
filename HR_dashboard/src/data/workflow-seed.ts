import type { WorkflowBundle, WorkflowProcess } from "@/lib/types";

function processes(now: string): WorkflowProcess[] {
  return [
  {
    id: "wf1",
    name: "채용 → 입사 온보딩",
    category: "채용",
    description: "채용 확정부터 Day1 온보딩까지 인수인계용 표준 프로세스",
    updatedAt: now,
    steps: [
      {
        id: "s1",
        title: "처우 협의·입사 확정",
        ownerId: "m1",
        dueLabel: "D-14",
        status: "done",
        stage: 1,
      },
      {
        id: "s2",
        title: "근로계약·구비서류 안내",
        ownerId: "m2",
        dueLabel: "D-10",
        status: "done",
        stage: 2,
      },
      {
        id: "s3",
        title: "계정·장비·좌석 신청",
        ownerId: "m5",
        dueLabel: "D-5",
        status: "done",
        stage: 3,
      },
      {
        id: "s4",
        title: "Day1 체크리스트 실행",
        ownerId: "m3",
        dueLabel: "D-Day",
        status: "in_progress",
        stage: 4,
      },
      {
        id: "s5",
        title: "필수 교육 배정",
        ownerId: "m4",
        dueLabel: "D+3",
        status: "planned",
        stage: 4,
      },
      {
        id: "s6",
        title: "온보딩 피드백 수집",
        ownerId: "m2",
        dueLabel: "D+14",
        status: "planned",
        stage: 4,
      },
    ],
  },
  {
    id: "wf2",
    name: "퇴직 정산 프로세스",
    category: "퇴직",
    description: "퇴직 신청부터 정산·계정 회수까지",
    updatedAt: now,
    steps: [
      {
        id: "r1",
        title: "퇴직 신청 접수",
        ownerId: "m2",
        dueLabel: "D-30",
        status: "done",
        stage: 1,
      },
      {
        id: "r2",
        title: "인수인계 체크리스트",
        ownerId: "m1",
        dueLabel: "D-14",
        status: "in_progress",
        stage: 2,
      },
      {
        id: "r3",
        title: "계정·자산 회수",
        ownerId: "m5",
        dueLabel: "D-1",
        status: "planned",
        stage: 3,
      },
      {
        id: "r4",
        title: "급여·퇴직금 정산",
        ownerId: "m5",
        dueLabel: "D+7",
        status: "planned",
        stage: 4,
      },
    ],
  },
  {
    id: "wf3",
    name: "월간 급여 마감",
    category: "급여",
    description: "월중 변동분 검토부터 급여 확정까지",
    updatedAt: now,
    steps: [
      {
        id: "p1",
        title: "변동분 취합",
        ownerId: "m5",
        dueLabel: "매월 15일",
        status: "done",
        stage: 1,
      },
      {
        id: "p2",
        title: "1차 검토",
        ownerId: "m5",
        dueLabel: "매월 18일",
        status: "done",
        stage: 2,
      },
      {
        id: "p3",
        title: "팀장 승인",
        ownerId: "m1",
        dueLabel: "매월 20일",
        status: "delayed",
        stage: 3,
      },
      {
        id: "p4",
        title: "급여 이체·명세서",
        ownerId: "m5",
        dueLabel: "매월 25일",
        status: "planned",
        stage: 4,
      },
    ],
  },
];
}

export function buildWorkflowSeed(): WorkflowBundle {
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    processes: processes(now),
  };
}
