import { Suspense } from "react";
import { ClipSubmissionForm } from "@/components/ClipSubmissionForm";
import { DashboardShell } from "@/components/DashboardShell";
import { isAllowlistedAdmin, requireDashboardAccess } from "@/lib/auth";

export const metadata = { title: "Submit a clip" };

export default async function NewClipPage() {
  const user = await requireDashboardAccess("creator");
  return <DashboardShell role="creator" title="Submit a clip" description="Share an eligible public video for review." displayName={user.displayName} avatarUrl={user.avatarUrl} showAdmin={isAllowlistedAdmin(user)} showDeveloper={user.roles.includes("developer") || isAllowlistedAdmin(user)} showTutorial={!user.onboardingCompleted}><Suspense fallback={<div className="empty-state">Loading submission form…</div>}><ClipSubmissionForm /></Suspense></DashboardShell>;
}
