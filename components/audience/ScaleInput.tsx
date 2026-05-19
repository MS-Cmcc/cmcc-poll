"use client";

import { useState } from "react";

interface Props {
  min: number;
  max: number;
  labels?: string[];
  onSubmit: (value: { value: number }) => Promise<void>;
  disabled?: boolean;
}

export default function ScaleInput({ min, max, labels, onSubmit, disabled }: Props) {
  const mid = Math.round((min + max) / 2);
  const [value, setValue] = useState(mid);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await onSubmit({ value });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Current value — big and visible */}
      <div className="text-center">
        <span className="text-7xl font-bold text-indigo-400">{value}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="w-full h-3 accent-indigo-500 cursor-pointer disabled:opacity-60"
      />

      <div className="flex justify-between text-sm text-gray-400">
        <span>{labels?.[0] ?? min}</span>
        <span>{labels?.[1] ?? max}</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || disabled}
        className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
