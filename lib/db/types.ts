import type { Question } from "@/lib/md/schemas";

export type SessionStatus = "draft" | "active" | "ended";
export type QuestionType = "single_choice" | "multiple_choice" | "word_cloud" | "open_ended" | "scale";

export interface Session {
  id: string;
  code: string;
  questions_source: string;
  questions_snapshot: Question[];
  current_question_index: number;
  display_token: string;
  status: SessionStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface Participant {
  id: string;
  session_id: string;
  client_token: string;
  joined_at: string;
}

export interface Vote {
  id: string;
  session_id: string;
  participant_id: string;
  question_index: number;
  question_type: QuestionType;
  value: Record<string, unknown>;
  created_at: string;
}

