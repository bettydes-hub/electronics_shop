"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBack } from "@/components/ui/PageBack";
import { PasswordField } from "@/components/ui/PasswordField";
import { dashboardPathForRole } from "@/lib/staff-routes";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendInfo, setResendInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onResend = async () => {
    setResendError("");
    setResendInfo("");
    setSubmitError("");
    const e = email.trim().toLowerCase();
    if (!e) {
      setResendError("Enter your email first.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-staff-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendError(typeof data.error === "string" ? data.error : "Could not send code");
        return;
      }
      setResendInfo("A new code was sent to your email.");
    } catch {
      setResendError("Network error. Try again.");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setResendError("");
    setResendInfo("");
    if (password !== password2) {
      setSubmitError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-staff-registration", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "Registration failed");
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
      window.location.assign(dashboardPathForRole(roleNorm));
    } catch {
      setSubmitError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Complete your staff account</h1>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">
              Work email *
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="reg-code" className="mb-1 block text-sm font-medium text-slate-700">
                Verification code from email *
              </label>
              <input
                id="reg-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 digits"
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
              />
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <button
                type="button"
                onClick={onResend}
                disabled={resending}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </div>
          <div className="space-y-2 sm:pl-0" aria-live="polite">
            {resendError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{resendError}</div>
            )}
            {resendInfo && (
              <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{resendInfo}</div>
            )}
          </div>
          <div>
            <label htmlFor="reg-user" className="mb-1 block text-sm font-medium text-slate-700">
              Choose username *
            </label>
            <input
              id="reg-user"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="letters, numbers, . _ - (3–32 characters)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="reg-pass" className="mb-1 block text-sm font-medium text-slate-700">
              Password * (min 8 characters)
            </label>
            <PasswordField
              id="reg-pass"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reg-pass2" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password *
            </label>
            <PasswordField
              id="reg-pass2"
              autoComplete="new-password"
              required
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Create my account"}
          </button>
          <div className="space-y-2" aria-live="polite">
            {submitError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
