"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBack } from "@/components/ui/PageBack";
import { PasswordField } from "@/components/ui/PasswordField";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [username, setUsername] = useState("admin");
  const [email, setEmail] = useState("admin@localhost");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/bootstrap");
        const data = await res.json();
        if (!cancelled) {
          if (data.needsSetup === true) {
            setAllowed(true);
          } else {
            setAllowed(false);
          }
        }
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          name: name.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Setup failed");
        return;
      }
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          username: data.username,
          name: data.name,
          email: data.email,
          role: String(data.role ?? "").toUpperCase() || "ADMIN",
        })
      );
      window.location.assign("/admin");
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
          <PageBack href="/login" ariaLabel="Back to staff login" />
          <Link href="/catalog" className="text-xl font-bold text-primary-600">
            Electronics Shop
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">First-time setup</h1>
        <p className="mt-2 text-sm text-slate-600">
          Only works when there are no users yet. Then use{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            /login
          </Link>
          .
        </p>

        {checking ? (
          <p className="mt-8 text-slate-500">Checking…</p>
        ) : !allowed ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            <p className="font-semibold">Setup is already done</p>
            <p className="mt-2">
              An account already exists. Sign in at{" "}
              <Link href="/login" className="font-medium text-primary-700 underline">
                /login
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="su-user" className="mb-1 block text-sm font-medium text-slate-700">
                Username *
              </label>
              <input
                id="su-user"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="su-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email *
              </label>
              <input
                id="su-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="su-name" className="mb-1 block text-sm font-medium text-slate-700">
                Display name
              </label>
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="su-pass" className="mb-1 block text-sm font-medium text-slate-700">
                Password * (min 8 characters)
              </label>
              <PasswordField
                id="su-pass"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="su-pass2" className="mb-1 block text-sm font-medium text-slate-700">
                Confirm password *
              </label>
              <PasswordField
                id="su-pass2"
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
              {loading ? "Creating…" : "Create admin & go to Admin panel"}
            </button>
            <div className="space-y-2" aria-live="polite">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
              )}
            </div>
          </form>
          </>
        )}
      </main>
    </div>
  );
}
