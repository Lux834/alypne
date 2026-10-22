import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { getUserStudio, hasStudioPermission } from "@/lib/studio";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio membership required." }, { status: 403 });
  if (!hasStudioPermission(studio, user.discordId, "submissions:read")) {
    return NextResponse.json({ error: "You do not have permission to view workspace submissions." }, { status: 403 });
  }

  const db = await getDatabase();
  const submissions = await db.collection("submissions")
    .find({ studioId: studio._id.toString() }, { projection: { _id: 1, campaignSlug: 1, campaignTitle: 1, platform: 1, videoUrl: 1, title: 1, status: 1, submittedAt: 1, reviewNote: 1 } })
    .sort({ submittedAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({ submissions: submissions.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })) });
}
