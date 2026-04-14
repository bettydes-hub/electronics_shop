import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitExceeded } from "@/lib/rate-limit";
import { setStaffSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

export async function POST(request: NextRequest) {
  if (await rateLimitExceeded(request, "auth-login", 30, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        staffStatus: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    if (user.staffStatus === "INVITED") {
      return NextResponse.json(
        {
          error:
            "This account is not finished. Complete registration with the code we emailed you at /register.",
        },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const { passwordHash: _, ...safe } = user;
    await setStaffSessionCookieInRouteHandler(user.id, String(safe.role));
    return NextResponse.json({
      ...safe,
      role: String(safe.role),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
