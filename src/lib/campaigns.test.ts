import { describe, expect, it } from "vitest";
import { CampaignCreateSchema, demoCampaigns } from "@/lib/campaigns";

const validCampaign = {
  title: "Launch campaign",
  gameName: "Sample game",
  gameUrl: "https://www.roblox.com/games/123456/Sample",
  objective: "Introduce the new game mode.",
  description: "Create an original gameplay clip with a clear opening.",
  requiredContent: "",
  prohibitedContent: "",
  disclosure: "",
  platforms: ["TikTok"],
  ratePerThousand: 3,
  perClipCap: 100,
  totalBudget: 5000,
  startsAt: "2099-11-01",
  endsAt: "2099-12-01",
};

describe("CampaignCreateSchema", () => {
  it("accepts complete creator-facing campaign terms", () => {
    expect(CampaignCreateSchema.safeParse(validCampaign).success).toBe(true);
  });

  it("rejects reversed schedules and non-Roblox game URLs", () => {
    expect(CampaignCreateSchema.safeParse({ ...validCampaign, endsAt: "2099-10-01" }).success).toBe(false);
  });

  it("rejects campaign start dates in the past on the server", () => {
    const result = CampaignCreateSchema.safeParse({ ...validCampaign, startsAt: "2000-01-01" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Campaign start date cannot be in the past.");
  });

  it("returns a helpful message for malformed ISO calendar dates", () => {
    const result = CampaignCreateSchema.safeParse({ ...validCampaign, startsAt: "2099-02-30" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Choose a valid campaign start date.");
    expect(CampaignCreateSchema.safeParse({ ...validCampaign, gameUrl: "https://example.com/game" }).success).toBe(false);
  });

  it("marks campaign design examples as previews", () => {
    expect(demoCampaigns.every((campaign) => campaign.preview === true)).toBe(true);
  });
});
