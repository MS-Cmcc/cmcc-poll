import { getServiceClient } from "./client";
import type { Session, Participant, Vote } from "./types";
import type { Question } from "@/lib/md/schemas";

export interface AdminSessionState {
  id: string;
  code: string;
  status: Session["status"];
  current_question_index: number;
  questions_snapshot: Question[];
  participantCount: number;
  started_at: string | null;
  ended_at: string | null;
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();
  if (error) return null;
  return data as Session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Session;
}

export async function getSessionByDisplayToken(token: string): Promise<Session | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("display_token", token)
    .single();
  if (error) return null;
  return data as Session;
}

export async function getSessionStateForAdmin(id: string): Promise<AdminSessionState | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .select(`
      id,
      code,
      status,
      current_question_index,
      questions_snapshot,
      started_at,
      ended_at,
      participants(count)
    `)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  // Supabase returns embedded count as [{ count: N }]
  const participantCount = (data.participants as unknown as { count: number }[])[0]?.count ?? 0;
  return {
    id: data.id,
    code: data.code,
    status: data.status as Session["status"],
    current_question_index: data.current_question_index,
    questions_snapshot: data.questions_snapshot as unknown as Question[],
    participantCount,
    started_at: data.started_at ?? null,
    ended_at: data.ended_at ?? null,
  };
}

export async function getParticipantCount(sessionId: string): Promise<number> {
  const db = getServiceClient();
  const { count, error } = await db
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (error) return 0;
  return count ?? 0;
}

export async function upsertParticipant(
  sessionId: string,
  clientToken: string
): Promise<Participant> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("participants")
    .upsert(
      { session_id: sessionId, client_token: clientToken },
      { onConflict: "client_token,session_id", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Participant;
}

export async function getVotesByQuestion(
  sessionId: string,
  questionIndex: number
): Promise<Vote[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("votes")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_index", questionIndex);
  if (error) return [];
  return (data ?? []) as Vote[];
}

export async function getVotesForSession(sessionId: string): Promise<Vote[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("votes")
    .select("*")
    .eq("session_id", sessionId);
  if (error) return [];
  return (data ?? []) as Vote[];
}

export async function hasVoted(
  sessionId: string,
  participantId: string,
  questionIndex: number
): Promise<boolean> {
  const db = getServiceClient();
  const { count } = await db
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("participant_id", participantId)
    .eq("question_index", questionIndex);
  return (count ?? 0) > 0;
}
