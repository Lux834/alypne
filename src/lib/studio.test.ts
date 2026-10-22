import { describe, expect, it } from "vitest";
import { getSafeStudioBannerUrl, getSafeStudioWebsiteUrl, hasStudioPermission } from "./studio";

describe("studio banner URLs", () => {
  it("accepts public HTTPS image links", () => {
    expect(getSafeStudioBannerUrl({ bannerUrl: "https://images.example.com/studio.jpg" }))
      .toBe("https://images.example.com/studio.jpg");
  });

  describe("studio website URLs", () => {
    it("accepts public HTTPS links and rejects unsafe schemes", () => {
      expect(getSafeStudioWebsiteUrl({ websiteUrl: "https://studio.example" })).toBe("https://studio.example/");
      expect(getSafeStudioWebsiteUrl({ websiteUrl: "javascript:alert(1)" })).toBeNull();
      expect(getSafeStudioWebsiteUrl({ websiteUrl: "https://user:password@studio.example" })).toBeNull();
    });
  });

  describe("studio team permissions", () => {
    const studio = {
      ownerDiscordId: "11111111111111111",
      memberPermissions: { "22222222222222222": ["campaigns:read"] },
    };

    it("gives the owner access and respects explicit member permission grants", () => {
      expect(hasStudioPermission(studio, studio.ownerDiscordId, "submissions:review")).toBe(true);
      expect(hasStudioPermission(studio, "22222222222222222", "campaigns:read")).toBe(true);
      expect(hasStudioPermission(studio, "22222222222222222", "campaigns:manage")).toBe(false);
      expect(hasStudioPermission(studio, "33333333333333333", "campaigns:read")).toBe(false);
    });
  });

  it("rejects non-HTTPS URLs and credential-bearing URLs", () => {
    expect(getSafeStudioBannerUrl({ bannerUrl: "http://images.example.com/studio.jpg" })).toBeNull();
    expect(getSafeStudioBannerUrl({ bannerUrl: "https://user:pass@images.example.com/studio.jpg" })).toBeNull();
    expect(getSafeStudioBannerUrl({ bannerUrl: "not a URL" })).toBeNull();
  });
});
