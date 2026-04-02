import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  try {
    const list = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list coupons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      code,
      percentOff,
      fixedOff,
      maxUses,
      minOrderTotal,
      startsAt,
      endsAt,
      active,
    } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    const norm = code.trim().toUpperCase();
    if (norm.length < 2) {
      return NextResponse.json({ error: "code too short" }, { status: 400 });
    }

    const pct =
      percentOff != null && percentOff !== "" ? parseFloat(String(percentOff)) : null;
    const fixed =
      fixedOff != null && fixedOff !== "" ? parseFloat(String(fixedOff)) : null;
    if ((pct == null || Number.isNaN(pct) || pct <= 0) && (fixed == null || Number.isNaN(fixed) || fixed <= 0)) {
      return NextResponse.json({ error: "Set percentOff and/or fixedOff" }, { status: 400 });
    }
    if (pct != null && !Number.isNaN(pct) && (pct <= 0 || pct > 100)) {
      return NextResponse.json({ error: "percentOff must be 1–100" }, { status: 400 });
    }

    const row = await prisma.coupon.create({
      data: {
        code: norm,
        percentOff: pct != null && !Number.isNaN(pct) ? pct : null,
        fixedOff: fixed != null && !Number.isNaN(fixed) ? fixed : null,
        maxUses: maxUses != null && maxUses !== "" ? parseInt(String(maxUses), 10) : null,
        minOrderTotal:
          minOrderTotal != null && minOrderTotal !== ""
            ? parseFloat(String(minOrderTotal))
            : 0,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        active: active !== false,
      },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique")) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
