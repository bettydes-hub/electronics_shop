/** Pure policy helpers (safe to import from client components). */

export const PRODUCT_IMAGE_HARD_MIN = 1;
export const PRODUCT_IMAGE_HARD_MAX = 20;

export const DEFAULT_PRODUCT_IMAGE_MIN = 1;
export const DEFAULT_PRODUCT_IMAGE_MAX = 6;

export function normalizeImageLimits(rawMin: number, rawMax: number): { min: number; max: number } {
  let min = Math.round(Number(rawMin));
  let max = Math.round(Number(rawMax));
  if (!Number.isFinite(min)) min = DEFAULT_PRODUCT_IMAGE_MIN;
  if (!Number.isFinite(max)) max = DEFAULT_PRODUCT_IMAGE_MAX;
  min = Math.max(PRODUCT_IMAGE_HARD_MIN, Math.min(min, PRODUCT_IMAGE_HARD_MAX));
  max = Math.max(PRODUCT_IMAGE_HARD_MIN, Math.min(max, PRODUCT_IMAGE_HARD_MAX));
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

export function productImageCountError(
  count: number,
  limits: { min: number; max: number }
): string | null {
  if (count < limits.min || count > limits.max) {
    return `Product must have ${limits.min} to ${limits.max} images`;
  }
  return null;
}
