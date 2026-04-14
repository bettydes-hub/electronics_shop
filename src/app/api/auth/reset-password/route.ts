import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { rateLimitExceeded } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (await rateLimitExceeded(request, "auth-reset-password", 20, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const result = await resetPasswordWithToken(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
