import { describe, expect, it } from "vitest";
import { DiscordProfileSchema, discordAvatarUrl } from "./discord";

describe("Discord profile avatars", () => {
  it("builds a CDN image URL from the latest Discord avatar hash", () => {
    const profile = DiscordProfileSchema.parse({
      id: "12345678901234567",
      username: "clipper",
      avatar: "avatar-hash",
    });

    expect(discordAvatarUrl(profile)).toBe(
      "https://cdn.discordapp.com/avatars/12345678901234567/avatar-hash.png?size=128",
    );
  });

  it("uses GIFs for animated Discord avatars and falls back when there is no avatar", () => {
    const animated = DiscordProfileSchema.parse({
      id: "12345678901234567",
      username: "clipper",
      avatar: "a_animated-hash",
    });
    const noAvatar = DiscordProfileSchema.parse({
      id: "12345678901234567",
      username: "clipper",
      avatar: null,
    });

    expect(discordAvatarUrl(animated)).toContain(".gif?size=128");
    expect(discordAvatarUrl(noAvatar)).toBeNull();
  });
});
