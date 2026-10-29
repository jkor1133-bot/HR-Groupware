"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, Shield, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMembers } from "@/hooks/use-members";
import {
  ALL_MENU_HREFS,
  APP_MENUS,
  DEFAULT_MEMBER_MENUS,
  ensureHomeMenu,
  type AppMenuId,
} from "@/lib/app-menus";
import type { MemberStatus, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES = ["팀장", "대리", "주임", "사원", "과장", "차장", "부장", "기타"];

const STATUS_META: Record<
  MemberStatus,
  { label: string; className: string }
> = {
  active: {
    label: "활성",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  invited: {
    label: "초대됨",
    className:
      "border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  },
  pending: {
    label: "가입 대기",
    className:
      "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  },
};

type FormState = {
  id: string | null;
  name: string;
  role: string;
  email: string;
  status: MemberStatus;
  isAdmin: boolean;
  allowedMenus: AppMenuId[];
};

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  role: "사원",
  email: "",
  status: "active",
  isAdmin: false,
  allowedMenus: [...DEFAULT_MEMBER_MENUS],
});

export default function MembersPage() {
  const { hydrated, members, upsert, remove, resetToSeed } = useMembers();
  const { isAdmin: viewerIsAdmin } = useCurrentUser();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [members, query]);

  const editing = form.id !== null;
  const canEditPermissions = viewerIsAdmin;

  function startEdit(m: TeamMember) {
    setForm({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email ?? "",
      status: m.status ?? "active",
      isAdmin: Boolean(m.isAdmin),
      allowedMenus: ensureHomeMenu(m.allowedMenus),
    });
  }

  function cancelEdit() {
    setForm(emptyForm());
  }

  function toggleMemberMenu(member: TeamMember, href: AppMenuId) {
    if (!canEditPermissions) return;
    if (member.isAdmin) return;
    if (href === "/") return;
    const current = new Set(ensureHomeMenu(member.allowedMenus));
    if (current.has(href)) current.delete(href);
    else current.add(href);
    current.add("/");
    upsert({
      ...member,
      allowedMenus: ensureHomeMenu([...current]),
    });
  }

  function save() {
    const name = form.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const existing = form.id
      ? members.find((m) => m.id === form.id)
      : undefined;

    const nextIsAdmin = canEditPermissions
      ? form.isAdmin
      : Boolean(existing?.isAdmin);
    const nextMenus = canEditPermissions
      ? nextIsAdmin
        ? [...ALL_MENU_HREFS]
        : ensureHomeMenu(form.allowedMenus)
      : ensureHomeMenu(existing?.allowedMenus ?? DEFAULT_MEMBER_MENUS);

    upsert({
      id: form.id ?? `m-${Date.now()}`,
      name,
      role: form.role.trim() || "사원",
      email: form.email.trim(),
      status: form.status,
      createdAt: existing?.createdAt ?? now,
      isAdmin: nextIsAdmin,
      allowedMenus: nextMenus,
    });
    setForm(emptyForm());
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
        담당자 목록을 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-dh-deep dark:text-dh-sky">
            <Users className="size-5" />
            <span className="text-xs font-semibold tracking-wide uppercase">
              HR Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            담당자 등록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            인사총무팀 담당자를 등록합니다. 아래{" "}
            <span className="font-medium text-foreground">메뉴 권한 지정</span>
            표에서 개인별로 볼 수 있는 사이드 메뉴를 체크하세요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              window.confirm(
                "기본 담당자 5명으로 초기화할까요? (관리자: 이대현)",
              )
            ) {
              resetToSeed();
              setForm(emptyForm());
            }
          }}
        >
          <RotateCcw className="size-3.5" />
          기본 인원으로 초기화
        </Button>
      </div>

      <div className="grid gap-5 @lg/app:grid-cols-[minmax(0,24rem)_1fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {editing ? "담당자 수정" : "담당자 추가"}
          </h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">이름</Label>
              <Input
                id="member-name"
                value={form.name}
                placeholder="예: 김재선"
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">직급</Label>
              <select
                id="member-role"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">이메일 (가입 연동용)</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                placeholder="예: name@dhflour.com"
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-status">상태</Label>
              <select
                id="member-status"
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as MemberStatus,
                  }))
                }
              >
                <option value="active">활성 — 사용 가능</option>
                <option value="invited">초대됨 — 가입 안내 예정</option>
                <option value="pending">가입 대기 — 승인 필요</option>
              </select>
            </div>

            <div
              className={cn(
                "space-y-2 rounded-md border border-border p-3",
                !canEditPermissions && "opacity-70",
              )}
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 accent-dh-real"
                  checked={form.isAdmin}
                  disabled={!canEditPermissions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      isAdmin: e.target.checked,
                      allowedMenus: e.target.checked
                        ? [...ALL_MENU_HREFS]
                        : ensureHomeMenu(f.allowedMenus),
                    }))
                  }
                />
                <Shield className="size-3.5 text-dh-sea" />
                관리자 권한
              </label>
              <p className="text-[11px] text-muted-foreground">
                메뉴 노출은 페이지 하단 「메뉴 권한 지정」표에서 개인별로
                바로 체크·저장됩니다.
                {!canEditPermissions
                  ? " (헤더에서 관리자 계정으로 전환하세요)"
                  : ""}
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" className="flex-1" onClick={save}>
                <Plus className="size-3.5" />
                {editing ? "수정 저장" : "등록"}
              </Button>
              {editing ? (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  취소
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              등록된 담당자{" "}
              <span className="font-normal text-muted-foreground">
                ({filtered.length}명)
              </span>
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·직급·이메일 검색"
              className="h-8 max-w-[14rem]"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="gw-data-table w-full min-w-[40rem] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">이름</th>
                  <th className="px-3 py-2.5 font-medium">직급</th>
                  <th className="px-3 py-2.5 font-medium">권한</th>
                  <th className="px-3 py-2.5 font-medium">메뉴</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                  <th className="px-3 py-2.5 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      등록된 담당자가 없습니다. 왼쪽에서 추가하세요.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const status = m.status ?? "active";
                    const meta = STATUS_META[status];
                    const menus = m.isAdmin
                      ? ALL_MENU_HREFS
                      : ensureHomeMenu(m.allowedMenus);
                    return (
                      <tr
                        key={m.id}
                        className={cn(
                          "border-t border-border",
                          form.id === m.id && "bg-dh-sky/10",
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {m.name}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {m.role}
                        </td>
                        <td className="px-3 py-3">
                          {m.isAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded border border-dh-sea/30 bg-dh-sea/10 px-2 py-0.5 text-[11px] font-medium text-dh-deep dark:text-dh-light">
                              <Shield className="size-3" />
                              관리자
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              일반
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {m.isAdmin
                            ? "전체"
                            : `${menus.length}개`}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded border px-2 py-0.5 text-[11px] font-medium",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => startEdit(m)}
                              title="수정"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-dh-red hover:text-dh-red"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `${m.name} ${m.role}을(를) 담당자에서 삭제할까요?`,
                                  )
                                ) {
                                  if (form.id === m.id) setForm(emptyForm());
                                  remove(m.id);
                                }
                              }}
                              title="삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            메뉴 권한 지정
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            담당자마다 사이드바에서 볼 메뉴를 체크하세요. 체크 즉시 저장되며,
            헤더에서 해당 사용자로 바꾸면 메뉴가 바로 반영됩니다. 홈은 모두
            고정, 관리자는 전체 메뉴입니다.
          </p>
          {!canEditPermissions ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              현재 계정은 관리자가 아니라 수정할 수 없습니다. 헤더에서 「이대현」
              등 관리자로 전환하세요.
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="gw-data-table w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="sticky left-0 z-10 bg-dh-deep px-4 py-2.5">
                  담당자
                </th>
                <th className="px-2 py-2.5 text-center text-xs">관리자</th>
                {APP_MENUS.map((menu) => (
                  <th
                    key={menu.href}
                    className="px-2 py-2.5 text-center text-xs font-medium"
                  >
                    {menu.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + APP_MENUS.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    담당자를 먼저 등록하세요.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const menus = m.isAdmin
                    ? ALL_MENU_HREFS
                    : ensureHomeMenu(m.allowedMenus);
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-border odd:bg-muted/20"
                    >
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 odd:bg-muted/20">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.role}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-dh-real"
                          checked={Boolean(m.isAdmin)}
                          disabled={!canEditPermissions}
                          title="관리자 권한"
                          onChange={(e) => {
                            if (!canEditPermissions) return;
                            upsert({
                              ...m,
                              isAdmin: e.target.checked,
                              allowedMenus: e.target.checked
                                ? [...ALL_MENU_HREFS]
                                : ensureHomeMenu(
                                    m.allowedMenus ?? DEFAULT_MEMBER_MENUS,
                                  ),
                            });
                          }}
                        />
                      </td>
                      {APP_MENUS.map((menu) => {
                        const checked =
                          Boolean(m.isAdmin) || menus.includes(menu.href);
                        const locked =
                          menu.href === "/" || Boolean(m.isAdmin);
                        return (
                          <td
                            key={menu.href}
                            className="px-2 py-2.5 text-center"
                          >
                            <input
                              type="checkbox"
                              className="size-4 accent-dh-real disabled:opacity-50"
                              checked={checked}
                              disabled={!canEditPermissions || locked}
                              aria-label={`${m.name} · ${menu.label}`}
                              onChange={() =>
                                toggleMemberMenu(m, menu.href)
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
