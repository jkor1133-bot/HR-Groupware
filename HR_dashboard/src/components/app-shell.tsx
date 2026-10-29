"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  CalendarDays,
  ClipboardList,
  FolderKanban,
  GitBranch,
  Home,
  Monitor,
  Moon,
  Search,
  Settings2,
  Shield,
  Smartphone,
  Sun,
  Table2,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { BrandHomeLink } from "@/components/brand-home-link";
import { NotificationsBell } from "@/components/notifications-bell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMembers } from "@/hooks/use-members";
import { useViewPrefs } from "@/hooks/use-view-prefs";
import {
  APP_MENUS,
  canAccessMenu,
  type AppMenuId,
} from "@/lib/app-menus";
import { cn } from "@/lib/utils";

const MENU_ICONS: Record<AppMenuId, LucideIcon> = {
  "/": Home,
  "/calendar": CalendarDays,
  "/weekly-plans": ClipboardList,
  "/hr-records": FolderKanban,
  "/raci": Table2,
  "/workflows": GitBranch,
  "/members": Users,
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function ViewToolbar() {
  const {
    theme,
    viewMode,
    fontScale,
    toggleTheme,
    setViewMode,
    bumpFont,
    setFontScale,
  } = useViewPrefs();
  const isMobile = viewMode === "mobile";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md bg-white/10 p-0.5",
        !isMobile && "sm:gap-1 sm:p-1",
      )}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs transition hover:bg-white/15"
        title="다크 모드"
      >
        {theme === "dark" ? (
          <Moon className="size-3.5" />
        ) : (
          <Sun className="size-3.5" />
        )}
        {!isMobile ? (
          <span className="hidden lg:inline">
            {theme === "dark" ? "다크" : "라이트"}
          </span>
        ) : null}
      </button>
      {!isMobile ? <span className="hidden h-4 w-px bg-white/20 sm:block" /> : (
        <span className="h-4 w-px bg-white/20" />
      )}
      <button
        type="button"
        onClick={() => setViewMode("pc")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs transition",
          viewMode === "pc" ? "bg-white/20" : "hover:bg-white/15",
        )}
        title="PC 보기"
      >
        <Monitor className="size-3.5" />
        {!isMobile ? <span className="hidden xl:inline">PC</span> : null}
      </button>
      <button
        type="button"
        onClick={() => setViewMode("mobile")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs transition",
          viewMode === "mobile" ? "bg-white/20" : "hover:bg-white/15",
        )}
        title="모바일 보기"
      >
        <Smartphone className="size-3.5" />
        {!isMobile ? <span className="hidden xl:inline">모바일</span> : null}
      </button>
      <span className="h-4 w-px bg-white/20" />
      <button
        type="button"
        onClick={() => bumpFont(-10)}
        className="rounded px-1 py-1 text-xs hover:bg-white/15"
        aria-label="글자 작게"
      >
        A-
      </button>
      {!isMobile ? (
        <button
          type="button"
          onClick={() => setFontScale(100)}
          className="hidden rounded px-1.5 py-1 text-[11px] tabular-nums hover:bg-white/15 sm:inline"
        >
          {fontScale}%
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => bumpFont(10)}
        className="rounded px-1 py-1 text-xs hover:bg-white/15"
        aria-label="글자 크게"
      >
        A+
      </button>
    </div>
  );
}

function CurrentUserChip() {
  const { members, hydrated } = useMembers();
  const { currentMember, isAdmin, setCurrentMemberId } = useCurrentUser();
  const menuCount = isAdmin
    ? APP_MENUS.length
    : (currentMember?.allowedMenus?.length ?? 0);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 rounded-md px-1.5 py-1 sm:px-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-dh-real text-xs font-semibold">
          <UserRound className="size-4" />
        </div>
        <p className="hidden text-xs text-white/70 sm:block">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1 sm:px-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-dh-real text-xs font-semibold">
        <UserRound className="size-4" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] text-white/60">현재 사용자</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className="max-w-[9.5rem] truncate rounded border-0 bg-white/10 px-1.5 py-0.5 text-sm font-medium text-white outline-none hover:bg-white/15"
            value={currentMember?.id ?? ""}
            onChange={(e) => setCurrentMemberId(e.target.value)}
            aria-label="현재 사용자 선택"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id} className="text-foreground">
                {m.name} · {m.role}
                {m.isAdmin ? " (관리자)" : ""}
              </option>
            ))}
          </select>
          {isAdmin ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white">
              <Shield className="size-2.5" />
              관리자
            </span>
          ) : (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
              메뉴 {menuCount}개
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function useVisibleMenus() {
  const { currentMember, isAdmin, hydrated } = useCurrentUser();
  return useMemo(() => {
    const base = !hydrated
      ? APP_MENUS
      : APP_MENUS.filter((m) =>
          canAccessMenu(isAdmin, currentMember?.allowedMenus, m.href),
        );
    return base.map((m) => ({
      ...m,
      icon: MENU_ICONS[m.href],
    }));
  }, [
    hydrated,
    isAdmin,
    currentMember?.id,
    currentMember?.isAdmin,
    currentMember?.allowedMenus,
  ]);
}

function useMenuGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentMember, isAdmin, hydrated } = useCurrentUser();

  useEffect(() => {
    if (!hydrated) return;
    if (pathname.startsWith("/settings")) return;
    const ok = canAccessMenu(
      isAdmin,
      currentMember?.allowedMenus,
      pathname,
    );
    if (!ok) router.replace("/");
  }, [
    hydrated,
    isAdmin,
    currentMember?.id,
    currentMember?.allowedMenus,
    pathname,
    router,
  ]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { viewMode } = useViewPrefs();
  const isMobile = viewMode === "mobile";
  const sideNav = useVisibleMenus();
  useMenuGuard();

  if (isMobile) {
    return (
      <div className="mobile-preview-root flex min-h-full justify-center bg-[#0b1220] px-0 sm:px-4 sm:py-5">
        <div className="mobile-device relative flex min-h-full w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl shadow-black/40 sm:min-h-[min(100vh-2.5rem,920px)] sm:rounded-[1.75rem] sm:ring-1 sm:ring-white/10">
          <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 bg-dh-deep px-3 text-white">
            <div className="min-w-0 flex-1">
              <BrandHomeLink compact />
            </div>
            <ViewToolbar />
            <Link
              href="/settings"
              className={cn(
                "rounded-md p-1.5 transition",
                pathname.startsWith("/settings")
                  ? "bg-white/20 text-white"
                  : "text-white/85 hover:bg-white/10",
              )}
              aria-label="설정"
              title="설정"
            >
              <Settings2 className="size-4" />
            </Link>
            <NotificationsBell compact />
          </header>

          <main className="@container/app min-h-0 flex-1 overflow-auto overscroll-contain px-3 py-3 pb-[4.5rem]">
            <div className="mx-auto w-full">{children}</div>
          </main>

          <nav className="absolute inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-border/80 bg-card/95 backdrop-blur-md sm:rounded-b-[1.75rem]">
            {sideNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] leading-tight transition",
                    active
                      ? "text-dh-real dark:text-dh-sky"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[1.15rem]",
                      active && "stroke-[2.25]",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="w-full truncate text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 overflow-visible bg-dh-deep px-2 text-white shadow-md shadow-dh-deep/20 sm:h-16 sm:gap-4 sm:px-3">
        <BrandHomeLink />

        <div className="mx-auto hidden w-full max-w-sm flex-1 lg:block">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dh-deep/50" />
            <input
              type="search"
              placeholder="통합 검색"
              className="h-9 w-full rounded-md border-0 bg-white pr-3 pl-9 text-sm text-dh-gray placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-dh-sky"
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ViewToolbar />

          <NotificationsBell />
          <div className="hidden h-6 w-px bg-white/20 sm:block" />
          <CurrentUserChip />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-14 z-30 flex h-[calc(100vh-3.5rem)] w-[3.5rem] shrink-0 flex-col items-center bg-dh-deep py-3 sm:top-16 sm:h-[calc(100vh-4rem)] sm:w-16">
          <nav className="flex flex-1 flex-col items-center gap-1">
            {sideNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-10 flex-col items-center justify-center rounded-lg transition sm:size-11",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/55 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </Link>
              );
            })}
          </nav>
          <Link
            href="/settings"
            title="설정 · 홈화면 편집"
            aria-label="설정"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cn(
              "mb-2 mt-auto flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 transition",
              pathname.startsWith("/settings")
                ? "bg-white/15 text-white"
                : "text-white/55 hover:bg-white/10 hover:text-white",
            )}
          >
            <Settings2 className="size-5" strokeWidth={1.75} />
            <span className="text-[10px] font-medium tracking-tight">설정</span>
          </Link>
        </aside>

        <main className="@container/app min-w-0 flex-1 overflow-auto p-3 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
