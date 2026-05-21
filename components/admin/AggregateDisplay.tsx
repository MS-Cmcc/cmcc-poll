"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import WordCloud from "@/components/shared/WordCloud";

interface SingleChoiceAggregate {
  type: "single_choice";
  counts: number[];
  options: string[];
  totalVotes: number;
}

interface MultipleChoiceAggregate {
  type: "multiple_choice";
  counts: number[];
  options: string[];
  totalVotes: number;
}

interface WordCloudAggregate {
  type: "word_cloud";
  freq: Record<string, number>;
  totalVotes: number;
}

interface OpenEndedAggregate {
  type: "open_ended";
  texts: string[];
  totalVotes: number;
}

interface ScaleAggregate {
  type: "scale";
  mean: number | null;
  distribution: Record<number, number>;
  values: number[];
  totalVotes: number;
  min: number;
  max: number;
  labels?: string[];
}

type Aggregate = SingleChoiceAggregate | MultipleChoiceAggregate | WordCloudAggregate | OpenEndedAggregate | ScaleAggregate;

interface Props {
  sessionId: string;
  questionIndex: number;
  questionType: string;
}

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

export default function AggregateDisplay({ sessionId, questionIndex, questionType }: Props) {
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAggregate = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/aggregate?q=${questionIndex}`);
    if (res.ok) {
      const data = await res.json();
      setAggregate(data.aggregate);
    }
  }, [sessionId, questionIndex]);

  const throttledFetch = useCallback(() => {
    if (throttleRef.current) return;
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      fetchAggregate();
    }, 300);
  }, [fetchAggregate]);

  useEffect(() => {
    fetchAggregate();
    const interval = setInterval(fetchAggregate, 2000);
    return () => {
      clearInterval(interval);
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, [fetchAggregate]);

  if (!aggregate) return <div className="text-gray-500 text-sm">Loading results…</div>;

  if (aggregate.type === "single_choice" || aggregate.type === "multiple_choice") {
    const data = aggregate.options.map((opt, i) => ({
      name: opt,
      count: aggregate.counts[i] ?? 0,
    }));
    const label = aggregate.type === "multiple_choice" ? "responses" : "votes";
    return (
      <div className="w-full">
        <p className="text-sm text-gray-400 mb-3">{aggregate.totalVotes} {label}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 40 }}>
            <XAxis dataKey="name" tick={{ fill: "#d1d5db", fontSize: 13 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (aggregate.type === "word_cloud") {
    return (
      <div className="w-full">
        <p className="text-sm text-gray-400 mb-3">{aggregate.totalVotes} responses</p>
        <WordCloud freq={aggregate.freq} />
      </div>
    );
  }

  if (aggregate.type === "open_ended") {
    return (
      <div className="w-full">
        <p className="text-sm text-gray-400 mb-3">{aggregate.totalVotes} responses</p>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {aggregate.texts.slice().reverse().map((text, i) => (
            <div key={i} className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200">
              {text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (aggregate.type === "scale") {
    const distData = [];
    for (let v = aggregate.min; v <= aggregate.max; v++) {
      distData.push({ value: v, count: aggregate.distribution[v] ?? 0 });
    }
    return (
      <div className="w-full">
        <p className="text-sm text-gray-400 mb-1">{aggregate.totalVotes} votes</p>
        {aggregate.mean !== null && (
          <p className="text-4xl font-bold mb-4 text-indigo-400">
            Avg: {aggregate.mean.toFixed(1)}
          </p>
        )}
        {aggregate.labels && (
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>{aggregate.labels[0]}</span>
            <span>{aggregate.labels[1]}</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distData} margin={{ left: 0, right: 0 }}>
            <XAxis dataKey="value" tick={{ fill: "#d1d5db", fontSize: 11 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
