import { cn } from "@/lib/utils";

export function HrBarList({
  items,
  max,
  formatValue,
  barClassName,
}: {
  items: { label: string; value: number }[];
  max?: number;
  formatValue?: (n: number) => string;
  barClassName?: string;
}) {
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-dh-sea transition-[width]",
                barClassName,
              )}
              style={{ width: `${Math.round((item.value / peak) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
