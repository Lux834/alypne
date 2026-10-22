import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { getUserStudio } from "@/lib/studio";

export const runtime = "nodejs";

const CreateStudioSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  websiteUrl: z.union([
    z.literal(""),
    z.string().trim().url().max(2000).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Use a public HTTPS website URL."),
  ]).default(""),
  bannerUrl: z.union([
    z.literal(""),
    z.string().trim().url().max(2000).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Use a public HTTPS image URL."),
  ]).default(""),
});
const UpdateStudioSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  websiteUrl: z.union([
    z.literal(""),
    z.string().trim().url().max(2000).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Use a public HTTPS website URL."),
  ]),
  bannerUrl: z.union([
    z.literal(""),
    z.string().trim().url().max(2000).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Use a public HTTPS image URL."),
  ]),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio workspace not found." }, { status: 404 });
  return NextResponse.json({
    studio: {
      id: studio._id.toString(),
      name: studio.name,
      description: typeof studio.description === "string" ? studio.description : "",
      websiteUrl: typeof studio.websiteUrl === "string" ? studio.websiteUrl : "",
      bannerUrl: typeof studio.bannerUrl === "string" ? studio.bannerUrl : "",
      owner: studio.ownerDiscordId === user.discordId,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio workspace not found." }, { status: 404 });
  if (studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the studio owner can change workspace branding." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = UpdateStudioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Workspace settings are invalid." }, { status: 400 });
  }
  const db = await getDatabase();
  await db.collection("studios").updateOne(
    { _id: studio._id, ownerDiscordId: user.discordId },
    { $set: {
      name: parsed.data.name,
      description: parsed.data.description,
      websiteUrl: parsed.data.websiteUrl || null,
      bannerUrl: parsed.data.bannerUrl || null,
      updatedAt: new Date(),
    } },
  );
  return NextResponse.json({ updated: true });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (await getUserStudio(user)) return NextResponse.json({ error: "Your account already belongs to a studio workspace." }, { status: 409 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = CreateStudioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Studio name must be between 2 and 80 characters." }, { status: 400 });

  const db = await getDatabase();
  const now = new Date();
  const result = await db.collection("studios").insertOne({
    name: parsed.data.name,
    description: parsed.data.description,
    websiteUrl: parsed.data.websiteUrl || null,
    bannerUrl: parsed.data.bannerUrl || null,
    ownerDiscordId: user.discordId,
    memberDiscordIds: [user.discordId],
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ studio: { id: result.insertedId.toString(), name: parsed.data.name } }, { status: 201 });
}
