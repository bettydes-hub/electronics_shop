"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { profilePathForRole } from "@/lib/staff-routes";
import { canManageStaff, clearStaffSession, readStaffSession, type StaffSessionInfo } from "@/lib/staff-session";

type Props = {
  /** When set and the user is a Seller, show a link to sign in as Admin/Owner (e.g. on /admin). */
  staffElevateHref?: string;
};

export function StaffNavSession({ staffElevateHref }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [session, setSession] = useState<StaffSessionInfo>(() => readStaffSession());

  useEffect(() => {
    setSession(readStaffSession());
  }, [pathname]);

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (!session.id) {
    return (
      <Link
        href={loginHref}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        Staff login
      </Link>
    );
  }

  const display = session.username ?? `${session.id.slice(0, 8)}…`;

  async function signOut() {
    await clearStaffSession();
    setSession(readStaffSession());
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="text-slate-600">
        Signed in: <span className="font-medium text-slate-900">{display}</span>
        {session.role ? (
          <span className={session.role === "SELLER" ? "text-amber-700" : "text-primary-600"}>
            {" "}
            ({session.role})
          </span>
        ) : null}
      </span>
      {staffElevateHref && session.role && !canManageStaff(session.role) ? (
        <Link
          href={staffElevateHref}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          Admin / Owner sign-in
        </Link>
      ) : null}
      <Link
        href={profilePathForRole(session.role)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Profile
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
        <button
          type="button"
          onClick={signOut}
          className="text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
