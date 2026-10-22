import { DashboardShell } from "@/components/DashboardShell";
import { CampaignCreateForm } from "@/components/CampaignCreateForm";
import { isAllowlistedAdmin, requireDashboardAccess } from "@/lib/auth";
import { getSafeStudioBannerUrl, getSafeStudioWebsiteUrl, getUserStudio, hasStudioPermission } from "@/lib/studio";

export const metadata = { title: "Create campaign draft" };

export default async function NewCampaignPage() {
  const user = await requireDashboardAccess("studio");
  const studio = await getUserStudio(user);
  const canManageCampaigns = studio && hasStudioPermission(studio, user.discordId, "campaigns:manage");
  return <DashboardShell role="studio" title="New campaign" description="Draft a clear, eligible campaign brief." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper={user.roles.includes("developer") || isAllowlistedAdmin(user)} showTutorial={!user.onboardingCompleted} studioCanManageCampaigns={Boolean(canManageCampaigns)} workspace={studio ? { name: studio.name, description: typeof studio.description === "string" ? studio.description : null, websiteUrl: getSafeStudioWebsiteUrl(studio), bannerUrl: getSafeStudioBannerUrl(studio) } : undefined}>{canManageCampaigns ? <CampaignCreateForm /> : <div className="empty-state"><h2>Campaign access not granted</h2><p>Ask your workspace owner to grant campaign management access.</p></div>}</DashboardShell>;
}
