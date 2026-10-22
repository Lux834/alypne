import { z } from "zod";

export const DiscordProfileSchema = z.object({
  id: z.string().regex(/^\d+$/),
  username: z.string().min(1).max(100),
  global_name: z.string().max(100).nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export type DiscordProfile = z.infer<typeof DiscordProfileSchema>;

export function discordAvatarUrl(profile: DiscordProfile) {
  if (!profile.avatar) return null;
  const extension = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${extension}?size=128`;
}
