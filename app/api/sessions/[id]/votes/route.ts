import { NextRequest, NextResponse } from "next/server";
import { getSessionById, hasVoted } from "@/lib/db/queries";
import { getServiceClient } from "@/lib/db/client";
import { VoteValueSchema } from "@/lib/md/schemas";
import type { Question, MultipleChoiceQuestion, ScaleQuestion, WordCloudQuestion } from "@/lib/md/schemas";
import { z } from "zod";

const BodySchema = z.object({
  participantId: z.string().uuid(),
  questionIndex: z.number().int().min(0),
  value: z.record(z.string(), z.unknown()),
});

function validateVoteValue(question: Question, raw: Record<string, unknown>) {
  const withType = { ...raw, type: question.type };
  return VoteValueSchema.safeParse(withType);
}

function validateValueBounds(question: Question, value: Record<string, unknown>): string | null {
  if (question.type === "multiple_choice") {
    const q = question as MultipleChoiceQuestion;
    const idx = (value as { option_index: number }).option_index;
    if (idx < 0 || idx >= q.options.length) {
      return `option_index out of range (0-${q.options.length - 1})`;
    }
  }
  if (question.type === "scale") {
    const q = question as ScaleQuestion;
    const v = (value as { value: number }).value;
    if (v < q.min || v > q.max) {
      return `value must be between ${q.min} and ${q.max}`;
    }
  }
  if (question.type === "word_cloud") {
    const q = question as WordCloudQuestion;
    const words = (value as { words: string[] }).words;
    if (words.length > (q.max_words ?? 3)) {
      return `too many words (max ${q.max_words ?? 3})`;
    }
  }
  return null;
}

// POST /api/sessions/[id]/votes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid request body", details: parsed.error.issues } },
      { status: 400 }
    );
  }

  const { participantId, questionIndex, value } = parsed.data;
  const session = await getSessionById(id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }
  if (session.status === "ended") {
    return NextResponse.json(
      { error: { code: "SESSION_ENDED", message: "Session has ended" } },
      { status: 400 }
    );
  }

  const questions = session.questions_snapshot as Question[];
  const question = questions[questionIndex];
  if (!question) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: `Question index ${questionIndex} does not exist` } },
      { status: 400 }
    );
  }

  const valueResult = validateVoteValue(question, value);
  if (!valueResult.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid vote value", details: valueResult.error.issues } },
      { status: 400 }
    );
  }

  const boundsError = validateValueBounds(question, valueResult.data as Record<string, unknown>);
  if (boundsError) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: boundsError } },
      { status: 400 }
    );
  }

  // Check for duplicate (pre-flight; DB constraint is the real guard)
  const alreadyVoted = await hasVoted(id, participantId, questionIndex);
  if (alreadyVoted) {
    return NextResponse.json(
      { error: { code: "ALREADY_VOTED", message: "Already voted on this question" } },
      { status: 409 }
    );
  }

  const db = getServiceClient();
  const voteValue = { ...valueResult.data } as Record<string, unknown>;
  delete voteValue.type;

  const { error } = await db.from("votes").insert({
    session_id: id,
    participant_id: participantId,
    question_index: questionIndex,
    question_type: question.type,
    value: voteValue as never,
  });

  if (error) {
    // Unique constraint violation = race condition duplicate
    if (error.code === "23505") {
      return NextResponse.json(
        { error: { code: "ALREADY_VOTED", message: "Already voted on this question" } },
        { status: 409 }
      );
    }
    console.error("[votes POST]", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to record vote" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
