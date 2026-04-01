import { NextResponse } from "next/server";
import { clearStaffSiteSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

export async function POST() {
  clearStaffSiteSessionCookieInRouteHandler();
  return NextResponse.json({ ok: true });
}
