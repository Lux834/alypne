import { NextResponse } from "next/server";
import { demoCampaigns } from "@/lib/campaigns";
import { getPublicCampaigns } from "@/lib/campaign-repository";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ campaigns: demoCampaigns, preview: true });
    }
    return NextResponse.json({ error: "Campaign data is not configured." }, { status: 503 });
  }

  try {
    return NextResponse.json({ campaigns: await getPublicCampaigns(), preview: false });
  } catch (error) {
    console.error("Public campaign lookup failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Campaign data is temporarily unavailable." }, { status: 503 });
  }
}
