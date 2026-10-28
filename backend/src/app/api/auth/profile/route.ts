import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isValidStaffUsername, normalizeStaffUsername } from "@/lib/staff-invite";
import { requireActiveStaff } from "@/lib/require-staff";
import { setStaffSessionCookieInRouteHandler } from "@/lib/staff-session-server-cookie";

export async function GET(request: NextRequest) {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate.response;

  return NextResponse.json({
    id: gate.user.id,
    username: gate.user.username,
    email: gate.user.email,
    name: gate.user.name,
    role: String(gate.user.role),
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate.response;
  const id = gate.user.id;

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      passwordHash: true,
      staffStatus: true,
      role: true,
    },
  });

  if (!existing || existing.staffStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type UpdateData = {
    name?: string;
    username?: string | null;
    email?: string;
    passwordHash?: string;
  };
  const updates: UpdateData = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (name !== existing.name) updates.name = name;
  }

  if (typeof body.username === "string") {
    const u = normalizeStaffUsername(body.username);
    if (!u) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!isValidStaffUsername(u)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–32 characters: lowercase letters, numbers, dots, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }
    if (u !== existing.username) {
      const taken = await prisma.user.findFirst({
        where: { username: u, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
      }
      updates.username = u;
    }
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (email !== existing.email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      }
      updates.email = email;
    }
  }

  const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;

  if (newPassword != null && newPassword !== "") {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    if (!existing.passwordHash) {
      return NextResponse.json({ error: "Password cannot be set here" }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Enter your current password to set a new one" }, { status: 400 });
    }
    const ok = await bcrypt.compare(currentPassword, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, username: true, email: true, name: true, role: true },
    });
    const roleStr = String(updated.role);
    if (updates.passwordHash) {
      await setStaffSessionCookieInRouteHandler(updated.id, roleStr);
    }
    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      name: updated.name,
      role: roleStr,
    });
  } catch (e: unknown) {
    console.error(e);
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Username or email is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }
}
