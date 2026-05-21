"use client";

import { useState } from "react";

interface Props {
  options: string[];
  onSubmit: (value: { type: "multiple_choice"; option_indices: number[] }) => Promise<void>;
  disabled?: boolean;
}

export default function MultipleChoiceInput({ options, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(i: number) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await onSubmit({ type: "multiple_choice", option_indices: Array.from(selected).sort((a, b) => a - b) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          disabled={disabled}
          className={`min-h-[56px] w-full rounded-2xl px-5 py-3 text-left text-base font-medium transition active:scale-95 flex items-center gap-3 ${
            selected.has(i)
              ? "bg-indigo-600 border-2 border-indigo-400"
              : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
          } disabled:opacity-60`}
        >
          <span className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
            selected.has(i) ? "border-white bg-white" : "border-gray-500"
          }`}>
            {selected.has(i) && (
              <svg viewBox="0 0 12 12" className="w-3 h-3 text-indigo-600" fill="currentColor">
                <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {opt}
        </button>
      ))}
      <button
        onClick={handleSubmit}
        disabled={selected.size === 0 || loading || disabled}
        className="mt-2 h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
