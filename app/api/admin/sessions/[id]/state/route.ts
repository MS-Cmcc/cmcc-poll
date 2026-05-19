import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { getSessionStateForAdmin } from "@/lib/db/queries";

// GET /api/admin/sessions/[id]/state — protected; used by the control panel
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const row = await getSessionStateForAdmin(id);

  if (!row) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  const currentQuestion = row.questions_snapshot[row.current_question_index] ?? null;

  return NextResponse.json({
    sessionId: row.id,
    status: row.status,
    currentQuestionIndex: row.current_question_index,
    totalQuestions: row.questions_snapshot.length,
    currentQuestion,
    participantCount: row.participantCount,
  });
}
