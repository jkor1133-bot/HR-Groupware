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
import { useMembers } from "@/hooks/use-members";
import type { TeamMember } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-current-member-v2";

type CurrentUserValue = {
  hydrated: boolean;
  currentMember: TeamMember | null;
  isAdmin: boolean;
  setCurrentMemberId: (id: string) => void;
};

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { members, hydrated: membersHydrated } = useMembers();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!membersHydrated || members.length === 0) return;

    const admin = members.find((m) => m.isAdmin);
    const preferred =
      members.find((m) => m.name === "이대현") ?? admin ?? members[0];

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const exists = saved ? members.some((m) => m.id === saved) : false;
      if (exists && saved) {
        setMemberId(saved);
      } else {
        const fallback = preferred?.id ?? null;
        setMemberId(fallback);
        if (fallback) window.localStorage.setItem(STORAGE_KEY, fallback);
      }
    } catch {
      setMemberId(preferred?.id ?? null);
    }
    setReady(true);
  }, [membersHydrated, members]);

  const setCurrentMemberId = useCallback((id: string) => {
    setMemberId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const currentMember = useMemo(
    () => members.find((m) => m.id === memberId) ?? null,
    [members, memberId],
  );

  const value = useMemo<CurrentUserValue>(
    () => ({
      hydrated: membersHydrated && ready,
      currentMember,
      isAdmin: Boolean(currentMember?.isAdmin),
      setCurrentMemberId,
    }),
    [membersHydrated, ready, currentMember, setCurrentMemberId],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}
