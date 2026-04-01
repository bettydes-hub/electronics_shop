"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageBack } from "@/components/ui/PageBack";
import { PasswordField } from "@/components/ui/PasswordField";
import { StaffDashboardGateFallback, useStaffDashboardGate } from "@/lib/staff-dashboard-gate";
import {
  dashboardPathForRole,
  parseStaffArea,
  profilePathForRole,
  sessionMayAccessStaffArea,
} from "@/lib/staff-routes";
import { readStaffSession } from "@/lib/staff-session";

function profileHeaders(): Record<string, string> {
  const { id } = readStaffSession();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (id) h["x-user-id"] = id;
  return h;
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const segment = typeof params?.staffArea === "string" ? params.staffArea : "";
  const area = parseStaffArea(segment);
  const gate = useStaffDashboardGate(area, { wrongRoleTo: "profile" });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  useLayoutEffect(() => {
    if (!area) router.replace("/catalog");
  }, [area, router]);

  useEffect(() => {
    if (!area || gate !== "ok") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/profile", { headers: profileHeaders() });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Failed to load");
          setLoading(false);
          return;
        }
        setName(typeof data.name === "string" ? data.name : "");
        setUsername(typeof data.username === "string" ? data.username : "");
        setEmail(typeof data.email === "string" ? data.email : "");
        const apiRole = typeof data.role === "string" ? data.role : "";
        setRole(apiRole);
        const r = apiRole.trim().toUpperCase();
        if (r && area && !sessionMayAccessStaffArea(r, area)) {
          router.replace(profilePathForRole(r));
        }
      } catch {
        if (!cancelled) setError("Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [area, gate, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword || newPassword2 || currentPassword) {
      if (newPassword !== newPassword2) {
        setError("New passwords do not match.");
        return;
      }
      if ((newPassword || "").length > 0 && newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
      };
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: profileHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }

      const roleNorm = String(data.role ?? "").toUpperCase() || role.toUpperCase();
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
      setSuccess("Saved.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      const correctProfile = profilePathForRole(roleNorm);
      if (area && !sessionMayAccessStaffArea(roleNorm, area)) {
        router.replace(correctProfile);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!area) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-600">Redirecting…</p>
      </div>
    );
  }

  if (gate !== "ok") {
    return <StaffDashboardGateFallback />;
  }

  const backHref = dashboardPathForRole(readStaffSession().role);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <PageBack href={backHref} ariaLabel="Back to dashboard" />
          <Link href="/catalog" className="text-xl font-bold text-primary-600">
            Electronics Shop
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update your display name, username, email, or password. Your role is set by an admin.
        </p>

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : error && !name && !email ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}{" "}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <p className="mb-1 text-sm text-slate-500">
                Role: <span className="font-medium text-slate-800">{role || "—"}</span>
              </p>
            </div>

            <div>
              <label htmlFor="prof-name" className="mb-1 block text-sm font-medium text-slate-700">
                Display name *
              </label>
              <input
                id="prof-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="prof-user" className="mb-1 block text-sm font-medium text-slate-700">
                Username *
              </label>
              <input
                id="prof-user"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-500">Lowercase, 3–32 characters; used to sign in.</p>
            </div>

            <div>
              <label htmlFor="prof-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email *
              </label>
              <input
                id="prof-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Change password (optional)</p>
              <div className="space-y-3">
                <div>
                  <label htmlFor="prof-cur" className="mb-1 block text-xs text-slate-600">
                    Current password
                  </label>
                  <PasswordField
                    id="prof-cur"
                    autoComplete="current-password"
                    disabled={saving}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="prof-new" className="mb-1 block text-xs text-slate-600">
                    New password
                  </label>
                  <PasswordField
                    id="prof-new"
                    autoComplete="new-password"
                    minLength={8}
                    disabled={saving}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="prof-new2" className="mb-1 block text-xs text-slate-600">
                    Confirm new password
                  </label>
                  <PasswordField
                    id="prof-new2"
                    autoComplete="new-password"
                    minLength={8}
                    disabled={saving}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <div className="space-y-2" aria-live="polite">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</div>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
