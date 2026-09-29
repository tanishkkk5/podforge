"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Incorrect password.");

      const redirectTo = searchParams.get("redirect") || "/admin";
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="section" style={{ maxWidth: 380 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Admin Login</h1>
          <p>Log in once to access every production and guest kit tool.</p>
        </div>
      </header>

      <div className="wrap">
        <Suspense fallback={<p className="hint">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
