"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAnonClient } from "@/lib/db/client";
import AggregateDisplay from "@/components/admin/AggregateDisplay";
import type { Question } from "@/lib/md/schemas";

interface SessionState {
  sessionId: string;
  status: "active" | "ended" | "draft";
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  participantCount: number;
}

function DisplayContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const channelRef = useRef<ReturnType<typeof getAnonClient>["channel"] extends (...args: infer A) => infer R ? R : never | null>(null);

  useEffect(() => {
    setAdminCode(localStorage.getItem("admin_code"));
  }, []);

  const fetchState = useCallback(async (id: string, code: string | null) => {
    if (code) {
      const res = await fetch(`/api/admin/sessions/${id}/state`, {
        headers: { "x-admin-code": code },
      });
      if (res.ok) { setState(await res.json()); return; }
    }
    // Fallback if no admin_code: slim public state + separate question fetch
    const res = await fetch(`/api/sessions/${id}/state`);
    if (!res.ok) return;
    const slim = await res.json();
    const qRes = await fetch(`/api/sessions/${id}/questions/${slim.currentQuestionIndex}`);
    const question = qRes.ok ? (await qRes.json()).question : null;
    setState({ ...slim, currentQuestion: question, participantCount: 0 });
  }, []);

  // Resolve display_token → session
  useEffect(() => {
    if (!token) { setError("No display token provided"); return; }
    fetch(`/api/display/resolve?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.sessionId) setSessionId(d.sessionId);
        else setError("Invalid or expired display token");
      })
      .catch(() => setError("Failed to connect"));
  }, [token]);

  // Subscribe to Supabase Realtime + initial fetch
  useEffect(() => {
    if (!sessionId) return;
    fetchState(sessionId, adminCode);

    const supabase = getAnonClient();
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      }, () => fetchState(sessionId, adminCode))
      .subscribe();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelRef.current = channel as any;

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchState, adminCode]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Connecting…</p>
      </div>
    );
  }

  if (state.status === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-3xl font-bold">Session ended</p>
        <p className="text-gray-400">Thank you for participating!</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-8 gap-6">
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <p className="text-gray-400 text-sm">Question {state.currentQuestionIndex + 1} / {state.totalQuestions}</p>
          <h1 className="text-3xl font-bold mt-1 max-w-3xl">
            {state.currentQuestion?.question ?? "Loading…"}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-5xl font-bold text-indigo-400">{state.participantCount}</p>
          <p className="text-gray-400 text-sm">participants</p>
        </div>
      </div>

      {/* Aggregate visualization */}
      {sessionId && state.currentQuestion && (
        <div className="flex-1">
          <AggregateDisplay
            sessionId={sessionId}
            questionIndex={state.currentQuestionIndex}
            questionType={state.currentQuestion.type}
          />
        </div>
      )}

      {/* Footer: join code */}
      <div className="flex justify-end items-center gap-2 text-gray-500 text-sm">
        <span>Join at this page</span>
        <span className="font-mono text-white text-lg">
          {typeof window !== "undefined" ? window.location.hostname : ""}
        </span>
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <DisplayContent />
    </Suspense>
  );
}
