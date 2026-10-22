import { getDatabase } from "@/lib/mongodb";
import type { AlypneUser } from "@/lib/auth";

export const studioPermissions = [
  "campaigns:read",
  "campaigns:manage",
  "submissions:read",
  "submissions:review",
  "analytics:read",
] as const;
export type StudioPermission = (typeof studioPermissions)[number];

export async function getUserStudio(user: AlypneUser) {
  const db = await getDatabase();
  return db.collection("studios").findOne({
    status: { $ne: "suspended" },
    $or: [{ ownerDiscordId: user.discordId }, { memberDiscordIds: user.discordId }],
  });
}

export function hasStudioPermission(
  studio: unknown,
  discordId: string,
  permission: StudioPermission,
) {
  if (typeof studio !== "object" || studio === null) return false;
  if ("ownerDiscordId" in studio && studio.ownerDiscordId === discordId) return true;
  if (!("memberPermissions" in studio) || typeof studio.memberPermissions !== "object" || studio.memberPermissions === null) return false;
  const permissions = Reflect.get(studio.memberPermissions, discordId);
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function getSafeStudioBannerUrl(studio: unknown) {
  if (typeof studio !== "object" || studio === null || !("bannerUrl" in studio) || typeof studio.bannerUrl !== "string") return null;
  try {
    const url = new URL(studio.bannerUrl);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function getSafeStudioWebsiteUrl(studio: unknown) {
  if (typeof studio !== "object" || studio === null || !("websiteUrl" in studio) || typeof studio.websiteUrl !== "string") return null;
  try {
    const url = new URL(studio.websiteUrl);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
