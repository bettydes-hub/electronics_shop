import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { createInviteCodeAndSendEmail } from "@/lib/staff-invite";

const ROLES = ["OWNER", "SELLER", "ADMIN"] as const;
type StaffRole = (typeof ROLES)[number];

function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

const userListSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  role: true,
  staffStatus: true,
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: userListSelect,
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!isStaffRole(role)) {
      return NextResponse.json(
        { error: "Role must be OWNER, SELLER, or ADMIN" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, staffStatus: true },
    });

    if (existing?.staffStatus === "ACTIVE") {
      return NextResponse.json(
        { error: "An active staff member already uses this email" },
        { status: 409 }
      );
    }

    if (existing?.staffStatus === "INVITED") {
      const r = await createInviteCodeAndSendEmail(existing.id, existing.email);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: existing.id },
        select: userListSelect,
      });
      return NextResponse.json({
        ...user,
        verificationEmailSent: r.sent,
        ...(r.error ? { verificationEmailError: r.error } : {}),
      });
    }

    const localPart = email.split("@")[0] || "staff";
    const user = await prisma.user.create({
      data: {
        email,
        name: localPart,
        role,
        staffStatus: "INVITED",
        username: null,
        passwordHash: null,
      },
      select: userListSelect,
    });

    const r = await createInviteCodeAndSendEmail(user.id, user.email);
    return NextResponse.json({
      ...user,
      verificationEmailSent: r.sent,
      ...(r.error ? { verificationEmailError: r.error } : {}),
    });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (msg === "P2002") {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to invite staff" }, { status: 500 });
  }
}
