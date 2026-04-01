import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInviteCodeAndSendEmail } from "@/lib/staff-invite";

/** Public: resend invite code to email if there is a pending (INVITED) staff row. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, staffStatus: true },
    });

    if (!user || user.staffStatus !== "INVITED") {
      return NextResponse.json(
        { error: "No pending invitation for this email. Ask your admin to invite you." },
        { status: 404 }
      );
    }

    const r = await createInviteCodeAndSendEmail(user.id, user.email);
    if (!r.sent) {
      return NextResponse.json(
        {
          error: r.error || "Could not send email. Ask your admin to check SMTP (or EMAIL_USER / EMAIL_PASS) in .env.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
