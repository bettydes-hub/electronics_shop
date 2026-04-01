"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

type PageBackProps = {
  /** Where to go when used as a link. Omit to use browser history (`router.back()`). */
  href?: string;
  ariaLabel?: string;
  /** `dark` = light icon for dark nav bars */
  theme?: "light" | "dark";
  className?: string;
};

export function PageBack({
  href,
  ariaLabel = "Go back",
  theme = "light",
  className = "",
}: PageBackProps) {
  const router = useRouter();
  const base =
    theme === "dark"
      ? "inline-flex items-center justify-center rounded-lg p-2 text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
      : "inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`} aria-label={ariaLabel} title={ariaLabel}>
        <BackIcon />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${base} ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => router.back()}
    >
      <BackIcon />
    </button>
  );
}
