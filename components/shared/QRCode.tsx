"use client";

import { useState } from "react";

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 200 }: Props) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(value);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&bgcolor=1f2937&color=ffffff&margin=10`;

  async function copyUrl() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="QR Code" width={size} height={size} className="rounded-xl" />
      <button
        onClick={copyUrl}
        className="text-xs text-gray-400 hover:text-white transition underline"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
