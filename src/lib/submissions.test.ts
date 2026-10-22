import { describe, expect, it } from "vitest";
import { canonicalVideoUrl } from "@/lib/submissions";

describe("canonicalVideoUrl", () => {
  it("accepts public secure post URLs from the selected platform", () => {
    expect(canonicalVideoUrl("TikTok", "https://www.tiktok.com/@creator/video/123456")).toBe("https://tiktok.com/@creator/video/123456");
    expect(canonicalVideoUrl("YouTube", "https://www.youtube.com/watch?v=abcDEF_123")).toBe("https://www.youtube.com/watch?v=abcDEF_123");
    expect(canonicalVideoUrl("Instagram", "https://www.instagram.com/reel/shortcode/")).toBe("https://instagram.com/reel/shortcode");
  });

  it("rejects insecure, unrelated, credential-bearing, and non-video links", () => {
    expect(() => canonicalVideoUrl("TikTok", "http://www.tiktok.com/@creator/video/123456")).toThrow();
    expect(() => canonicalVideoUrl("TikTok", "https://tiktok.com.example.org/@creator/video/123456")).toThrow();
    expect(() => canonicalVideoUrl("YouTube", "https://user:secret@youtube.com/watch?v=abcDEF_123")).toThrow();
    expect(() => canonicalVideoUrl("Instagram", "https://instagram.com/")).toThrow();
    expect(() => canonicalVideoUrl("TikTok", "https://instagram.com/reel/shortcode")).toThrow();
  });
});
