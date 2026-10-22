"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LifeBuoy, X } from "lucide-react";
import { z } from "zod";
import { formatDateTime } from "@/lib/date-format";

const SupportTicketSchema = z.object({
  ticketId: z.string(),
  category: z.string(),
  status: z.string(),
  messages: z.array(z.object({
    id: z.string(),
    senderDiscordId: z.string(),
    body: z.string(),
    createdAt: z.string(),
    isTeamReply: z.boolean(),
  })),
});
const SupportTicketsSchema = z.object({ tickets: z.array(SupportTicketSchema) });

async function fetchSupportTickets() {
  const response = await fetch("/api/support", { cache: "no-store" });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("Your support conversations could not be loaded.");
  const parsed = SupportTicketsSchema.safeParse(body);
  if (!parsed.success) throw new Error("The support conversation response was invalid.");
  return parsed.data.tickets;
}

export function SupportMessageModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<"question" | "problem" | "feedback">("question");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<z.infer<typeof SupportTicketSchema>[]>([]);
  const [activeTicketId, setActiveTicketId] = useState("");

  useEffect(() => {
    let active = true;
    fetchSupportTickets()
      .then((loaded) => {
        if (!active) return;
        setTickets(loaded);
        setActiveTicketId(loaded[0]?.ticketId ?? "");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Support conversations could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(activeTicketId ? { ticketId: activeTicketId } : {}), category, message }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Your message could not be sent.";
        throw new Error(detail);
      }
      setMessage("");
      setSent(true);
      const loaded = await fetchSupportTickets();
      setTickets(loaded);
      setActiveTicketId((current) => current || loaded[0]?.ticketId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  const selectedTicket = tickets.find((ticket) => ticket.ticketId === activeTicketId);
  return <div className="support-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <header className="support-modal-header">
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close support"><ArrowLeft size={17} /></button>
        <span className="support-brand-icon"><LifeBuoy size={19} /></span>
        <div><strong id="support-title">Message Alypne</strong><span>Questions, problems or feedback</span></div>
        <button className="icon-button support-close" type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      <div className="support-modal-body">
        {sent && <div className="support-success"><span className="support-brand-icon"><LifeBuoy size={21} /></span><strong>Message sent to Alypne support</strong><button className="button button-plain" type="button" onClick={() => setSent(false)}>Continue conversation</button></div>}
        {!tickets.length && !sent && <div className="support-intro"><span className="support-brand-icon support-brand-large"><LifeBuoy size={25} /></span><h2>Message the Alypne team</h2><p>Tell us what you need help with. Your message is sent privately to Alypne support.</p></div>}
        {tickets.length > 0 && <div className="support-thread">
          <label className="sr-only" htmlFor="support-thread">Choose a support conversation</label>
          <select id="support-thread" className="select" value={activeTicketId} onChange={(event) => { setActiveTicketId(event.target.value); setSent(false); }}>
            {tickets.map((ticket) => <option value={ticket.ticketId} key={ticket.ticketId}>{ticket.category} · {ticket.status.replace("_", " ")}</option>)}
            <option value="">Start a new conversation</option>
          </select>
          <div className="support-thread-messages">{selectedTicket?.messages.map((item) => <article className={`support-bubble${item.isTeamReply ? " support-bubble-team" : ""}`} key={item.id}><p>{item.body}</p><time>{formatDateTime(item.createdAt)}</time></article>)}</div>
          {selectedTicket?.status === "resolved" && <p className="settings-help">This conversation is closed. Choose “Start a new conversation” to contact Alypne again.</p>}
        </div>}
      </div>
      {!sent && <form className="support-message-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="support-category">Message type</label>
        <select id="support-category" className="select" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
          <option value="question">Question</option><option value="problem">Report a problem</option><option value="feedback">Feedback</option>
        </select>
        <label className="sr-only" htmlFor="support-message">Message</label>
        <textarea id="support-message" className="input" required maxLength={2000} rows={3} autoFocus value={message} disabled={selectedTicket?.status === "resolved"} onChange={(event) => setMessage(event.target.value)} placeholder="Message the Alypne team…" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={sending || !message.trim() || selectedTicket?.status === "resolved"}>{sending ? "Sending…" : "Send message"}</button>
      </form>}
    </section>
  </div>;
}
