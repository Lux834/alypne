import { z } from "zod";
import { SocialPlatformSchema } from "@/lib/campaigns";

export const SubmissionCreateSchema = z.object({
  campaignSlug: z.string().min(1).max(120),
  platform: SocialPlatformSchema,
  videoUrl: z.string().url().max(2048),
  title: z.string().trim().max(160).optional(),
});

const hostByPlatform: Record<z.infer<typeof SocialPlatformSchema>, string[]> = {
  TikTok: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"],
  YouTube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  Instagram: ["instagram.com", "www.instagram.com"],
};

export function canonicalVideoUrl(platform: z.infer<typeof SocialPlatformSchema>, rawUrl: string) {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || !hostByPlatform[platform].includes(host)) {
    throw new Error("The video URL must be a public HTTPS link on the selected platform.");
  }

  if (platform === "YouTube" && (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com")) {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
        throw new Error("The YouTube link must identify a specific video.");
      }
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (!path || path === "/") throw new Error("The video URL must identify a specific post.");
  const canonicalHost = host === "youtu.be" ? "youtu.be" : host.replace(/^(www|m|vm)\./, "");
  return `https://${canonicalHost}${path}`;
}
