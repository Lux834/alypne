"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function StudioInviteAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"ready" | "accepting" | "accepted" | "error">("ready");
  const [error, setError] = useState("");

  async function accept() {
    setState("accepting");
    setError("");
    try {
      const response = await fetch("/api/studios/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "This invite could not be accepted.";
        throw new Error(message);
      }
      setState("accepted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This invite could not be accepted.");
      setState("error");
    }
  }

  useEffect(() => {
    if (state !== "accepted") return;
    const timeout = window.setTimeout(() => router.replace("/dashboard/studio"), 900);
    return () => window.clearTimeout(timeout);
  }, [router, state]);

  return (
    <section className="panel invite-acceptance">
      <span className="eyebrow">STUDIO WORKSPACE</span>
      <h1>{state === "accepted" ? "You’re on the team" : state === "error" ? "Invite unavailable" : "Joining workspace"}</h1>
      <p>{state === "error" ? error : state === "accepted" ? "Your workspace access is ready. Opening your studio…" : "An owner invited you to join their studio workspace."}</p>
      {state === "ready" && <button className="button button-primary" type="button" onClick={() => void accept()}>Accept invite</button>}
      {state === "accepting" && <button className="button button-primary" type="button" disabled>Joining workspace…</button>}
      {state === "error" && <Link className="button button-outline" href="/dashboard/creator">Back to creator dashboard</Link>}
    </section>
  );
}
