/** Start of range for floor-sale filters (server local calendar). `all` → null. */
export type SalesPeriodFilter = "all" | "today" | "week" | "month" | "year";

const ALLOWED: SalesPeriodFilter[] = ["all", "today", "week", "month", "year"];

export function parseSalesPeriod(raw: string | null): SalesPeriodFilter {
  if (raw && ALLOWED.includes(raw as SalesPeriodFilter)) {
    return raw as SalesPeriodFilter;
  }
  return "all";
}

export function startDateForSalesPeriod(period: SalesPeriodFilter): Date | null {
  if (period === "all") return null;
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + mondayOffset);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    case "year":
      return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    default:
      return null;
  }
}
