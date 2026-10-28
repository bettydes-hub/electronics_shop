"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Optional wrapper class (e.g. for layout). */
  wrapperClassName?: string;
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.7 10.7a3 3 0 1 0 4.2 4.2" />
      <path d="M9.88 9.88A10.4 10.4 0 0 1 12 5c4.47 0 8.26 3.98 9.54 7a10.57 10.57 0 0 1-3.32 4.26" />
      <path d="M6.36 6.36A10.22 10.22 0 0 0 2.46 12c1.28 3.02 5.07 7 9.54 7 1.62 0 3.13-.42 4.48-1.08" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/**
 * Password input with a show / hide toggle (does not render a label).
 */
export function PasswordField({ className = "", wrapperClassName = "", id, disabled, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 ${className}`.trim()}
        {...rest}
      />
      <button
        type="button"
        disabled={disabled}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
