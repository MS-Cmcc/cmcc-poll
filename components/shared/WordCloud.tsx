"use client";

interface Props {
  freq: Record<string, number>;
}

const COLORS = [
  "#818cf8", "#a78bfa", "#34d399", "#60a5fa", "#f472b6",
  "#fbbf24", "#fb923c", "#4ade80", "#38bdf8", "#e879f9",
];

export default function WordCloud({ freq }: Props) {
  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40);
  if (entries.length === 0) return <p className="text-gray-500 text-sm">No words yet</p>;

  const maxCount = entries[0][1];

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center py-4 min-h-40">
      {entries.map(([word, count], i) => {
        const ratio = count / maxCount;
        const fontSize = Math.round(14 + ratio * 42); // 14px to 56px
        return (
          <span
            key={word}
            style={{ fontSize: `${fontSize}px`, color: COLORS[i % COLORS.length] }}
            className="font-bold leading-tight select-none"
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
