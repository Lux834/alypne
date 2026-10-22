import { DashboardShell } from "@/components/DashboardShell";
import { DeveloperConsole } from "@/components/DeveloperConsole";
import { isAllowlistedAdmin, requireDeveloperAccess } from "@/lib/auth";

export const metadata = { title: "Developer console" };

export default async function DeveloperDashboardPage() {
  const user = await requireDeveloperAccess();
  return <DashboardShell role="developer" title="Developer console" description="Read-only service diagnostics and aggregate platform health." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper showTutorial={!user.onboardingCompleted}><DeveloperConsole /></DashboardShell>;
}
