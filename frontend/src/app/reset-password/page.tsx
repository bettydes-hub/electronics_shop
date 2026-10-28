"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageBack } from "@/components/ui/PageBack";
import { PasswordField } from "@/components/ui/PasswordField";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!tokenFromUrl) {
      setError("Missing token. Open the link from your email or request a new reset.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromUrl, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Reset failed");
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!tokenFromUrl && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Open the link from your email, or{" "}
          <Link href="/forgot-password" className="font-medium text-primary-700 underline">
            request a new one
          </Link>
          .
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="new-pass" className="mb-1 block text-sm font-medium text-slate-700">
            New password
          </label>
          <PasswordField
            id="new-pass"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm-pass" className="mb-1 block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <PasswordField
            id="confirm-pass"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !tokenFromUrl}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
        <div className="space-y-2" aria-live="polite">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          )}
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <PageBack href="/login" ariaLabel="Back to login" />
          <Link href="/catalog" className="text-xl font-bold text-primary-600">
            Electronics Shop
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Loading…
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Back to staff login
          </Link>
        </p>
      </main>
    </div>
  );
}
