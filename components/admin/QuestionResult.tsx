"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import WordCloud from "@/components/shared/WordCloud";

type Aggregate =
  | { type: "multiple_choice"; options: string[]; counts: number[]; totalVotes: number }
  | { type: "word_cloud"; freq: Record<string, number>; totalVotes: number }
  | { type: "open_ended"; texts: string[]; totalVotes: number }
  | { type: "scale"; mean: number | null; distribution: Record<number, number>; values: number[]; totalVotes: number; min: number; max: number; labels?: string[] };

interface Props {
  index: number;
  questionText: string;
  aggregate: Aggregate;
}

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

export default function QuestionResult({ index, questionText, aggregate }: Props) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4 print:bg-white print:border print:border-gray-200 print:rounded-none">
      <div>
        <p className="text-xs text-gray-400 print:text-gray-500">Question {index + 1}</p>
        <h2 className="text-lg font-semibold mt-0.5 print:text-gray-900">{questionText}</h2>
      </div>

      {aggregate.type === "multiple_choice" && (
        <div>
          <p className="text-sm text-gray-400 mb-3 print:text-gray-500">{aggregate.totalVotes} votes</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={aggregate.options.map((opt, i) => ({ name: opt, count: aggregate.counts[i] ?? 0 }))}
              margin={{ left: 0, right: 0, top: 0, bottom: 40 }}
            >
              <XAxis dataKey="name" tick={{ fill: "#d1d5db", fontSize: 12 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {aggregate.options.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {aggregate.type === "word_cloud" && (
        <div>
          <p className="text-sm text-gray-400 mb-3 print:text-gray-500">{aggregate.totalVotes} responses</p>
          <WordCloud freq={aggregate.freq} />
        </div>
      )}

      {aggregate.type === "open_ended" && (
        <div>
          <p className="text-sm text-gray-400 mb-3 print:text-gray-500">{aggregate.totalVotes} responses</p>
          <div className="flex flex-col gap-2">
            {aggregate.texts.map((text, i) => (
              <div key={i} className="bg-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 print:bg-gray-100 print:text-gray-800 print:rounded">
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {aggregate.type === "scale" && (
        <div>
          <p className="text-sm text-gray-400 mb-1 print:text-gray-500">{aggregate.totalVotes} votes</p>
          {aggregate.mean !== null && (
            <p className="text-3xl font-bold mb-4 text-indigo-400 print:text-indigo-600">
              Avg: {aggregate.mean.toFixed(1)}
            </p>
          )}
          {aggregate.labels && (
            <div className="flex justify-between text-xs text-gray-400 mb-2 print:text-gray-500">
              <span>{aggregate.labels[0]}</span>
              <span>{aggregate.labels[1]}</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={Array.from({ length: aggregate.max - aggregate.min + 1 }, (_, i) => {
                const v = aggregate.min + i;
                return { value: v, count: aggregate.distribution[v] ?? 0 };
              })}
              margin={{ left: 0, right: 0 }}
            >
              <XAxis dataKey="value" tick={{ fill: "#d1d5db", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
