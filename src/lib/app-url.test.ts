import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, isSecureOrLocalUrl } from "./app-url";

describe("appUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows loopback HTTP for a local production server", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3010");

    expect(appUrl("/api/auth/discord").href).toBe("http://localhost:3010/api/auth/discord");
  });

  it("requires HTTPS for non-local production URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://alypne.app");

    expect(() => appUrl("/")).toThrow("APP_URL must use HTTPS");
  });

  it("accepts HTTPS and loopback URLs only", () => {
    expect(isSecureOrLocalUrl(new URL("https://alypne.app"))).toBe(true);
    expect(isSecureOrLocalUrl(new URL("http://127.0.0.1:3010"))).toBe(true);
    expect(isSecureOrLocalUrl(new URL("http://[::1]:3010"))).toBe(true);
    expect(isSecureOrLocalUrl(new URL("http://alypne.app"))).toBe(false);
  });
});
