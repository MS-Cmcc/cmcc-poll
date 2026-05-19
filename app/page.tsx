"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/by-code/${code}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Session not found or not active");
        return;
      }
      router.push(`/s/${code}`);
    } catch {
      setError("Network error, please retry");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(k: string) {
    if (k === "del") {
      setCode((c) => c.slice(0, -1));
    } else if (code.length < 6) {
      const next = code + k;
      setCode(next);
      if (next.length === 6) {
        // auto-submit
        setTimeout(() => handleJoin(), 100);
      }
    }
    setError("");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Join the poll</h1>

      {/* Code display */}
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-14 flex items-center justify-center rounded-xl border-2 border-gray-600 text-2xl font-mono font-bold bg-gray-800"
          >
            {code[i] ?? ""}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
          <button
            key={i}
            onClick={() => k && handleKey(k)}
            disabled={loading || !k}
            className={`h-14 rounded-2xl text-xl font-semibold transition active:scale-95 ${
              k === "del"
                ? "bg-gray-700 hover:bg-gray-600"
                : k === ""
                ? "invisible"
                : "bg-gray-700 hover:bg-gray-600"
            } disabled:opacity-40`}
          >
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>

      <button
        onClick={handleJoin}
        disabled={code.length !== 6 || loading}
        className="w-72 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Joining…" : "Join"}
      </button>
    </main>
  );
}
