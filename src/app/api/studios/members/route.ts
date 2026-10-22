import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { getUserStudio, studioPermissions } from "@/lib/studio";

export const runtime = "nodejs";

type StudioMemberDocument = {
  ownerDiscordId: string;
  memberDiscordIds: string[];
  memberPermissions?: Record<string, string[]>;
};

const MemberPermissionsSchema = z.object({
  discordId: z.string().regex(/^\d{17,20}$/),
  permissions: z.array(z.enum(studioPermissions)).max(studioPermissions.length),
}).refine(({ permissions }) => new Set(permissions).size === permissions.length, {
  message: "Remove duplicate permissions.",
});

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio || studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the workspace owner can change member access." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = MemberPermissionsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Member permissions are invalid." }, { status: 400 });
  if (parsed.data.discordId === user.discordId) return NextResponse.json({ error: "Owner permissions cannot be changed here." }, { status: 400 });

  const db = await getDatabase();
  const result = await db.collection<StudioMemberDocument>("studios").updateOne(
    { _id: studio._id, ownerDiscordId: user.discordId, memberDiscordIds: parsed.data.discordId },
    { $set: { [`memberPermissions.${parsed.data.discordId}`]: parsed.data.permissions, updatedAt: new Date() } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio || studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the workspace owner can remove members." }, { status: 403 });
  }
  const discordId = new URL(request.url).searchParams.get("discordId");
  if (!discordId || !/^\d{17,20}$/.test(discordId) || discordId === user.discordId) {
    return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  }
  const db = await getDatabase();
  const result = await db.collection<StudioMemberDocument>("studios").updateOne(
    { _id: studio._id, ownerDiscordId: user.discordId, memberDiscordIds: discordId },
    { $pull: { memberDiscordIds: discordId }, $unset: { [`memberPermissions.${discordId}`]: "" }, $set: { updatedAt: new Date() } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  return NextResponse.json({ removed: true });
}
