"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "@/components/shared/QRCode";

interface SessionState {
  sessionId: string;
  status: "active" | "ended" | "draft";
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: { question: string; type: string } | null;
  participantCount: number;
}

export default function ControlPage() {
  const router = useRouter();
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [session, setSession] = useState<{ id: string; code: string; display_token: string } | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem("admin_code");
    if (!code) { router.replace("/admin"); return; }
    setAdminCode(code);
    const saved = localStorage.getItem("admin_session");
    if (saved) {
      try { setSession(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [router]);

  const fetchState = useCallback(async () => {
    if (!session || !adminCode) return;
    try {
      const res = await fetch(`/api/admin/sessions/${session.id}/state`, {
        headers: { "x-admin-code": adminCode },
      });
      if (res.ok) setState(await res.json());
    } catch { /* ignore */ }
  }, [session, adminCode]);

  useEffect(() => {
    if (!session) return;
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [session, fetchState]);

  async function createSession() {
    if (!adminCode) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "x-admin-code": adminCode },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Failed to create session");
        if (data.error?.details) setError(data.error.details.join("\n"));
        return;
      }
      const s = data.session;
      localStorage.setItem("admin_session", JSON.stringify({ id: s.id, code: s.code, display_token: s.display_token }));
      setSession({ id: s.id, code: s.code, display_token: s.display_token });
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function sendAction(action: "next" | "prev" | "end") {
    if (!session || !adminCode) return;
    if (action === "end") { setEnding(true); }
    try {
      const res = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "x-admin-code": adminCode, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === "end") {
          window.open(`/admin/results/${session.id}`, "_blank");
          localStorage.removeItem("admin_session");
          setSession(null);
          setState(null);
          setConfirmEnd(false);
        } else {
          await fetchState();
        }
      }
    } finally {
      setEnding(false);
    }
  }

  const displayUrl = session
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/admin/display?token=${session.display_token}`
    : null;

  if (!adminCode) return null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-6 max-w-sm mx-auto">
      <h1 className="text-xl font-bold">Control Panel</h1>

      {!session ? (
        <div className="flex flex-col gap-4 w-full">
          {error && <pre className="text-red-400 text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded-xl">{error}</pre>}
          <button
            onClick={createSession}
            disabled={creating}
            className="h-16 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xl font-semibold disabled:opacity-40 transition active:scale-95"
          >
            {creating ? "Starting…" : "Start New Session"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full">
          {/* Join code */}
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Join code</p>
            <p className="text-5xl font-mono font-bold tracking-widest">{session.code}</p>
          </div>

          {/* Display QR */}
          {displayUrl && (
            <div className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2">
              <p className="text-xs text-gray-400">Scan with laptop to open display panel</p>
              <QRCode value={displayUrl} size={200} />
            </div>
          )}

          {/* Session state */}
          {state && (
            <div className="bg-gray-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Participants</span>
                <span className="font-semibold">{state.participantCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Question</span>
                <span className="font-semibold">{state.currentQuestionIndex + 1} / {state.totalQuestions}</span>
              </div>
              {state.currentQuestion && (
                <p className="text-sm mt-1 text-gray-200">{state.currentQuestion.question}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          {state?.status === "active" && (
            <div className="flex gap-3">
              <button
                onClick={() => sendAction("prev")}
                disabled={!state || state.currentQuestionIndex === 0}
                className="flex-1 h-16 rounded-2xl bg-gray-700 hover:bg-gray-600 text-lg font-semibold disabled:opacity-30 transition active:scale-95"
              >
                ← Prev
              </button>
              <button
                onClick={() => sendAction("next")}
                disabled={!state || state.currentQuestionIndex >= state.totalQuestions - 1}
                className="flex-1 h-16 rounded-2xl bg-gray-700 hover:bg-gray-600 text-lg font-semibold disabled:opacity-30 transition active:scale-95"
              >
                Next →
              </button>
            </div>
          )}

          {/* End session */}
          {state?.status === "active" && !confirmEnd && (
            <button
              onClick={() => setConfirmEnd(true)}
              className="h-14 w-full rounded-2xl border border-red-600 text-red-400 hover:bg-red-900/30 font-semibold transition"
            >
              End Session
            </button>
          )}
          {confirmEnd && (
            <div className="bg-red-900/40 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm text-center">End session? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmEnd(false)} className="flex-1 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold transition">Cancel</button>
                <button onClick={() => sendAction("end")} disabled={ending} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 font-semibold disabled:opacity-40 transition">
                  {ending ? "Ending…" : "Confirm End"}
                </button>
              </div>
            </div>
          )}

          {state?.status === "ended" && (
            <div className="text-center text-gray-400 text-sm">Session ended.</div>
          )}
        </div>
      )}
    </main>
  );
}
