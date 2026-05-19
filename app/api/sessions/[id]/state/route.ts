import { NextRequest, NextResponse } from "next/server";
import { getSessionById, getParticipantCount } from "@/lib/db/queries";

// GET /api/sessions/[id]/state — polled by audience and control panel
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

  const participantCount = await getParticipantCount(id);
  const questions = session.questions_snapshot as unknown[];
  const currentQuestion = questions[session.current_question_index] ?? null;

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    totalQuestions: questions.length,
    currentQuestion,
    participantCount,
  });
}
