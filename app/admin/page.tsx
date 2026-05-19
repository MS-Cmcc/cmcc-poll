"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError("Invalid admin code");
        return;
      }
      localStorage.setItem("admin_code", code);
      router.push("/admin/control");
    } catch {
      setError("Network error, please retry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="password"
          placeholder="Admin code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-14 px-4 rounded-xl bg-gray-800 border border-gray-600 text-lg focus:outline-none focus:border-indigo-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!code || loading}
          className="h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg disabled:opacity-40 transition active:scale-95"
        >
          {loading ? "Verifying…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
