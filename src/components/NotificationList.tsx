"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { formatDateTime } from "@/lib/date-format";

const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
const ResponseSchema = z.object({ notifications: z.array(NotificationSchema) });
type Notification = z.infer<typeof NotificationSchema>;

async function loadNotifications() {
  const response = await fetch("/api/notifications", { cache: "no-store" });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
      ? result.error
      : "Notifications could not be loaded.";
    throw new Error(message);
  }
  const parsed = ResponseSchema.safeParse(result);
  if (!parsed.success) throw new Error("The notification response was invalid.");
  return parsed.data.notifications;
}

export function NotificationList() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadNotifications()
      .then((data) => { if (active) setItems(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Notifications could not be loaded."); });
    return () => { active = false; };
  }, []);

  async function markRead(id?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Notification state could not be updated.";
        throw new Error(message);
      }
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => (!id || item.id === id) ? { ...item, readAt: now } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notification state could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const hasUnread = items.some((item) => !item.readAt);
  return (
    <div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {hasUnread && <div className="filter-row"><button className="button button-outline" type="button" onClick={() => markRead()} disabled={busy}>Mark all as read</button></div>}
      {!items.length ? <div className="empty-state"><h2>You’re all caught up</h2><p>Campaign and account updates will appear here.</p></div> : <div className="notification-list">
        {items.map((item) => <article className={`panel notification-item${item.readAt ? "" : " unread"}`} key={item.id}>
          <div className="notification-copy"><span className="notification-dot" aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.body}</p><time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></div></div>
          <div className="notification-actions"><Link className="text-link" href={item.href}>Open →</Link>{!item.readAt && <button className="button button-plain" type="button" disabled={busy} onClick={() => markRead(item.id)}>Mark read</button>}</div>
        </article>)}
      </div>}
    </div>
  );
}
