"use client";

import { useState } from "react";

interface Props {
  options: string[];
  onSubmit: (value: { type: "single_choice"; option_index: number }) => Promise<void>;
  disabled?: boolean;
}

export default function SingleChoiceInput({ options, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (selected === null) return;
    setLoading(true);
    try {
      await onSubmit({ type: "single_choice", option_index: selected });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => !disabled && setSelected(i)}
          disabled={disabled}
          className={`min-h-[56px] w-full rounded-2xl px-5 py-3 text-left text-base font-medium transition active:scale-95 ${
            selected === i
              ? "bg-indigo-600 border-2 border-indigo-400"
              : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
          } disabled:opacity-60`}
        >
          {opt}
        </button>
      ))}
      <button
        onClick={handleSubmit}
        disabled={selected === null || loading || disabled}
        className="mt-2 h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
