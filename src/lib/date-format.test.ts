import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./date-format";

describe("safe date formatting", () => {
  it("formats valid dates", () => {
    expect(formatDateTime("2026-10-22T10:00:00.000Z")).not.toBe("Date unavailable");
    expect(formatDate("2026-10-22T10:00:00.000Z")).not.toBe("Date unavailable");
  });

  it("shows a safe fallback instead of an invalid-date string", () => {
    expect(formatDateTime("not an ISO date")).toBe("Date unavailable");
    expect(formatDate(new Date(Number.NaN))).toBe("Date unavailable");
    expect(formatDateTime(null)).toBe("Date unavailable");
  });
});
