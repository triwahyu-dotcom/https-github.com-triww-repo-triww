"use client";

import { useState, useTransition } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@juara.local");
  const [password, setPassword] = useState("juaraadmin");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Email atau password salah.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next;
    });
  }

  return (
    <main className="hub-shell">
      <section className="hub-hero">
        <p className="hub-kicker">Admin Login</p>
        <h1>Masuk ke workspace vendor dan projects</h1>
        <p>Default lokal: `admin@juara.local` / `juaraadmin`. Ganti dengan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` saat deploy.</p>
      </section>

      <form className="panel vendor-form-card" onSubmit={handleSubmit}>
        <section className="vendor-form-grid">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </section>
        {error ? <p className="form-message error">{error}</p> : null}
        <div className="vendor-form-actions">
          <button className="primary-button" type="submit">
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
