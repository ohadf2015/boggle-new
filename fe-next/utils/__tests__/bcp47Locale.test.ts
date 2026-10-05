import { describe, expect, it } from "vitest";
import { safeToLocaleDateString } from "../bcp47Locale";

describe("safeToLocaleDateString hydration stability", () => {
  it("formats the same calendar day under UTC for en", () => {
    const a = safeToLocaleDateString(new Date("2025-12-01"), "en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const b = safeToLocaleDateString(new Date("2025-12-01T00:00:00.000Z"), "en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    expect(a).toBe(b);
    expect(a).toMatch(/2025/);
  });
});
