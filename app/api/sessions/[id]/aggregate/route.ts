import { NextRequest, NextResponse } from "next/server";
import { getSessionById, getVotesByQuestion } from "@/lib/db/queries";
import type { Question } from "@/lib/md/schemas";

// GET /api/sessions/[id]/aggregate?q=<questionIndex>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const qParam = req.nextUrl.searchParams.get("q");
  const questionIndex = qParam !== null ? parseInt(qParam, 10) : NaN;
  if (isNaN(questionIndex)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "q param required" } },
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

  const questions = session.questions_snapshot as Question[];
  const question = questions[questionIndex];
  if (!question) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Question index out of range" } },
      { status: 400 }
    );
  }

  const votes = await getVotesByQuestion(id, questionIndex);
  const totalVotes = votes.length;

  let aggregate: unknown;

  if (question.type === "multiple_choice") {
    const counts: number[] = new Array(question.options.length).fill(0);
    for (const v of votes) {
      const val = v.value as { option_index: number };
      if (val.option_index >= 0 && val.option_index < counts.length) {
        counts[val.option_index]++;
      }
    }
    aggregate = { type: "multiple_choice", counts, options: question.options, totalVotes };
  } else if (question.type === "word_cloud") {
    const freq: Record<string, number> = {};
    for (const v of votes) {
      const val = v.value as { words: string[] };
      for (const word of val.words ?? []) {
        const w = word.toLowerCase().trim();
        if (w) freq[w] = (freq[w] ?? 0) + 1;
      }
    }
    aggregate = { type: "word_cloud", freq, totalVotes };
  } else if (question.type === "open_ended") {
    const texts = votes.map((v) => (v.value as { text: string }).text).filter(Boolean);
    aggregate = { type: "open_ended", texts, totalVotes };
  } else if (question.type === "scale") {
    const values = votes.map((v) => (v.value as { value: number }).value);
    const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const distribution: Record<number, number> = {};
    for (const val of values) {
      distribution[val] = (distribution[val] ?? 0) + 1;
    }
    aggregate = { type: "scale", mean, distribution, values, totalVotes, min: question.min, max: question.max, labels: question.labels };
  }

  return NextResponse.json({ aggregate });
}
