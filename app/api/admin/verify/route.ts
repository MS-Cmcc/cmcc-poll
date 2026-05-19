import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = body.code ?? req.headers.get("x-admin-code");
  if (!code || code !== process.env.ADMIN_CODE) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid admin code" } },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
