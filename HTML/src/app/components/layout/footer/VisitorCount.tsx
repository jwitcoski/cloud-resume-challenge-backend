"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DEFAULT_URL =
  "https://hmye7a6tg1.execute-api.us-east-1.amazonaws.com/beta";
const SESSION_KEY = "witcoski-visitor-count";

function parseCount(payload: unknown): number | null {
  if (payload == null || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  if (typeof data.Count === "number") return data.Count;
  if (typeof data.Count === "string" && data.Count.trim() !== "") {
    const n = Number(data.Count);
    return Number.isFinite(n) ? n : null;
  }

  // Older Lambda proxy shape: { statusCode, body: "{\"Count\": N}" }
  if (typeof data.body === "string") {
    try {
      return parseCount(JSON.parse(data.body));
    } catch {
      return null;
    }
  }

  return null;
}

export default function VisitorCount() {
  const [count, setCount] = useState<string | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      setCount(cached);
      return;
    }

    const url = process.env.NEXT_PUBLIC_VISITOR_COUNT_URL || DEFAULT_URL;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const value = parseCount(json);
        if (cancelled || value == null) return;
        const formatted = value.toLocaleString();
        sessionStorage.setItem(SESSION_KEY, formatted);
        setCount(formatted);
      } catch {
        if (!cancelled) setCount(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (count == null) return null;

  return (
    <p className="text-sm text-secondary">
      <Link
        href="/cloud-resume-challenge/#visitor-counter"
        className="hover:text-primary hover:underline underline-offset-2"
      >
        Page views: <span className="text-primary font-medium">{count}</span>
      </Link>
    </p>
  );
}
