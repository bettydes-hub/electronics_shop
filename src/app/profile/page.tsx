"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { profilePathForRole } from "@/lib/staff-routes";
import { readStaffSession } from "@/lib/staff-session";

/** Legacy `/profile` → role-scoped `/admin/profile`, `/owner/profile`, or `/seller/profile`. */
export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const { id, role } = readStaffSession();
    if (!id) {
      router.replace("/login?next=/profile");
      return;
    }
    router.replace(profilePathForRole(role));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <p className="text-slate-600">Redirecting…</p>
    </div>
  );
}
