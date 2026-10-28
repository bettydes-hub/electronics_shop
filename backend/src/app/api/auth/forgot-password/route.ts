import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { requestPasswordReset } from "@/lib/password-reset";
import { rateLimitExceeded } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (await rateLimitExceeded(request, "auth-forgot-password", 10, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const username = typeof o.username === "string" ? o.username : "";
  const email = typeof o.email === "string" ? o.email : "";

  try {
    const origin = getPublicOrigin(request);
    const result = await requestPasswordReset({ username, email }, origin);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: result.message });
  } catch (e) {
    console.error("forgot-password route:", e);
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    return NextResponse.json(
      { error: msg.length < 200 ? msg : "Check server logs." },
      { status: 500 }
    );
  }
}
