import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
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
