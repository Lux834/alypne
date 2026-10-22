import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/mongodb";
import { getSessionIdentity } from "@/lib/session";
import type { PlatformPermission } from "@/lib/platform-permissions";

export type AlypneUser = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  onboardingCompleted?: boolean;
  developerPermissions?: PlatformPermission[];
};

export function isAllowlistedAdmin(user: Pick<AlypneUser, "discordId" | "roles">) {
  return user.discordId === process.env.ADMIN_DISCORD_ID?.trim() && user.roles.includes("admin");
}

export async function getAuthenticatedUser(): Promise<AlypneUser | null> {
  const identity = await getSessionIdentity();
  if (!identity) return null;

  const db = await getDatabase();
  return db.collection<AlypneUser>("users").findOne(
    { discordId: identity.discordId, disabled: { $ne: true } },
    { projection: { _id: 0, discordId: 1, username: 1, displayName: 1, avatarUrl: 1, roles: 1, onboardingCompleted: 1, developerPermissions: 1 } },
  );
}

export async function getAdminUser(): Promise<AlypneUser | null> {
  const user = await getAuthenticatedUser();
  return user && isAllowlistedAdmin(user) ? user : null;
}

export async function getDeveloperUser(): Promise<AlypneUser | null> {
  const user = await getAuthenticatedUser();
  return user && (isAllowlistedAdmin(user) || user.roles.includes("developer")) ? user : null;
}

export function hasPlatformPermission(user: AlypneUser, permission: PlatformPermission) {
  return isAllowlistedAdmin(user) || user.developerPermissions?.includes(permission) === true;
}

export async function requireDeveloperAccess() {
  const user = await getDeveloperUser();
  if (!user) redirect("/dashboard/creator");
  return user;
}

export async function requireAdminAccess() {
  const user = await getAdminUser();
  if (!user) redirect("/dashboard/creator");
  return user;
}

export async function requireDashboardAccess(role: "creator" | "studio") {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  if (role === "creator") {
    if (!user.roles.includes("creator")) redirect("/sign-in?error=forbidden");
    return user;
  }
  const db = await getDatabase();
  const membership = await db.collection("studios").findOne({
    status: { $ne: "suspended" },
    $or: [{ ownerDiscordId: user.discordId }, { memberDiscordIds: user.discordId }],
  }, { projection: { _id: 1 } });
  if (!membership) redirect("/dashboard/studio/onboarding");
  return user;
}
