"use client";
import { useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3011";
export default function FindingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [matterId, setMatterId] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(
    null,
  );
  const [status, setStatus] = useState("Enter a matter to load its findings.");
  async function load() {
    setStatus("Loading findings…");
    const response = await fetch(
      `${api}/v1/findings/dashboard?matterId=${encodeURIComponent(matterId)}`,
      { headers: { authorization: `Bearer ${apiKey}` } },
    );
    const body = (await response.json()) as Record<string, unknown>;
    setDashboard(response.ok ? body : null);
    setStatus(response.ok ? "Findings loaded." : "Could not load findings.");
  }
  return (
    <main>
      <section className="hero compact">
        <p className="eyebrow">Compliance overview</p>
        <h1>Evidence-backed findings.</h1>
      </section>
      <section className="panel">
        <label>
          Reviewer API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <label>
          Matter ID
          <input
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
          />
        </label>
        <button type="button" disabled={!apiKey || !matterId} onClick={load}>
          Load dashboard
        </button>
        <p className="status" aria-live="polite">
          {status}
        </p>
        {dashboard && <pre>{JSON.stringify(dashboard, null, 2)}</pre>}
      </section>
    </main>
  );
}
