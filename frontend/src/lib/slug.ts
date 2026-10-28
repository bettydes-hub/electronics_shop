/** URL-safe slug from a display name (matches default category slug style in admin). */
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Resolve category slug: stored slug or derived from name. */
export function categoryPathSlug(name: string, slug: string | null | undefined): string {
  const s = slug?.trim();
  if (s) return s.toLowerCase();
  return slugifyName(name);
}
