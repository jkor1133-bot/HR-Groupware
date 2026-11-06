"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { seedPayBandMatrix } from "@/data/hr-records-seed";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEmployees } from "@/hooks/use-employees";
import type {
  PayBandMatrix,
  PayBandTitleMetrics,
  PayBandTrack,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-pay-band-matrix-v1";
/** 차트 Y축 시작 (일반직·지원직 공통) */
const Y_AXIS_MIN = 20_000_000;
/** 일반직 Y축 상한 1억 */
const Y_AXIS_MAX_GENERAL = 100_000_000;
/** 지원직 Y축 상한 7천만 */
const Y_AXIS_MAX_SUPPORT = 70_000_000;
const Y_AXIS_TICKS_GENERAL = [
  20_000_000, 40_000_000, 60_000_000, 80_000_000, 100_000_000,
];
const Y_AXIS_TICKS_SUPPORT = [
  20_000_000, 30_000_000, 40_000_000, 50_000_000, 60_000_000, 70_000_000,
];
/** 부장 Pay-Band 상한 (고정) */
const BUJANG_MAX = 100_000_000;

/** Max = Min × (1.025)^한계체류년수 (부장은 1억 고정) */
function computeAutoMax(
  title: string,
  min: number | null,
  limitYears: number | null,
): number | null {
  if (title === "부장") return BUJANG_MAX;
  if (min == null || min <= 0) return null;
  if (limitYears == null || limitYears <= 0) return null;
  return Math.round(min * Math.pow(1.025, limitYears));
}

function withAutoMax(cols: PayBandTitleMetrics[]): PayBandTitleMetrics[] {
  return cols.map((c) => ({
    ...c,
    maxSalary: computeAutoMax(c.title, c.minSalary, c.limitYears),
  }));
}

function withMatrixAutoMax(m: PayBandMatrix): PayBandMatrix {
  return {
    ...m,
    general: withAutoMax(m.general),
    support: withAutoMax(m.support),
  };
}

const DH = {
  /** Pay-Band 막대 RGB(0, 39, 83) */
  band: "#002753",
  bandStroke: "#001a3a",
  /** 계약연봉(당년) 점 — 노란 원 */
  dot: "#f5c518",
};

/** 사원명부 계약연봉 점 (같은 직위 → 세로 일렬) */
type ContractDot = {
  title: string;
  contractSalary: number;
  name: string;
};

function ContractDotCircle({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={4} fill={DH.dot} stroke="none" />;
}

type AxisLike = {
  scale?: ((v: string | number) => number) & { bandwidth?: () => number };
};

/** Pay-Band 막대 위에 계약연봉 점을 같은 직위 중심에 세로로 찍음 */
function ContractDotsLayer(props: {
  xAxisMap?: Record<string, AxisLike>;
  yAxisMap?: Record<string, AxisLike>;
  dots?: ContractDot[];
  yMin?: number;
  yMax?: number;
}) {
  const { xAxisMap, yAxisMap, dots = [], yMin = Y_AXIS_MIN, yMax } = props;
  if (!xAxisMap || !yAxisMap || !dots.length) return null;
  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  const xScale = xAxis?.scale;
  const yScale = yAxis?.scale;
  if (!xScale || !yScale) return null;
  const band =
    typeof xScale.bandwidth === "function" ? xScale.bandwidth() : 0;

  return (
    <g className="recharts-layer pay-band-contract-dots">
      {dots.map((d, i) => {
        if (!(d.contractSalary > 0)) return null;
        if (d.contractSalary < yMin) return null;
        if (yMax != null && d.contractSalary > yMax) return null;
        const x0 = xScale(d.title);
        const y = yScale(d.contractSalary);
        if (!Number.isFinite(x0) || !Number.isFinite(y)) return null;
        const cx = x0 + band / 2;
        return (
          <g key={`${d.title}-${d.name}-${i}`}>
            <title>{`${d.name}: ${d.contractSalary.toLocaleString("ko-KR")}원`}</title>
            <ContractDotCircle cx={cx} cy={y} />
          </g>
        );
      })}
    </g>
  );
}

const ROW_DEFS: {
  key: keyof Omit<PayBandTitleMetrics, "title">;
  label: string;
  money?: boolean;
  highlight?: boolean;
}[] = [
  { key: "standardYears", label: "표준체류년수" },
  { key: "limitYears", label: "한계체류년수" },
  { key: "minSalary", label: "Min (직급초임)", money: true, highlight: true },
  {
    key: "maxSalary",
    label: "Max (차트용)",
    money: true,
    highlight: true,
  },
  { key: "promotionBump", label: "승진가급", money: true },
];

const AUTO_MAX_HINT = "Min × (1.025)^한계체류년수 (부장 1억 고정)";

function cloneMatrix(m: PayBandMatrix): PayBandMatrix {
  return JSON.parse(JSON.stringify(m)) as PayBandMatrix;
}

function loadMatrix(): PayBandMatrix {
  if (typeof window === "undefined") {
    return withMatrixAutoMax(seedPayBandMatrix());
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return withMatrixAutoMax(seedPayBandMatrix());
    const parsed = JSON.parse(raw) as PayBandMatrix;
    if (!parsed?.general?.length || !parsed?.support?.length) {
      return withMatrixAutoMax(seedPayBandMatrix());
    }
    return withMatrixAutoMax(parsed);
  } catch {
    return withMatrixAutoMax(seedPayBandMatrix());
  }
}

function saveMatrix(m: PayBandMatrix) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

function parseCell(raw: string, money: boolean): number | null {
  const t = raw.trim().replace(/[,₩원\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return money ? Math.floor(n) : n;
}

function formatCell(v: number | null, money: boolean): string {
  if (v == null) return "";
  if (money) return v.toLocaleString("ko-KR");
  return String(v);
}

function formatManwon(v: number) {
  if (v >= 100_000_000) {
    return `${(v / 100_000_000).toFixed(v % 100_000_000 === 0 ? 0 : 1)}억`;
  }
  if (v >= 10_000) {
    return `${Math.round(v / 10_000)}만`;
  }
  return v.toLocaleString("ko-KR");
}

type ChartRow = {
  title: string;
  /** 스택 하단: Min까지 (투명 베이스) */
  base: number;
  /** 스택 상단: Max−Min 구간 */
  band: number;
  min: number;
  max: number;
};

function toChartRows(cols: PayBandTitleMetrics[]): ChartRow[] {
  return cols.map((c) => {
    const min = Math.max(0, c.minSalary ?? 0);
    const autoMax = computeAutoMax(c.title, c.minSalary, c.limitYears) ?? 0;
    const max = Math.max(min, autoMax);
    return {
      title: c.title,
      base: min,
      band: Math.max(0, max - min),
      min,
      max,
    };
  });
}

function PayBandTable({
  trackLabel,
  columns,
  editing,
  onChange,
}: {
  trackLabel: string;
  columns: PayBandTitleMetrics[];
  editing: boolean;
  onChange: (next: PayBandTitleMetrics[]) => void;
}) {
  function patch(
    titleIdx: number,
    key: keyof Omit<PayBandTitleMetrics, "title">,
    raw: string,
    money: boolean,
  ) {
    if (key === "maxSalary") return;
    const next = columns.map((c, i) => {
      if (i !== titleIdx) return c;
      const parsed = parseCell(raw, money);
      const updated = { ...c, [key]: parsed };
      if (key === "minSalary" || key === "limitYears") {
        const min = key === "minSalary" ? parsed : updated.minSalary;
        const limit = key === "limitYears" ? parsed : updated.limitYears;
        updated.maxSalary = computeAutoMax(c.title, min, limit);
      }
      return updated;
    });
    onChange(next);
  }

  return (
    <div className="h-full overflow-x-auto rounded-lg border border-border">
      <table className="gw-data-table h-full w-full min-w-[520px] text-base">
        <thead>
          <tr className="bg-dh-deep text-white">
            <th className="px-2 py-2.5 text-center text-[15px]">
              <span className="block text-xs font-normal opacity-90">
                {trackLabel}
              </span>
              구분
            </th>
            {columns.map((c) => (
              <th key={c.title} className="px-2 py-2.5 text-center text-[15px]">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="h-full">
          {ROW_DEFS.map((row) => {
            const isAutoMax = row.key === "maxSalary";
            return (
              <tr key={row.key} className="border-t border-border">
                <td
                  className={cn(
                    "px-2 py-2 text-center text-sm font-medium align-middle",
                    row.highlight && "bg-amber-50 dark:bg-amber-950/30",
                  )}
                  title={isAutoMax ? AUTO_MAX_HINT : undefined}
                >
                  {row.label}
                  {isAutoMax ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {AUTO_MAX_HINT}
                    </span>
                  ) : null}
                </td>
                {columns.map((col, idx) => {
                  const v = isAutoMax
                    ? computeAutoMax(col.title, col.minSalary, col.limitYears)
                    : col[row.key];
                  return (
                    <td
                      key={`${row.key}-${col.title}`}
                      className={cn(
                        "px-1.5 py-2 text-center align-middle",
                        row.highlight && "bg-amber-50/80 dark:bg-amber-950/20",
                      )}
                    >
                      {editing && !isAutoMax ? (
                        <Input
                          className="h-9 px-1.5 text-center text-sm tabular-nums"
                          inputMode="numeric"
                          value={formatCell(v, Boolean(row.money))}
                          onChange={(e) =>
                            patch(
                              idx,
                              row.key,
                              e.target.value,
                              Boolean(row.money),
                            )
                          }
                          placeholder="—"
                        />
                      ) : (
                        <span
                          className={cn(
                            "tabular-nums text-sm",
                            isAutoMax && "text-muted-foreground",
                          )}
                        >
                          {v == null
                            ? "—"
                            : row.money
                              ? v.toLocaleString("ko-KR")
                              : v}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PayBandChart({
  title,
  columns,
  yMax,
  yTicks,
  dots,
}: {
  title: string;
  columns: PayBandTitleMetrics[];
  yMax: number;
  yTicks: number[];
  dots: ContractDot[];
}) {
  const data = useMemo(() => toChartRows(columns), [columns]);
  const titleSet = useMemo(
    () => new Set(columns.map((c) => c.title)),
    [columns],
  );
  const scatterData = useMemo(
    () =>
      dots.filter(
        (d) =>
          titleSet.has(d.title) &&
          d.contractSalary > 0 &&
          d.contractSalary >= Y_AXIS_MIN &&
          d.contractSalary <= yMax,
      ),
    [dots, titleSet, yMax],
  );
  const hasBand = data.some((d) => d.min > 0 && d.max > d.min);
  const showChart = hasBand || scatterData.length > 0;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-dh-deep dark:text-dh-light">
          {title} Pay-Band 차트
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Y축 {formatManwon(Y_AXIS_MIN)} ~ {formatManwon(yMax)}
          {scatterData.length > 0
            ? ` · 계약연봉 ${scatterData.length}명`
            : ""}
        </span>
      </div>
      <div className="min-h-[400px] w-full flex-1">
        {!showChart ? (
          <div className="flex h-full min-h-[400px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Min(초임)과 한계체류년수를 입력하면 Max가 계산되고 구간 막대가
            표시됩니다. 사원명부 계약연봉(당년)이 있으면 점으로 표시됩니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 12, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" />
              <XAxis dataKey="title" tick={{ fontSize: 11 }} />
              <YAxis
                domain={[Y_AXIS_MIN, yMax]}
                ticks={yTicks}
                allowDataOverflow
                tick={{ fontSize: 10 }}
                width={48}
                tickFormatter={(v) => formatManwon(Number(v))}
              />
              <Tooltip
                formatter={(_value, name, ctx) => {
                  const row = ctx?.payload as ChartRow | undefined;
                  if (name === "band" && row) {
                    return [
                      `${row.min.toLocaleString("ko-KR")} ~ ${row.max.toLocaleString("ko-KR")}원`,
                      "Pay-Band",
                    ];
                  }
                  return [null, ""];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                payload={[
                  {
                    value: "Pay-Band (Min~Max)",
                    type: "square",
                    color: DH.band,
                    id: "band",
                  },
                  {
                    value: "계약연봉(당년)",
                    type: "circle",
                    color: DH.dot,
                    id: "dot",
                  },
                ]}
              />
              <Bar
                dataKey="base"
                stackId="band"
                fill="transparent"
                legendType="none"
                isAnimationActive={false}
              />
              <Bar
                dataKey="band"
                name="band"
                stackId="band"
                fill={DH.band}
                stroke={DH.bandStroke}
                strokeWidth={1}
                radius={[8, 8, 8, 8]}
                barSize={44}
                isAnimationActive={false}
              />
              <Customized
                component={(layerProps: Record<string, unknown>) => (
                  <ContractDotsLayer
                    xAxisMap={
                      layerProps.xAxisMap as
                        | Record<string, AxisLike>
                        | undefined
                    }
                    yAxisMap={
                      layerProps.yAxisMap as
                        | Record<string, AxisLike>
                        | undefined
                    }
                    dots={scatterData}
                    yMin={Y_AXIS_MIN}
                    yMax={yMax}
                  />
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        남색 막대 = Pay-Band(Min~Max). 노란 원 = 사원명부 계약연봉(당년).
        같은 직위는 세로 일렬로 표시됩니다. Y축{" "}
        {formatManwon(Y_AXIS_MIN)}~{formatManwon(yMax)}.
      </p>
    </div>
  );
}

export function PayBandPanel() {
  const employees = useEmployees();
  const { isAdmin } = useCurrentUser();
  const [matrix, setMatrix] = useState<PayBandMatrix>(() =>
    withMatrixAutoMax(seedPayBandMatrix()),
  );
  const [draft, setDraft] = useState<PayBandMatrix | null>(null);
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMatrix(loadMatrix());
    setHydrated(true);
  }, []);

  const working = withMatrixAutoMax(editing && draft ? draft : matrix);

  const generalDots = useMemo((): ContractDot[] => {
    if (!isAdmin) return [];
    return employees.items
      .filter(
        (e) =>
          e.jobTrack === "일반직" &&
          typeof e.contractSalary === "number" &&
          e.contractSalary > 0,
      )
      .map((e) => ({
        title: e.title,
        contractSalary: e.contractSalary,
        name: e.name,
      }));
  }, [employees.items, isAdmin]);

  const supportDots = useMemo((): ContractDot[] => {
    if (!isAdmin) return [];
    return employees.items
      .filter(
        (e) =>
          e.jobTrack === "지원직" &&
          typeof e.contractSalary === "number" &&
          e.contractSalary > 0,
      )
      .map((e) => ({
        title: e.title,
        contractSalary: e.contractSalary,
        name: e.name,
      }));
  }, [employees.items, isAdmin]);

  function startEdit() {
    setDraft(cloneMatrix(working));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    const next = withMatrixAutoMax(draft);
    saveMatrix(next);
    setMatrix(next);
    setDraft(null);
    setEditing(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function setTrack(track: PayBandTrack, cols: PayBandTitleMetrics[]) {
    setDraft((prev) => {
      const base = prev ?? cloneMatrix(matrix);
      const normalized = withAutoMax(cols);
      return track === "일반직"
        ? { ...base, general: normalized }
        : { ...base, support: normalized };
    });
  }

  if (!hydrated) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            Pay-Band 현황
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {working.company} 직군·직위별 체류년수·초임·승진가급을 관리합니다.
            Max는 일반직·지원직 모두 직급초임 × (1.025)^한계체류년수로 자동
            계산되고, 부장은 1억으로 고정됩니다. 차트 Y축은{" "}
            {formatManwon(Y_AXIS_MIN)}부터이며, 일반직 상한{" "}
            {formatManwon(Y_AXIS_MAX_GENERAL)} · 지원직 상한{" "}
            {formatManwon(Y_AXIS_MAX_SUPPORT)}입니다.
            {isAdmin
              ? " 노란 점은 사원명부 계약연봉(당년)입니다."
              : " 계약연봉 점은 관리자만 표시됩니다."}
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 값을 바꾼 뒤 [저장]을 눌러 주세요.
            </p>
          ) : null}
          {savedFlash ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              저장되었습니다.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X data-icon="inline-start" />
                취소
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <Save data-icon="inline-start" />
                저장
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              수정
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <PayBandTable
            trackLabel="일반직"
            columns={working.general}
            editing={editing}
            onChange={(cols) => setTrack("일반직", cols)}
          />
          <PayBandChart
            title="일반직"
            columns={working.general}
            yMax={Y_AXIS_MAX_GENERAL}
            yTicks={Y_AXIS_TICKS_GENERAL}
            dots={generalDots}
          />
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <PayBandTable
            trackLabel="지원직"
            columns={working.support}
            editing={editing}
            onChange={(cols) => setTrack("지원직", cols)}
          />
          <PayBandChart
            title="지원직"
            columns={working.support}
            yMax={Y_AXIS_MAX_SUPPORT}
            yTicks={Y_AXIS_TICKS_SUPPORT}
            dots={supportDots}
          />
        </div>
      </div>
    </section>
  );
}
