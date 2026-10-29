import type { NoticeItem } from "@/lib/types";
import { formatYmd } from "@/lib/week";

/** Mock groupware notices. Replace fetch source via GROUPWARE_NOTICES_URL. */
export function buildMockNotices(now = new Date()): NoticeItem[] {
  const today = formatYmd(now);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = (offset: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - offset);
    return formatYmd(dt);
  };

  return [
    {
      id: "n1",
      board: "회사",
      title: `${y}년 ${Number(m)}월 주간 식단표 안내`,
      date: today,
    },
    {
      id: "n2",
      board: "인사총무",
      title: "인사총무팀 공지사항 — 연차 사용 독려 안내",
      date: today,
    },
    {
      id: "n3",
      board: "그룹",
      title: "그룹사 공통 — 정보보안 교육 이수 마감 안내",
      date: d(1),
    },
    {
      id: "n4",
      board: "차세대ERP",
      title: "차세대 ERP 사용자 교육 일정 공지",
      date: d(1),
    },
    {
      id: "n5",
      board: "회사",
      title: "사내 주차 규정 변경 안내",
      date: d(2),
    },
    {
      id: "n6",
      board: "인사총무",
      title: "건강검진 예약 기간 연장 안내",
      date: d(3),
    },
    {
      id: "n7",
      board: "그룹",
      title: "그룹 공통 — 명절 연휴 근무 일정 공유",
      date: d(4),
    },
    {
      id: "n8",
      board: "회사",
      title: "사내 카페테리아 운영시간 조정",
      date: d(5),
    },
  ];
}
