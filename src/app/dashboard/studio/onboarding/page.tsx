import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getAuthenticatedUser, isAllowlistedAdmin } from "@/lib/auth";
import { StudioOnboardingForm } from "@/components/StudioOnboardingForm";

export const metadata = { title: "Studio setup" };

export default async function StudioOnboardingPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  return <DashboardShell role="studio" title="Studio setup" description="Create a studio workspace before managing campaigns." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper={user.roles.includes("developer") || isAllowlistedAdmin(user)} showTutorial={!user.onboardingCompleted} studioCanManageCampaigns={false}><StudioOnboardingForm /></DashboardShell>;
}
