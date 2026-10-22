export type SupportMessageDocument = {
  id: string;
  senderDiscordId: string;
  body: string;
  createdAt: Date;
};

export type SupportTicketDocument = {
  ticketId: string;
  targetDiscordId: string;
  category: "question" | "problem" | "feedback";
  status: "open" | "in_progress" | "resolved";
  messages: SupportMessageDocument[];
  createdAt: Date;
  updatedAt: Date;
};
