import * as XLSX from "xlsx";

/**
 * rows가 비어 있어도 headerKeys가 있으면 헤더만 있는 양식 시트를 만듭니다.
 */
export function downloadRowsAsExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
  headerKeys?: string[],
) {
  const headers =
    headerKeys?.length
      ? headerKeys
      : rows[0]
        ? Object.keys(rows[0])
        : [];

  let ws: XLSX.WorkSheet;
  if (rows.length === 0) {
    ws = XLSX.utils.aoa_to_sheet(headers.length ? [headers] : [[]]);
  } else {
    ws = XLSX.utils.json_to_sheet(
      rows,
      headers.length ? { header: headers } : undefined,
    );
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function readExcelFile(
  file: File,
): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
}

function normHeader(s: string) {
  return s.replace(/\s+/g, "").trim().toLowerCase();
}

export function cellStr(row: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => normHeader(rk) === normHeader(k),
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

export function cellNum(row: Record<string, unknown>, ...keys: string[]) {
  const s = cellStr(row, ...keys).replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 직위년차 전용 파싱.
 * 엑셀에서 날짜로 잘못 읽힌 값·빈 칸·"년차" 헤더 변형을 처리합니다.
 */
export function cellTitleYears(
  row: Record<string, unknown>,
  fallback = 1,
): number {
  const prefer = ["직위년차", "년차", "titleYears", "titleyears"];
  let found = Object.keys(row).find((rk) =>
    prefer.some((k) => normHeader(rk) === normHeader(k)),
  );
  if (!found) {
    found = Object.keys(row).find((rk) => {
      const n = normHeader(rk);
      return n.includes("년차") && !n.includes("생년") && !n.includes("입사");
    });
  }
  if (found == null) return fallback;

  const raw = row[found];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // 엑셀 날짜 시리얼(보통 수만)이 아닌 합리적 년차만 허용
    if (raw >= 0 && raw <= 60) return Math.floor(raw);
    return fallback;
  }
  const s = String(raw ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/년/g, "");
  if (!s) return fallback;
  // 날짜 문자열로 들어온 경우 무시
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || /[/-]/.test(s) && s.length > 4) {
    return fallback;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n <= 60) return Math.floor(n);
  return fallback;
}

/** Excel serial / date string → YYYY-MM-DD */
export function cellDate(row: Record<string, unknown>, ...keys: string[]) {
  const raw = cellStr(row, ...keys);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw;
}
