import { DashboardOverview } from "@/components/DashboardOverview";
import { DashboardShell } from "@/components/DashboardShell";
import { isAllowlistedAdmin, requireDashboardAccess } from "@/lib/auth";
import { getCreatorDashboardMetrics } from "@/lib/dashboard-data";

export const metadata = { title: "Creator dashboard" };

export default async function CreatorDashboardPage() {
  const user = await requireDashboardAccess("creator");
  const metrics = await getCreatorDashboardMetrics(user.discordId);
  return <DashboardShell role="creator" title="Overview" description="Your campaign and clip activity at a glance." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper={user.roles.includes("developer") || isAllowlistedAdmin(user)} showTutorial={!user.onboardingCompleted}><DashboardOverview role="creator" metrics={metrics} /></DashboardShell>;
}
