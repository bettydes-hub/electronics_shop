"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  dashboardPathForRole,
  profilePathForRole,
  sessionMayAccessStaffArea,
  type StaffDashboardArea,
} from "@/lib/staff-routes";
import { readStaffSession } from "@/lib/staff-session";

export type StaffDashboardGateStatus = "pending" | "ok";

type GateOptions = {
  wrongRoleTo?: "dashboard" | "profile";
};

/**
 * Blocks rendering until staff session is verified for this area.
 */
export function useStaffDashboardGate(
  area: StaffDashboardArea | null,
  options?: GateOptions
): StaffDashboardGateStatus {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [status, setStatus] = useState<StaffDashboardGateStatus>("pending");
  const wrongRoleTo = options?.wrongRoleTo ?? "dashboard";

  useLayoutEffect(() => {
    setStatus("pending");
    if (!area) return;

    const { id, role } = readStaffSession();
    if (!id) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!sessionMayAccessStaffArea(role, area)) {
      const dest =
        wrongRoleTo === "profile" ? profilePathForRole(role) : dashboardPathForRole(role);
      router.replace(dest);
      return;
    }
    setStatus("ok");
  }, [router, pathname, area, wrongRoleTo]);

  return status;
}

export function StaffDashboardGateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-600">
      Checking access…
    </div>
  );
}
