"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageBack } from "@/components/ui/PageBack";
import { PasswordField } from "@/components/ui/PasswordField";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";
import { dashboardPathForRole, safeNextPathAfterLogin } from "@/lib/staff-routes";

export function StaffLoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next")?.trim() ?? null;
  const resetSuccess = searchParams.get("reset") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sign-in failed");
        return;
      }
      const roleNorm = String(data.role ?? "").toUpperCase() || "SELLER";
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          username: data.username,
          name: data.name,
          email: data.email,
          role: roleNorm,
        })
      );

      const dest =
        nextParam && nextParam.startsWith("/")
          ? safeNextPathAfterLogin(nextParam, roleNorm)
          : dashboardPathForRole(roleNorm);
      /* Full navigation so middleware sees the new HttpOnly cookie on the next request. */
      window.location.assign(dest);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <PageBack href="/catalog" ariaLabel="Back to store" />
          <Link href="/catalog" className="text-xl font-bold text-primary-600">
            Electronics Shop
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Staff login</h1>

        <div className="mt-6">
          <FirstSetupBanner variant="light" />
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="login-user" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="login-user"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <PasswordField
              id="login-pass"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="space-y-2" aria-live="polite">
            {resetSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                Password updated. Sign in.
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            )}
          </div>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-primary-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/register" className="font-medium text-primary-600 hover:underline">
            Complete registration
          </Link>
        </p>
      </main>
    </div>
  );
}
