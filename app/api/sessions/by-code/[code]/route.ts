import { NextRequest, NextResponse } from "next/server";
import { getSessionByCode } from "@/lib/db/queries";

// GET /api/sessions/by-code/[code] — validate a join code
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const session = await getSessionByCode(code);

  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }
  if (session.status !== "active") {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_ACTIVE", message: "Session is not active" } },
      { status: 400 }
    );
  }

  return NextResponse.json({ sessionId: session.id });
}
