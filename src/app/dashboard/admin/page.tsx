import { AdminPanel } from "@/components/AdminPanel";
import { DashboardShell } from "@/components/DashboardShell";
import { requireAdminAccess } from "@/lib/auth";

export const metadata = { title: "Admin workspace" };

export default async function AdminDashboardPage() {
  const user = await requireAdminAccess();
  return <DashboardShell role="admin" title="Admin workspace" description="Manage accounts, studios, campaigns, moderation, and platform readiness." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin showDeveloper showTutorial={!user.onboardingCompleted}><AdminPanel /></DashboardShell>;
}
