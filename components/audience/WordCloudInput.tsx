"use client";

import { useState, useRef } from "react";

interface Props {
  maxWords: number;
  onSubmit: (value: { words: string[] }) => Promise<void>;
  disabled?: boolean;
}

export default function WordCloudInput({ maxWords, onSubmit, disabled }: Props) {
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addWord() {
    const trimmed = current.trim().toLowerCase();
    if (!trimmed || words.includes(trimmed) || words.length >= maxWords) return;
    setWords([...words, trimmed]);
    setCurrent("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }

  function removeWord(w: string) {
    setWords(words.filter((x) => x !== w));
  }

  async function handleSubmit() {
    if (words.length === 0) return;
    setLoading(true);
    try {
      await onSubmit({ words });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="text-sm text-gray-400">{words.length}/{maxWords} words</p>

      {words.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <button
              key={w}
              onClick={() => removeWord(w)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full bg-indigo-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
            >
              {w} <span className="text-indigo-300">×</span>
            </button>
          ))}
        </div>
      )}

      {words.length < maxWords && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
            placeholder="Type a word…"
            disabled={disabled}
            className="flex-1 h-14 px-4 rounded-xl bg-gray-800 border border-gray-600 text-base focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            maxLength={40}
          />
          <button
            onClick={addWord}
            disabled={!current.trim() || disabled}
            className="h-14 px-5 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold disabled:opacity-40 transition"
          >
            Add
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={words.length === 0 || loading || disabled}
        className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-semibold disabled:opacity-40 transition active:scale-95"
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
