import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/db/queries";

// GET /api/sessions/[id]/questions/[index] — returns a single question by index
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: indexParam } = await params;

  const indexNum = Number(indexParam);
  if (!Number.isInteger(indexNum) || indexNum < 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "index must be a non-negative integer" } },
      { status: 400 }
    );
  }

  const session = await getSessionById(id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  const question = session.questions_snapshot[indexNum];
  if (!question) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Question not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ question });
}
