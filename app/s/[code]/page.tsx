"use client";

import { useEffect, useState, useCallback, use } from "react";
import MultipleChoiceInput from "@/components/audience/MultipleChoiceInput";
import WordCloudInput from "@/components/audience/WordCloudInput";
import OpenEndedInput from "@/components/audience/OpenEndedInput";
import ScaleInput from "@/components/audience/ScaleInput";
import type {
  Question,
  MultipleChoiceQuestion,
  WordCloudQuestion,
  ScaleQuestion,
} from "@/lib/md/schemas";

interface SessionState {
  sessionId: string;
  status: "active" | "ended" | "draft";
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  participantCount: number;
}

function getOrCreateToken(sessionId: string): string {
  const key = `menti_token_${sessionId}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

function getParticipantId(sessionId: string): string | null {
  return localStorage.getItem(`menti_pid_${sessionId}`);
}

function setParticipantId(sessionId: string, pid: string) {
  localStorage.setItem(`menti_pid_${sessionId}`, pid);
}

function hasVotedLocally(sessionId: string, questionIndex: number): boolean {
  return localStorage.getItem(`menti_voted_${sessionId}_${questionIndex}`) === "1";
}

function markVotedLocally(sessionId: string, questionIndex: number) {
  localStorage.setItem(`menti_voted_${sessionId}_${questionIndex}`, "1");
}

export default function AudiencePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantIdState] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(true);
  const [submitError, setSubmitError] = useState("");

  // Join session
  useEffect(() => {
    let mounted = true;
    async function join() {
      try {
        // 1. Validate code
        const codeRes = await fetch(`/api/sessions/by-code/${code}`);
        if (!codeRes.ok) {
          const d = await codeRes.json();
          if (mounted) setError(d.error?.message ?? "Session not found");
          return;
        }
        const { sessionId: sid } = await codeRes.json();
        if (!mounted) return;

        // 2. Get/create client token
        const clientToken = getOrCreateToken(sid);

        // 3. Register participant
        const partRes = await fetch(`/api/sessions/${sid}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientToken }),
        });
        if (!partRes.ok) {
          const d = await partRes.json();
          if (mounted) setError(d.error?.message ?? "Failed to join");
          return;
        }
        const { participantId: pid } = await partRes.json();
        if (!mounted) return;

        setParticipantId(sid, pid);
        setSessionId(sid);
        setParticipantIdState(pid);
      } catch {
        if (mounted) setError("Network error, please retry");
      } finally {
        if (mounted) setJoining(false);
      }
    }
    join();
    return () => { mounted = false; };
  }, [code]);

  const fetchState = useCallback(async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/sessions/${sessionId}/state`);
    if (res.ok) {
      const data: SessionState = await res.json();
      setState((prev) => {
        // Reset voted flag if question changed
        if (prev && prev.currentQuestionIndex !== data.currentQuestionIndex) {
          setVoted(hasVotedLocally(sessionId, data.currentQuestionIndex));
        }
        return data;
      });
    }
  }, [sessionId]);

  // Set initial voted state when session loads
  useEffect(() => {
    if (sessionId && state) {
      setVoted(hasVotedLocally(sessionId, state.currentQuestionIndex));
    }
  }, [sessionId, state?.currentQuestionIndex]); // eslint-disable-line

  // Poll for state changes
  useEffect(() => {
    if (!sessionId) return;
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [sessionId, fetchState]);

  async function handleVote(value: Record<string, unknown>) {
    if (!sessionId || !participantId || !state) return;
    setSubmitError("");
    const res = await fetch(`/api/sessions/${sessionId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        questionIndex: state.currentQuestionIndex,
        value,
      }),
    });
    if (res.ok || res.status === 409) {
      markVotedLocally(sessionId, state.currentQuestionIndex);
      setVoted(true);
    } else {
      const d = await res.json();
      setSubmitError(d.error?.message ?? "Failed to submit");
      throw new Error(d.error?.message);
    }
  }

  // --- Render states ---

  if (joining) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Joining…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-400 text-xl text-center">{error}</p>
        <a href="/" className="text-indigo-400 underline text-sm">← Back</a>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  if (state.status === "ended") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-3xl font-bold">Thanks for participating!</p>
        <p className="text-gray-400">The session has ended.</p>
      </main>
    );
  }

  if (voted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✓</div>
        <p className="text-xl font-semibold">Response submitted</p>
        <p className="text-gray-400 text-sm">Waiting for the next question…</p>
        <p className="text-xs text-gray-600 mt-4">{state.currentQuestionIndex + 1} / {state.totalQuestions}</p>
      </main>
    );
  }

  const q = state.currentQuestion;
  if (!q) return null;

  return (
    <main className="min-h-screen flex flex-col px-5 py-8 gap-6 max-w-lg mx-auto">
      <div>
        <p className="text-xs text-gray-500">{state.currentQuestionIndex + 1} / {state.totalQuestions}</p>
        <h1 className="text-xl font-bold mt-1">{q.question}</h1>
      </div>

      {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

      {q.type === "multiple_choice" && (
        <MultipleChoiceInput
          options={(q as MultipleChoiceQuestion).options}
          onSubmit={(v) => handleVote(v)}
        />
      )}
      {q.type === "word_cloud" && (
        <WordCloudInput
          maxWords={(q as { max_words?: number }).max_words ?? 3}
          onSubmit={(v) => handleVote(v)}
        />
      )}
      {q.type === "open_ended" && (
        <OpenEndedInput onSubmit={(v) => handleVote(v)} />
      )}
      {q.type === "scale" && (
        <ScaleInput
          min={(q as ScaleQuestion).min}
          max={(q as ScaleQuestion).max}
          labels={(q as ScaleQuestion).labels}
          onSubmit={(v) => handleVote(v)}
        />
      )}
    </main>
  );
}
