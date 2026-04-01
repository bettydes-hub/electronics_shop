import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { createInviteCodeAndSendEmail } from "@/lib/staff-invite";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, staffStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.staffStatus !== "INVITED") {
      return NextResponse.json(
        { error: "This person has already completed registration." },
        { status: 400 }
      );
    }

    const r = await createInviteCodeAndSendEmail(user.id, user.email);
    if (!r.sent) {
      return NextResponse.json(
        { error: r.error || "Email not sent. Check server mail settings." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to resend invite" }, { status: 500 });
  }
}
