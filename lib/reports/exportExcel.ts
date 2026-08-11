import * as XLSX from "xlsx";
import type { ReportColumn, ReportConfig, ReportGroupRow, Settings } from "@/lib/types";

/**
 * NOTE: the free/community SheetJS "xlsx" build (the package this phase specifies)
 * does not support cell styling (bold/fill) — that's a SheetJS Pro feature. Money
 * cells are still written as real numbers with a genuine 0.000 number format (not
 * strings), which is what makes the sheet usable in Excel/Sheets; visual bolding of
 * headers/totals is therefore approximated with plain-text labels instead.
 */

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportExcel<Row extends Record<string, unknown>>(
  config: ReportConfig,
  rows: Row[],
  groups: ReportGroupRow<Row>[] | undefined,
  summary: Record<string, number>,
  filtersEcho: string,
  settings: Settings
): void {
  const columns = config.columns as ReportColumn<Row>[];
  const moneyFormat = `0.${"0".repeat(settings.currencyDecimals ?? 3)}`;

  const aoa: unknown[][] = [];
  aoa.push([settings.agencyName]);
  aoa.push([config.title]);
  aoa.push([filtersEcho]);
  aoa.push([]);
  aoa.push(columns.map((c) => c.label));

  const dataStartRow = aoa.length;
  const moneyColIndexes: number[] = [];
  columns.forEach((c, i) => {
    if (c.money) moneyColIndexes.push(i);
  });

  function pushRow(row: Row) {
    aoa.push(columns.map((c) => rawCellValue(row, c)));
  }

  if (groups && groups.length > 0) {
    for (const group of groups) {
      aoa.push([`${group.label}`, ...columns.slice(1).map((c) => (c.money ? (group.subtotal[c.summaryKey ?? c.key] ?? "") : ""))]);
      for (const row of group.rows) pushRow(row);
    }
  } else {
    for (const row of rows) pushRow(row);
  }

  const totalRowIndex = aoa.length;
  const totalRow: unknown[] = columns.map((c, i) => {
    if (i === 0) return "GRAND TOTAL";
    const summaryKey = c.summaryKey ?? c.key;
    if (c.money && summary[summaryKey] !== undefined) return summary[summaryKey];
    return "";
  });
  aoa.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply a real numeric format to every money cell (data rows + grand total).
  for (let r = dataStartRow; r <= totalRowIndex; r++) {
    for (const c of moneyColIndexes) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      if (cell && typeof cell.v === "number") cell.z = moneyFormat;
    }
  }

  // True auto-width: widest of the header label or any cell actually written in that
  // column (not just the header), capped so one long outlier can't blow out the sheet.
  ws["!cols"] = columns.map((c, i) => {
    let widest = String(c.label).length;
    for (let r = dataStartRow; r <= totalRowIndex; r++) {
      const cellLength = String(aoa[r]?.[i] ?? "").length;
      if (cellLength > widest) widest = cellLength;
    }
    return { wch: Math.min(Math.max(widest + 2, 12), 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 31));
  XLSX.writeFile(wb, `${config.id}_${todayStamp()}.xlsx`);
}

function rawCellValue<Row extends Record<string, unknown>>(row: Row, column: ReportColumn<Row>): unknown {
  if (column.money) {
    const v = row[column.key];
    return typeof v === "number" ? v : Number(v) || 0;
  }
  const v = row[column.key];
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}
