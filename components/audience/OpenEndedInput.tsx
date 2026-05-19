"use client";

import { useState } from "react";

interface Props {
  onSubmit: (value: { text: string }) => Promise<void>;
  disabled?: boolean;
}

export default function OpenEndedInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit({ text: trimmed });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your answer…"
        disabled={disabled}
        rows={4}
        maxLength={2000}
        className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-base focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-60"
      />
      <p className="text-xs text-gray-500 text-right">{text.length}/2000</p>
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading || disabled}
        className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
