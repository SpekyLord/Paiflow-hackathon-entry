import { fromStroops } from "@/lib/amount";
import type { MoneyMovementDTO } from "@/lib/money-movements";

// ERP-LOG-2: CSV of the money-movements log. Plain data for a spreadsheet;
// it is not a ledger export and says so in the file name and headers.
export const MOVEMENTS_CSV_HEADERS = [
  "date_utc",
  "date_pht",
  "plan",
  "envelope",
  "amount_xlm",
  "amount_stroops",
  "stellar_tx_hash",
  "explorer_link",
  "verification",
] as const;

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Spreadsheets run text that starts with = + - @ (or a tab/CR) as a formula.
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

export function movementsToCsv(rows: readonly MoneyMovementDTO[]): string {
  const lines = [MOVEMENTS_CSV_HEADERS.join(",")];
  for (const row of rows) {
    const ms = Date.parse(row.at);
    const cells = [
      `${fmt(ms)} UTC`,
      `${fmt(ms + PHT_OFFSET_MS)} PHT`,
      row.planPurpose,
      row.label ?? "Whole plan payment",
      fromStroops(row.amountStroops),
      row.amountStroops,
      row.stellarTxHash ?? "",
      row.explorerUrl ?? "",
      row.verified ? "verified" : `pending (${row.verification})`,
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
