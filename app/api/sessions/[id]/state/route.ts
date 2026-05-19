import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/db/queries";

// GET /api/sessions/[id]/state — minimal public endpoint polled by audience clients
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionById(id);

  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    totalQuestions: session.questions_snapshot.length,
  });
}
