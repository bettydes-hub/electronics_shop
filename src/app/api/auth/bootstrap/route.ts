import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isValidStaffUsername, normalizeStaffUsername } from "@/lib/staff-invite";
import { setStaffSiteSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

/**
 * First-time shop setup only: allowed when there are zero users in the database.
 * After the first admin exists, use Staff sign-in or Admin → Staff to add accounts.
 */
export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ needsSetup: false, error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const existing = await prisma.user.count();
    if (existing > 0) {
      return NextResponse.json(
        { error: "This shop is already set up. Sign in at /login instead." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
    const username = normalizeStaffUsername(usernameRaw);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name =
      (typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : usernameRaw || username) || "Administrator";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !email) {
      return NextResponse.json(
        { error: "Username and email are required" },
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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        name,
        passwordHash,
        role: "ADMIN",
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

    setStaffSiteSessionCookieInRouteHandler();
    return NextResponse.json({
      ...user,
      role: String(user.role),
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "That username or email is already taken" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
