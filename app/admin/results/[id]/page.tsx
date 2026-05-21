"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import QuestionResult from "@/components/admin/QuestionResult";

type Aggregate =
  | { type: "single_choice"; options: string[]; counts: number[]; totalVotes: number }
  | { type: "multiple_choice"; options: string[]; counts: number[]; totalVotes: number }
  | { type: "word_cloud"; freq: Record<string, number>; totalVotes: number }
  | { type: "open_ended"; texts: string[]; totalVotes: number }
  | { type: "scale"; mean: number | null; distribution: Record<number, number>; values: number[]; totalVotes: number; min: number; max: number; labels?: string[] };

interface QuestionResult {
  index: number;
  question: { question: string; type: string };
  aggregate: Aggregate;
}

interface Results {
  session: {
    id: string;
    code: string;
    participantCount: number;
    totalQuestions: number;
    startedAt: string | null;
    endedAt: string | null;
  };
  questions: QuestionResult[];
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function generateCsv(results: Results): string {
  const lines: string[] = [];
  const { session, questions } = results;

  lines.push("CMCC Poll — Session Results");
  lines.push(`Session Code,${session.code}`);
  lines.push(`Participants,${session.participantCount}`);
  lines.push(`Started,${formatDate(session.startedAt)}`);
  lines.push(`Ended,${formatDate(session.endedAt)}`);
  lines.push(`Total Questions,${session.totalQuestions}`);
  lines.push("");

  for (const q of questions) {
    const { index, question, aggregate } = q;
    lines.push(`--- Q${index + 1}: ${question.question.replace(/,/g, ";")} (${question.type}) --- ${aggregate.totalVotes} votes ---`);

    if (aggregate.type === "single_choice" || aggregate.type === "multiple_choice") {
      lines.push("Option,Count,Percentage");
      for (let i = 0; i < aggregate.options.length; i++) {
        const count = aggregate.counts[i] ?? 0;
        const pct = aggregate.totalVotes > 0 ? ((count / aggregate.totalVotes) * 100).toFixed(1) : "0.0";
        lines.push(`"${aggregate.options[i].replace(/"/g, '""')}",${count},${pct}%`);
      }
    } else if (aggregate.type === "word_cloud") {
      lines.push("Word,Count");
      const sorted = Object.entries(aggregate.freq).sort((a, b) => b[1] - a[1]);
      for (const [word, count] of sorted) {
        lines.push(`"${word}",${count}`);
      }
    } else if (aggregate.type === "open_ended") {
      lines.push("Response");
      for (const text of aggregate.texts) {
        lines.push(`"${text.replace(/"/g, '""')}"`);
      }
    } else if (aggregate.type === "scale") {
      lines.push(`Average,${aggregate.mean !== null ? aggregate.mean.toFixed(2) : "—"}`);
      lines.push("Value,Count");
      for (let v = aggregate.min; v <= aggregate.max; v++) {
        lines.push(`${v},${aggregate.distribution[v] ?? 0}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminCode = localStorage.getItem("admin_code");
    if (!adminCode) { router.replace("/admin"); return; }

    fetch(`/api/admin/sessions/${id}/results`, {
      headers: { "x-admin-code": adminCode },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error?.message ?? "Failed to load results");
        else setResults(data);
      })
      .catch(() => setError("Network error"));
  }, [id, router]);

  function exportCsv() {
    if (!results) return;
    const csv = generateCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${results.session.code}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-400 text-xl text-center">{error}</p>
        <button onClick={() => router.replace("/admin/control")} className="text-indigo-400 underline text-sm">← Back to control panel</button>
      </main>
    );
  }

  if (!results) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading results…</p>
      </main>
    );
  }

  const { session, questions } = results;

  return (
    <main className="min-h-screen flex flex-col px-4 py-8 gap-6 max-w-3xl mx-auto print:px-0 print:py-4">
      {/* Header */}
      <div className="flex flex-col gap-1 print:mb-4">
        <h1 className="text-2xl font-bold print:text-gray-900">Session Results</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400 print:text-gray-600">
          <span>Code: <span className="font-mono text-white print:text-gray-900">{session.code}</span></span>
          <span>{session.participantCount} participants</span>
          <span>{session.totalQuestions} questions</span>
          {session.endedAt && <span>Ended: {formatDate(session.endedAt)}</span>}
        </div>
      </div>

      {/* Export buttons — hidden in print */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="h-10 px-5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition active:scale-95"
        >
          Export PDF
        </button>
        <button
          onClick={exportCsv}
          className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition active:scale-95"
        >
          Export CSV
        </button>
      </div>

      {/* Question results */}
      <div className="flex flex-col gap-5">
        {questions.map((q) => (
          <QuestionResult
            key={q.index}
            index={q.index}
            questionText={q.question.question}
            aggregate={q.aggregate}
          />
        ))}
      </div>
    </main>
  );
}
