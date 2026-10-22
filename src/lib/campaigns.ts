import { z } from "zod";

export const SocialPlatformSchema = z.enum(["TikTok", "YouTube", "Instagram"]);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const CampaignPublicSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  gameName: z.string().min(1),
  description: z.string(),
  platforms: z.array(SocialPlatformSchema).min(1),
  ratePerThousand: z.number().nonnegative(),
  perClipCap: z.number().nonnegative(),
  budgetRemaining: z.number().nonnegative(),
  startsAt: z.string(),
  endsAt: z.string(),
  preview: z.boolean().optional(),
});

export type PublicCampaign = z.infer<typeof CampaignPublicSchema>;

export type CampaignDocument = PublicCampaign & {
  studioId: string;
  totalBudget: number;
  status: "draft" | "active" | "paused" | "completed";
  visibility: "private" | "public";
  createdAt: Date;
  updatedAt: Date;
};

export const CampaignCreateSchema = z.object({
  title: z.string().trim().min(3).max(100),
  gameName: z.string().trim().min(2).max(100),
  gameUrl: z.union([
    z.literal(""),
    z.string().url().refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && ["roblox.com", "www.roblox.com"].includes(url.hostname);
    }, "Use an official HTTPS Roblox game URL."),
  ]),
  objective: z.string().trim().min(5).max(500),
  description: z.string().trim().min(10).max(4000),
  requiredContent: z.string().trim().max(2000),
  prohibitedContent: z.string().trim().max(2000),
  disclosure: z.string().trim().max(500),
  platforms: z.array(SocialPlatformSchema).min(1).max(3),
  ratePerThousand: z.number().finite().nonnegative().max(100_000),
  perClipCap: z.number().finite().nonnegative().max(1_000_000),
  totalBudget: z.number().finite().positive().max(10_000_000),
  startsAt: z.iso.date({ error: "Choose a valid campaign start date." }),
  endsAt: z.iso.date({ error: "Choose a valid campaign end date." }),
}).refine(({ startsAt }) => startsAt >= new Date().toISOString().slice(0, 10), {
  message: "Campaign start date cannot be in the past.",
  path: ["startsAt"],
}).refine(({ startsAt, endsAt }) => endsAt > startsAt, {
  message: "End date must be after the start date.",
  path: ["endsAt"],
});

export const demoCampaigns: PublicCampaign[] = [
  {
    slug: "creator-campaign-preview",
    title: "Creator campaign preview",
    gameName: "Sample game",
    description: "Illustrative campaign brief shown only in development preview mode.",
    platforms: ["TikTok"],
    ratePerThousand: 3,
    perClipCap: 100,
    budgetRemaining: 2500,
    startsAt: "2026-01-01",
    endsAt: "2027-01-01",
    preview: true,
  },
  {
    slug: "studio-launch-preview",
    title: "Studio launch preview",
    gameName: "Sample game",
    description: "Illustrative campaign brief shown only in development preview mode.",
    platforms: ["YouTube"],
    ratePerThousand: 2.5,
    perClipCap: 150,
    budgetRemaining: 3500,
    startsAt: "2026-01-01",
    endsAt: "2027-01-01",
    preview: true,
  },
  {
    slug: "community-highlights-preview",
    title: "Community highlights",
    gameName: "Sample game",
    description: "Illustrative campaign brief shown only in development preview mode.",
    platforms: ["Instagram"],
    ratePerThousand: 2,
    perClipCap: 80,
    budgetRemaining: 1800,
    startsAt: "2026-01-01",
    endsAt: "2027-01-01",
    preview: true,
  },
];
