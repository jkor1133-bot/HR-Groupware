import { buildMockNotices } from "@/data/notices";
import { fetchAllDoorayNotices } from "@/lib/dooray";

/**
 * 사내 공지 피드
 *
 * 우선순위:
 * 1) DOORAY_API_TOKEN 이 있으면 Dooray 홈 게시판(회사/그룹) 연동
 * 2) GROUPWARE_NOTICES_URL 이 있으면 범용 JSON 피드
 * 3) 없으면 샘플 데이터
 *
 * 클라이언트는 10분마다 이 API를 폴링합니다.
 */
export async function GET() {
  const fetchedAt = new Date().toISOString();
  const doorayToken = process.env.DOORAY_API_TOKEN?.trim();

  if (doorayToken) {
    try {
      const { items, errors } = await fetchAllDoorayNotices(doorayToken);

      if (items.length === 0 && errors.length > 0) {
        return Response.json({
          items: buildMockNotices(),
          fetchedAt,
          source: "mock-fallback",
          warning: errors.join(" | "),
          hint: "토큰은 정상입니다. Dooray 조직 관리자에게 Project·Wiki 서비스 API 허용을 요청하세요.",
        });
      }

      return Response.json({
        items,
        fetchedAt,
        source: "dooray",
        warning: errors.length ? errors.join(" | ") : undefined,
      });
    } catch (error) {
      return Response.json({
        items: buildMockNotices(),
        fetchedAt,
        source: "mock-fallback",
        warning:
          error instanceof Error
            ? error.message
            : "Dooray 연동에 실패해 샘플 공지를 표시합니다.",
      });
    }
  }

  const upstream = process.env.GROUPWARE_NOTICES_URL;
  if (upstream) {
    try {
      const res = await fetch(upstream, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Upstream ${res.status}`);
      const data = (await res.json()) as { items?: unknown };
      const items = Array.isArray(data.items) ? data.items : data;
      return Response.json({
        items,
        fetchedAt,
        source: "groupware",
      });
    } catch (error) {
      return Response.json({
        items: buildMockNotices(),
        fetchedAt,
        source: "mock-fallback",
        warning:
          error instanceof Error
            ? error.message
            : "그룹웨어 연동에 실패해 샘플 공지를 표시합니다.",
      });
    }
  }

  return Response.json({
    items: buildMockNotices(),
    fetchedAt,
    source: "mock",
    note: "DOORAY_API_TOKEN 을 .env.local 에 설정하면 Dooray 회사/그룹 게시판과 연동됩니다.",
  });
}
