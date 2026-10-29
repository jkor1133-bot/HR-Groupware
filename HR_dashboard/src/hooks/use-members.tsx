"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_MEMBERS } from "@/data/seed";
import {
  ALL_MENU_HREFS,
  DEFAULT_MEMBER_MENUS,
  ensureHomeMenu,
} from "@/lib/app-menus";
import type { TeamMember } from "@/lib/types";

/** v4: 이메일 미연동 → 가입 대기 상태 보정 */
const STORAGE_KEY = "hr-dashboard-members-v4";
const LEGACY_KEYS = [
  "hr-dashboard-members-v3",
  "hr-dashboard-members-v2",
  "hr-dashboard-members-v1",
];

function normalize(m: TeamMember): TeamMember {
  const isAdmin = Boolean(m.isAdmin);
  const email = (m.email ?? "").trim();
  const status =
    m.status ??
    (email ? "active" : "pending");
  return {
    ...m,
    email,
    status,
    createdAt: m.createdAt ?? new Date().toISOString(),
    isAdmin,
    allowedMenus: isAdmin
      ? [...ALL_MENU_HREFS]
      : ensureHomeMenu(
          m.allowedMenus?.length ? m.allowedMenus : DEFAULT_MEMBER_MENUS,
        ),
  };
}

/** 이메일이 없는데 활성으로만 남아 있던 시드 명단 → 가입 대기로 */
function applyLinkStatusMigration(list: TeamMember[]): TeamMember[] {
  return list.map((m) => {
    const email = (m.email ?? "").trim();
    if (!email && (m.status ?? "active") === "active") {
      return normalize({ ...m, email: "", status: "pending" });
    }
    return normalize(m);
  });
}

/** 시드 기준으로 관리자·기본 메뉴를 보정 (이대현=관리자) */
function applySeedPermissions(list: TeamMember[]): TeamMember[] {
  const seedById = Object.fromEntries(SEED_MEMBERS.map((s) => [s.id, s]));
  const seedByName = Object.fromEntries(
    SEED_MEMBERS.map((s) => [s.name.trim(), s]),
  );

  return list.map((m) => {
    const seed = seedById[m.id] ?? seedByName[m.name.trim()];
    if (!seed) return normalize(m);
    return normalize({
      ...m,
      isAdmin: seed.isAdmin,
      allowedMenus: seed.isAdmin
        ? [...ALL_MENU_HREFS]
        : [...(seed.allowedMenus ?? DEFAULT_MEMBER_MENUS)],
    });
  });
}

function load(): TeamMember[] {
  if (typeof window === "undefined") return SEED_MEMBERS.map(normalize);
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      LEGACY_KEYS.map((k) => window.localStorage.getItem(k)).find(Boolean);
    if (!raw) return SEED_MEMBERS.map(normalize);
    const parsed = JSON.parse(raw) as TeamMember[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_MEMBERS.map(normalize);
    }
    const hasCurrent = Boolean(window.localStorage.getItem(STORAGE_KEY));
    if (hasCurrent) return parsed.map(normalize);
    // 구버전: 메뉴 권한 시드 보정 + 이메일 없는 활성 → 가입 대기
    return applyLinkStatusMigration(applySeedPermissions(parsed));
  } catch {
    return SEED_MEMBERS.map(normalize);
  }
}

type MembersContextValue = {
  hydrated: boolean;
  members: TeamMember[];
  upsert: (member: TeamMember) => void;
  remove: (id: string) => void;
  resetToSeed: () => void;
  replaceAll: (next: TeamMember[]) => void;
};

const MembersContext = createContext<MembersContextValue | null>(null);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = load();
    setMembers(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setHydrated(true);
  }, []);

  const persist = useCallback((next: TeamMember[]) => {
    const normalized = next.map(normalize);
    setMembers(normalized);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const upsert = useCallback((member: TeamMember) => {
    const next = normalize(member);
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === next.id);
      const list = exists
        ? prev.map((m) => (m.id === next.id ? next : m))
        : [...prev, next];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMembers((prev) => {
      const list = prev.filter((m) => m.id !== id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    });
  }, []);

  const resetToSeed = useCallback(() => {
    persist(SEED_MEMBERS.map(normalize));
  }, [persist]);

  const value = useMemo(
    () => ({
      hydrated,
      members,
      upsert,
      remove,
      resetToSeed,
      replaceAll: persist,
    }),
    [hydrated, members, upsert, remove, resetToSeed, persist],
  );

  return (
    <MembersContext.Provider value={value}>{children}</MembersContext.Provider>
  );
}

export function useMembers() {
  const ctx = useContext(MembersContext);
  if (!ctx) {
    throw new Error("useMembers must be used within MembersProvider");
  }
  return ctx;
}
