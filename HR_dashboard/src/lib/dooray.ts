import type { NoticeItem } from "@/lib/types";

const DOORAY_API = "https://api.dooray.com";
const DOORAY_WEB = "https://dhflour.dooray.com";

export type DoorayBoardConfig = {
  board: NoticeItem["board"];
  wikiId: string;
  pageId: string;
};

type DoorayWikiPage = {
  id?: string;
  subject?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  parentPageId?: string;
};

type DoorayListResponse = {
  header?: { isSuccessful?: boolean; resultMessage?: string };
  result?: DoorayWikiPage[] | DoorayWikiPage;
  totalCount?: number;
};

/** Parse Dooray home board URL: /home/{wikiId}/{pageId} */
export function parseDoorayHomeUrl(url: string): { wikiId: string; pageId: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // home / wikiId / pageId
    if (parts[0] === "home" && parts[1] && parts[2]) {
      return { wikiId: parts[1], pageId: parts[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function defaultDoorayBoards(): DoorayBoardConfig[] {
  const fromEnv = process.env.DOORAY_BOARDS_JSON;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as DoorayBoardConfig[];
    } catch {
      /* fall through */
    }
  }

  // 사용자가 공유한 회사/그룹 게시판 (기본값)
  return [
    {
      board: "회사",
      wikiId: "3605194988359895021",
      pageId: "3713887143854099106",
    },
    {
      board: "그룹",
      wikiId: "3970351201322657853",
      pageId: "4443724358787567270",
    },
  ];
}

function toYmd(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function doorayGet(path: string, token: string): Promise<DoorayListResponse> {
  const res = await fetch(`${DOORAY_API}${path}`, {
    headers: {
      Authorization: `dooray-api ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json()) as DoorayListResponse;
  const raw =
    data.header?.resultMessage ||
    (res.ok ? "" : `Dooray API ${res.status} (${path})`);

  if (!res.ok || data.header?.isSuccessful === false) {
    if (raw.includes("AUTH_FORBIDDEN_ACL_SERVICE_ERROR")) {
      throw new Error(
        "Dooray 관리자 설정으로 해당 서비스 API가 차단됨 (Project/Wiki API 허용 필요)",
      );
    }
    throw new Error(raw || "Dooray API 호출 실패");
  }
  return data;
}

/**
 * 홈 게시판(위키) 하위 페이지를 공지 목록으로 가져옵니다.
 * GET /wiki/v1/wikis/{wikiId}/pages?parentPageId={pageId}
 */
export async function fetchDoorayBoardNotices(
  token: string,
  config: DoorayBoardConfig,
  size = 15,
): Promise<NoticeItem[]> {
  const qs = new URLSearchParams({
    parentPageId: config.pageId,
    page: "0",
    size: String(size),
  });

  const data = await doorayGet(
    `/wiki/v1/wikis/${config.wikiId}/pages?${qs.toString()}`,
    token,
  );

  const pages = Array.isArray(data.result)
    ? data.result
    : data.result
      ? [data.result]
      : [];

  return pages.map((p) => {
    const id = String(p.id ?? "");
    return {
      id: id || `${config.board}-${p.subject ?? "untitled"}`,
      board: config.board,
      title: p.subject || p.title || "(제목 없음)",
      date: toYmd(p.updatedAt || p.createdAt),
      url: id
        ? `${DOORAY_WEB}/home/${config.wikiId}/${id}`
        : `${DOORAY_WEB}/home/${config.wikiId}/${config.pageId}`,
    };
  });
}

export async function fetchAllDoorayNotices(token: string): Promise<{
  items: NoticeItem[];
  boards: DoorayBoardConfig[];
  errors: string[];
}> {
  const boards = defaultDoorayBoards();
  const errors: string[] = [];
  const chunks = await Promise.all(
    boards.map(async (board) => {
      try {
        return await fetchDoorayBoardNotices(token, board);
      } catch (e) {
        errors.push(
          `${board.board}: ${e instanceof Error ? e.message : "조회 실패"}`,
        );
        return [] as NoticeItem[];
      }
    }),
  );

  const items = chunks
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return { items, boards, errors };
}
