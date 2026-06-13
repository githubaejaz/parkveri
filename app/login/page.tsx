"use client";

import { useState } from "react";
import { supabase } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      router.push("/");
    }

    setLoading(false);
  }

  return (
    <main className="max-w-md mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        🔐 ParkVeri Login
      </h1>

      <input
        className="border p-3 w-full mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-3 w-full mb-3"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="text-red-600 mb-3">{error}</p>
      )}

      <button
        onClick={login}
        disabled={loading}
        className="bg-black text-white w-full py-3 rounded"
      >
        {loading ? "Logging in..." : "Login"}
      </button>

    </main>
  );
}