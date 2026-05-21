import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { getSessionStateForAdmin } from "@/lib/db/queries";
import { getVotesForSession } from "@/lib/db/queries";
import type { Question } from "@/lib/md/schemas";

type Aggregate =
  | { type: "single_choice"; options: string[]; counts: number[]; totalVotes: number }
  | { type: "multiple_choice"; options: string[]; counts: number[]; totalVotes: number }
  | { type: "word_cloud"; freq: Record<string, number>; totalVotes: number }
  | { type: "open_ended"; texts: string[]; totalVotes: number }
  | { type: "scale"; mean: number | null; distribution: Record<number, number>; values: number[]; totalVotes: number; min: number; max: number; labels?: string[] };

function computeAggregate(question: Question, votes: { value: Record<string, unknown> }[]): Aggregate {
  if (question.type === "single_choice") {
    const counts = new Array<number>(question.options.length).fill(0);
    for (const v of votes) {
      const idx = (v.value as { option_index: number }).option_index;
      if (idx >= 0 && idx < counts.length) counts[idx]++;
    }
    return { type: "single_choice", options: question.options, counts, totalVotes: votes.length };
  }
  if (question.type === "multiple_choice") {
    const counts = new Array<number>(question.options.length).fill(0);
    for (const v of votes) {
      for (const idx of (v.value as { option_indices: number[] }).option_indices ?? []) {
        if (idx >= 0 && idx < counts.length) counts[idx]++;
      }
    }
    return { type: "multiple_choice", options: question.options, counts, totalVotes: votes.length };
  }
  if (question.type === "word_cloud") {
    const freq: Record<string, number> = {};
    for (const v of votes) {
      for (const word of ((v.value as { words: string[] }).words ?? [])) {
        const w = word.toLowerCase().trim();
        if (w) freq[w] = (freq[w] ?? 0) + 1;
      }
    }
    return { type: "word_cloud", freq, totalVotes: votes.length };
  }
  if (question.type === "open_ended") {
    const texts = votes.map((v) => (v.value as { text: string }).text).filter(Boolean);
    return { type: "open_ended", texts, totalVotes: votes.length };
  }
  // scale
  const values = votes.map((v) => (v.value as { value: number }).value);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const distribution: Record<number, number> = {};
  for (const val of values) distribution[val] = (distribution[val] ?? 0) + 1;
  return { type: "scale", mean, distribution, values, totalVotes: votes.length, min: question.min, max: question.max, labels: question.labels };
}

// GET /api/admin/sessions/[id]/results — full session results, only for ended sessions
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
  const [session, allVotes] = await Promise.all([
    getSessionStateForAdmin(id),
    getVotesForSession(id),
  ]);

  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }

  if (session.status !== "ended") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Results available only after session ends" } },
      { status: 403 }
    );
  }

  const votesByQuestion = new Map<number, typeof allVotes>();
  for (const vote of allVotes) {
    const bucket = votesByQuestion.get(vote.question_index) ?? [];
    bucket.push(vote);
    votesByQuestion.set(vote.question_index, bucket);
  }

  const questions = session.questions_snapshot.map((q, index) => ({
    index,
    question: q,
    aggregate: computeAggregate(q, votesByQuestion.get(index) ?? []),
  }));

  return NextResponse.json({
    session: {
      id: session.id,
      code: session.code,
      status: session.status,
      participantCount: session.participantCount,
      totalQuestions: session.questions_snapshot.length,
      startedAt: session.started_at,
      endedAt: session.ended_at,
    },
    questions,
  });
}
