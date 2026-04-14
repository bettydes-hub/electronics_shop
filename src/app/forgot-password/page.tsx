"use client";

import { useState } from "react";
import Link from "next/link";
import { PageBack } from "@/components/ui/PageBack";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage(null);

    const u = username.trim();
    const em = email.trim();
    if (!u && !em) {
      setError("Enter your username, email, or both.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, email: em }),
      });

      const text = await res.text();
      let data: { error?: string; message?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError("Bad response from server. Try again.");
        return;
      }

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
        return;
      }
      setMessage(typeof data.message === "string" ? data.message : "Check your email.");
      setUsername("");
      setEmail("");
    } catch (err) {
      console.error(err);
      setError("Network error. Check your connection and try again.");
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
        <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="forgot-user" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="forgot-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="e.g. admin"
            />
          </div>
          <div>
            <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <div className="space-y-2" aria-live="polite">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            )}
            {message && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Back to staff login
          </Link>
        </p>
      </main>
    </div>
  );
}
