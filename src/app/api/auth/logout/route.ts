import { NextResponse } from "next/server";
import { clearStaffSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

export async function POST() {
  clearStaffSessionCookieInRouteHandler();
  return NextResponse.json({ ok: true });
}
