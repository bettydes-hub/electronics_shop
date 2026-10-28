export const EXPENSE_PERIODS = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "YEARLY",
] as const;

export type ExpensePeriod = (typeof EXPENSE_PERIODS)[number];

export function isExpensePeriod(v: unknown): v is ExpensePeriod {
  return typeof v === "string" && (EXPENSE_PERIODS as readonly string[]).includes(v);
}

export function parseDateOnly(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function toDateInputValue(raw: string | Date | null | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (m) return m[1];
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  return raw.toISOString().slice(0, 10);
}
