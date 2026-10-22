"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { formatDate } from "@/lib/date-format";

const SubmissionSchema = z.object({
  id: z.string(),
  campaignTitle: z.string(),
  platform: z.string(),
  videoUrl: z.string().url(),
  title: z.string(),
  status: z.string(),
  submittedAt: z.string(),
  reviewNote: z.string().optional(),
});
const SubmissionsSchema = z.object({ submissions: z.array(SubmissionSchema) });
type Submission = z.infer<typeof SubmissionSchema>;

async function fetchSubmissions(studio: boolean) {
  const response = await fetch(studio ? "/api/studio/submissions" : "/api/submissions", { cache: "no-store" });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
      ? result.error
      : "Submissions could not be loaded.";
    throw new Error(message);
  }
  const parsed = SubmissionsSchema.safeParse(result);
  if (!parsed.success) throw new Error("The submission response was invalid.");
  return parsed.data.submissions;
}

export function SubmissionLists({ studio = false, canReview = true }: { studio?: boolean; canReview?: boolean }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    fetchSubmissions(studio)
      .then((data) => { if (active) setSubmissions(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Submissions could not be loaded."); });
    return () => { active = false; };
  }, [studio]);

  async function review(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/studio/submissions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Review could not be saved.";
        throw new Error(message);
      }
      setSubmissions(await fetchSubmissions(studio));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  if (error && !submissions.length) return <div className="empty-state" role="alert"><h2>Submissions unavailable</h2><p>{error}</p></div>;
  if (!submissions.length) return <div className="empty-state"><h2>No submissions yet</h2><p>Submissions appear here after creators share an eligible public video link.</p></div>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error && <div className="demo-banner" role="alert">{error}</div>}
      {submissions.map((submission) => (
        <article className="panel" key={submission.id}>
          <div className="panel-heading">{submission.title || submission.campaignTitle}<span>{submission.status.replaceAll("_", " ")}</span></div>
          <p style={{ color: "var(--muted)", fontSize: 11 }}>{submission.campaignTitle} · {submission.platform} · {formatDate(submission.submittedAt)}</p>
          <a className="text-link" href={submission.videoUrl} target="_blank" rel="noreferrer">Open submitted video →</a>
          {submission.reviewNote && <p style={{ color: "var(--muted)", fontSize: 11 }}>Review note: {submission.reviewNote}</p>}
          {studio && canReview && submission.status === "pending_review" && <div className="filter-row" style={{ marginTop: 12, marginBottom: 0 }}><button className="button button-primary" type="button" disabled={busyId === submission.id} onClick={() => review(submission.id, "approved")}>Approve</button><button className="button button-outline" type="button" disabled={busyId === submission.id} onClick={() => review(submission.id, "rejected")}>Reject</button></div>}
        </article>
      ))}
    </div>
  );
}
