const etbNumber = new Intl.NumberFormat("en-ET", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Full shop display: e.g. "12,345.67 ETB" */
export function formatMoney(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${etbNumber.format(n)} ETB`;
}

/** Numeric part only (same grouping/decimals as formatMoney); use with suffix like " ETB/unit". */
export function formatMoneyAmount(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return etbNumber.format(n);
}

/** Dashboard profit tiles: explicit "+" for zero or positive, minus from locale for negative. */
export function formatMoneySigned(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  if (n < 0) return `${etbNumber.format(n)} ETB`;
  return `+${etbNumber.format(n)} ETB`;
}
