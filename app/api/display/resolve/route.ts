import { NextRequest, NextResponse } from "next/server";
import { getSessionByDisplayToken } from "@/lib/db/queries";

// GET /api/display/resolve?token=<display_token>
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "token is required" } },
      { status: 400 }
    );
  }

  const session = await getSessionByDisplayToken(token);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Invalid display token" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ sessionId: session.id });
}
