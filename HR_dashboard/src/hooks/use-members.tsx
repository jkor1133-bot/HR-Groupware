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

/** v3: 이대현 관리자 + 메뉴 권한 시드 재적용 */
const STORAGE_KEY = "hr-dashboard-members-v3";
const LEGACY_KEYS = [
  "hr-dashboard-members-v2",
  "hr-dashboard-members-v1",
];

function normalize(m: TeamMember): TeamMember {
  const isAdmin = Boolean(m.isAdmin);
  return {
    ...m,
    email: m.email ?? "",
    status: m.status ?? "active",
    createdAt: m.createdAt ?? new Date().toISOString(),
    isAdmin,
    allowedMenus: isAdmin
      ? [...ALL_MENU_HREFS]
      : ensureHomeMenu(
          m.allowedMenus?.length ? m.allowedMenus : DEFAULT_MEMBER_MENUS,
        ),
  };
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
    // v3 키가 없으면 시드 권한으로 한 번 보정
    const hasV3 = Boolean(window.localStorage.getItem(STORAGE_KEY));
    const next = hasV3
      ? parsed.map(normalize)
      : applySeedPermissions(parsed);
    return next;
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
