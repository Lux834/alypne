import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { StudioInviteAcceptance } from "@/components/StudioInviteAcceptance";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata = { title: "Join studio workspace" };

export default async function StudioInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  const { token } = await searchParams;
  if (!token || !/^[a-f\d]{64}$/i.test(token)) notFound();
  return <DashboardShell role="creator" title="Join studio" description="Accept an invite to join a studio workspace." displayName={user.displayName} avatarUrl={user.avatarUrl}>
    <StudioInviteAcceptance token={token} />
  </DashboardShell>;
}
