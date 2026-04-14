import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isValidStaffUsername,
  normalizeStaffUsername,
} from "@/lib/staff-invite";
import { rateLimitExceeded } from "@/lib/rate-limit";
import { setStaffSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

export async function POST(request: NextRequest) {
  if (await rateLimitExceeded(request, "auth-complete-registration", 20, 3_600_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const codeRaw = typeof body.code === "string" ? body.code.trim().replace(/\s/g, "") : "";
    const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
    const username = normalizeStaffUsername(usernameRaw);
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !codeRaw || !username || !password) {
      return NextResponse.json(
        { error: "Email, code, username, and password are required" },
        { status: 400 }
      );
    }
    if (!isValidStaffUsername(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–32 characters: lowercase letters, numbers, dots, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, staffStatus: true, role: true },
    });

    if (!user || user.staffStatus !== "INVITED") {
      return NextResponse.json(
        { error: "No pending invitation for this email, or this account is already active." },
        { status: 400 }
      );
    }

    const now = new Date();
    const inviteRows = await prisma.staffInviteCode.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, codeHash: true },
    });

    let matchedId: string | null = null;
    for (const row of inviteRows) {
      const ok = await bcrypt.compare(codeRaw, row.codeHash);
      if (ok) {
        matchedId = row.id;
        break;
      }
    }

    if (!matchedId) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const taken = await prisma.user.findFirst({
      where: { username, staffStatus: "ACTIVE" },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rawName = usernameRaw.trim();
    const name =
      rawName.length > 0
        ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
        : username;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.staffInviteCode.deleteMany({ where: { userId: user.id } });
      return tx.user.update({
        where: { id: user.id },
        data: {
          username,
          passwordHash,
          name,
          staffStatus: "ACTIVE",
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
        },
      });
    });

    await setStaffSessionCookieInRouteHandler(updated.id, String(updated.role));
    return NextResponse.json({
      ...updated,
      role: String(updated.role),
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
