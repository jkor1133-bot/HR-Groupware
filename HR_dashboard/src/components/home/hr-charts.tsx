"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DH = {
  deep: "#002753",
  real: "#1f4889",
  sea: "#3b87bb",
  sky: "#5bb6d5",
  light: "#9ce5fe",
  red: "#c00000",
};

export const CHART_PALETTE = [
  DH.real,
  DH.sea,
  DH.sky,
  DH.deep,
  DH.light,
  "#489fd1",
  "#2768a8",
];

type Pair = { label: string; value: number };

function ChartCard({
  title,
  children,
  className,
  height = 220,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** 고정 높이 — ResponsiveContainer가 세로로 끝없이 늘어나지 않게 */
  height?: number;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border border-border bg-card p-3 shadow-sm ${className ?? ""}`}
    >
      <p className="mb-2 shrink-0 text-xs font-semibold tracking-wide text-dh-deep dark:text-dh-light">
        {title}
      </p>
      <div className="w-full shrink-0" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export function HrDonutChart({
  title,
  data,
}: {
  title: string;
  data: Pair[];
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const rows = data.map((d) => ({
    ...d,
    pct: Math.round((d.value / total) * 1000) / 10,
  }));

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            cx="42%"
            cy="50%"
            innerRadius="48%"
            outerRadius="72%"
            paddingAngle={2}
          >
            {rows.map((_, i) => (
              <Cell
                key={rows[i].label}
                fill={CHART_PALETTE[i % CHART_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _n, item) => {
              const v = Number(value ?? 0);
              const pct = (item?.payload as { pct?: number } | undefined)?.pct ?? 0;
              return [`${v}명 (${pct}%)`, "인원"];
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HrBarChartH({
  title,
  data,
  color = DH.sea,
}: {
  title: string;
  data: Pair[];
  color?: string;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e0ea" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v) => [`${Number(v ?? 0)}명`, "인원"]} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HrBarChartV({
  title,
  data,
  color = DH.real,
}: {
  title: string;
  data: Pair[];
  color?: string;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e0ea" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip formatter={(v) => [`${Number(v ?? 0)}명`, "인원"]} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HrAreaChart({
  title,
  data,
}: {
  title: string;
  data: Pair[];
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="hrArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DH.sea} stopOpacity={0.45} />
              <stop offset="100%" stopColor={DH.sea} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7e0ea" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} dy={8} height={40} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip formatter={(v) => [`${Number(v ?? 0)}명`, "퇴사"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={DH.real}
            fill="url(#hrArea)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HrGenderMini({
  male,
  female,
}: {
  male: number;
  female: number;
}) {
  const data = [
    { label: "남", value: male },
    { label: "여", value: female },
  ];
  return (
    <ChartCard title="성별 구성" height={180}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="70%"
          >
            <Cell fill={DH.real} />
            <Cell fill={DH.sky} />
          </Pie>
          <Tooltip formatter={(v) => [`${Number(v ?? 0)}명`, "인원"]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** 당월·전월 / 당월누계·전월누계 그룹 막대 */
export function HrCompareBarChart({
  title,
  currentMonth,
  previousMonth,
  currentYtd,
  previousYtd,
  formatValue,
  unit = "",
}: {
  title: string;
  currentMonth: number;
  previousMonth: number;
  currentYtd: number;
  previousYtd: number;
  formatValue?: (n: number) => string;
  unit?: string;
}) {
  const fmt = formatValue ?? ((n: number) => `${n.toLocaleString("ko-KR")}${unit}`);
  const data = [
    {
      group: "월간",
      당기: currentMonth,
      전기: previousMonth,
    },
    {
      group: "누계",
      당기: currentYtd,
      전기: previousYtd,
    },
  ];

  return (
    <ChartCard title={title} height={200}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e0ea" />
          <XAxis dataKey="group" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            width={56}
            tickFormatter={(v) => {
              const n = Number(v);
              if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
              if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
              return String(n);
            }}
          />
          <Tooltip
            formatter={(v, name) => [
              fmt(Number(v ?? 0)),
              String(name === "당기" ? "당월·당월누계" : "전월·전월누계"),
            ]}
            labelFormatter={(label) =>
              label === "월간" ? "당월 vs 전월" : "당월누계 vs 전월누계"
            }
          />
          <Legend
            formatter={(value) =>
              value === "당기" ? "당월·당월누계" : "전월·전월누계"
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar
            dataKey="당기"
            name="당기"
            fill={DH.real}
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
          <Bar
            dataKey="전기"
            name="전기"
            fill={DH.sky}
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
