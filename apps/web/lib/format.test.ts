import { describe, expect, it } from "vitest";
import { formatPaise, formatRate } from "./format";

describe("formatPaise", () => {
  it("uses Indian digit grouping", () => {
    expect(formatPaise(1_00_000_00)).toBe("₹1,00,000");
    expect(formatPaise(15_000_00)).toBe("₹15,000");
  });

  it("can show paise", () => {
    expect(formatPaise(12345, "en", { decimals: true })).toBe("₹123.45");
  });
});

describe("formatRate", () => {
  it("formats rates as percentages", () => {
    expect(formatRate(0.0675)).toBe("6.75%");
  });
});
