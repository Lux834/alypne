import { DashboardOverview } from "@/components/DashboardOverview";
import { DashboardShell } from "@/components/DashboardShell";
import { isAllowlistedAdmin, requireDashboardAccess } from "@/lib/auth";
import { getSafeStudioBannerUrl, getSafeStudioWebsiteUrl, getUserStudio, hasStudioPermission } from "@/lib/studio";
import { getStudioDashboardMetrics } from "@/lib/dashboard-data";

export const metadata = { title: "Studio dashboard" };

export default async function StudioDashboardPage() {
  const user = await requireDashboardAccess("studio");
  const studio = await getUserStudio(user);
  if (!studio) throw new Error("Studio workspace was not available after access check.");
  const analytics = hasStudioPermission(studio, user.discordId, "analytics:read");
  const metrics = analytics ? await getStudioDashboardMetrics(studio._id.toString()) : [];
  const studioAccess = {
    campaigns: hasStudioPermission(studio, user.discordId, "campaigns:manage"),
    reviews: hasStudioPermission(studio, user.discordId, "submissions:read"),
    analytics,
    settings: studio.ownerDiscordId === user.discordId,
  };
  return <DashboardShell role="studio" title="Overview" description="Campaign activity and studio performance at a glance." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper={user.roles.includes("developer") || isAllowlistedAdmin(user)} showTutorial={!user.onboardingCompleted} studioCanManageCampaigns={studioAccess.campaigns} workspace={{ name: studio.name, description: typeof studio.description === "string" ? studio.description : null, websiteUrl: getSafeStudioWebsiteUrl(studio), bannerUrl: getSafeStudioBannerUrl(studio) }}><DashboardOverview role="studio" metrics={metrics} studioAccess={studioAccess} /></DashboardShell>;
}
