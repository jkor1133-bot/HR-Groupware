"use client";

import { useMemo } from "react";
import type { OrgChartUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

type PartNode = { name: string; leader: string };
type TeamNode = {
  name: string;
  leader: string;
  parts: PartNode[];
};
type HqNode = {
  name: string;
  leader: string;
  teams: TeamNode[];
};
type ChartTree = {
  ceoTitle: string;
  ceoName: string;
  headquarters: HqNode[];
};

function buildTree(units: OrgChartUnit[]): ChartTree {
  const ceo =
    units.find(
      (u) =>
        (u.note || "").includes("대표이사") ||
        ((u.division === "임원실" || u.division.includes("대표")) &&
          !u.department &&
          !u.part),
    ) ?? null;

  const hqHeads = units.filter(
    (u) =>
      u.division &&
      !u.department &&
      !u.part &&
      u !== ceo &&
      u.division !== "임원실",
  );

  const hqOrder = [...new Set(hqHeads.map((h) => h.division))];
  // Also include divisions that only appear on team rows
  for (const u of units) {
    if (
      u.division &&
      u.division !== "임원실" &&
      !hqOrder.includes(u.division)
    ) {
      hqOrder.push(u.division);
    }
  }

  const headquarters: HqNode[] = hqOrder.map((divName) => {
    const head = hqHeads.find((h) => h.division === divName);
    const teamRows = units.filter(
      (u) => u.division === divName && u.department && !u.part,
    );
    const teamNames = [...new Set(teamRows.map((t) => t.department))];
    const teams: TeamNode[] = teamNames.map((teamName) => {
      const team = teamRows.find((t) => t.department === teamName);
      const parts = units
        .filter(
          (u) =>
            u.division === divName &&
            u.department === teamName &&
            Boolean(u.part),
        )
        .map((p) => ({ name: p.part, leader: p.leader || "" }));
      return {
        name: teamName,
        leader: team?.leader || "",
        parts,
      };
    });
    return {
      name: divName,
      leader: head?.leader || "",
      teams,
    };
  });

  return {
    ceoTitle: ceo?.note?.includes("대표이사")
      ? "대표이사"
      : ceo?.division || "대표이사",
    ceoName: ceo?.leader || "",
    headquarters,
  };
}

function ConnectorDown({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto h-5 w-px bg-[#7a93b5]/30", className)}
      aria-hidden
    />
  );
}

function OrgBox({
  title,
  subtitle,
  variant,
  className,
}: {
  title: string;
  subtitle?: string;
  variant: "ceo" | "hq" | "team" | "part";
  className?: string;
}) {
  if (variant === "ceo") {
    return (
      <div
        className={cn(
          "mx-auto min-w-[9.5rem] rounded-md bg-[#1f4889] px-4 py-2.5 text-center text-white shadow-sm",
          className,
        )}
      >
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-white/90">{subtitle}</p>
        ) : null}
      </div>
    );
  }

  if (variant === "hq") {
    return (
      <div
        className={cn(
          "min-w-[10.5rem] overflow-hidden rounded-md border border-[#9eb3d1] bg-white shadow-sm",
          className,
        )}
      >
        <div className="bg-[#d8e3f2] px-3 py-1.5 text-center text-xs font-semibold text-[#1f4889]">
          {title}
        </div>
        {subtitle ? (
          <div className="bg-[#eef3fa] px-3 py-2 text-center text-xs text-[#314f7a]">
            {subtitle}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "team") {
    return (
      <div
        className={cn(
          "w-[6.75rem] overflow-hidden rounded-md border border-[#9eb3d1] bg-white shadow-sm",
          className,
        )}
      >
        <div className="bg-[#1f4889] px-2 py-2 text-center text-[11px] font-semibold leading-snug text-white">
          {title}
        </div>
        <div className="bg-[#e8f0fa] px-2 py-2 text-center text-[11px] leading-snug text-[#314f7a]">
          {subtitle || "—"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-[5.5rem] rounded-md border border-[#b7c9e0] bg-[#e8f0fa] px-1.5 py-2 text-center text-[10px] font-medium leading-snug text-[#314f7a]",
        className,
      )}
    >
      {title}
    </div>
  );
}

/** 조직도 그림 (대표이사 → 본부 → 팀 → 파트) */
export function OrgChartDiagram({
  units,
  className,
}: {
  units: OrgChartUnit[];
  className?: string;
}) {
  const tree = useMemo(() => buildTree(units), [units]);

  if (!units.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        조직 구성이 없어 그림을 표시할 수 없습니다.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-[#c5d4e8] bg-[#f4f7fb] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mx-auto flex min-w-[720px] flex-col items-center">
        <OrgBox
          variant="ceo"
          title={tree.ceoTitle}
          subtitle={tree.ceoName || undefined}
        />
        {tree.headquarters.length > 0 ? (
          <>
            <ConnectorDown />
            <div className="relative w-full">
              <div
                className="absolute top-0 left-[12.5%] right-[12.5%] h-px bg-[#7a93b5]/35"
                aria-hidden
              />
              <div className="flex justify-around gap-3 pt-0">
                {tree.headquarters.map((hq) => (
                  <div
                    key={hq.name}
                    className="flex min-w-0 flex-1 flex-col items-center"
                  >
                    <div className="h-5 w-px bg-[#7a93b5]/35" aria-hidden />
                    <OrgBox
                      variant="hq"
                      title={hq.name}
                      subtitle={hq.leader || undefined}
                    />
                    {hq.teams.length > 0 ? (
                      <>
                        <ConnectorDown />
                        <div className="relative w-full">
                          {hq.teams.length > 1 ? (
                            <div
                              className="absolute top-0 left-[16%] right-[16%] h-px bg-[#7a93b5]/30"
                              aria-hidden
                            />
                          ) : null}
                          <div className="flex flex-wrap justify-center gap-3 pt-0">
                            {hq.teams.map((team) => (
                              <div
                                key={`${hq.name}-${team.name}`}
                                className="flex flex-col items-center"
                              >
                                <div
                                  className="h-5 w-px bg-[#7a93b5]/30"
                                  aria-hidden
                                />
                                <OrgBox
                                  variant="team"
                                  title={team.name}
                                  subtitle={team.leader || undefined}
                                />
                                {team.parts.length > 0 ? (
                                  <>
                                    <ConnectorDown className="h-4" />
                                    <div className="flex flex-col items-center gap-1.5">
                                      {team.parts.map((part) => (
                                        <OrgBox
                                          key={`${team.name}-${part.name}`}
                                          variant="part"
                                          title={part.name}
                                        />
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
