import { describe, it, expect } from "vitest";
import { addMonths, dateInMonth, diffDays } from "./dates";

describe("addMonths", () => {
  it("clamps 31 Jan + 1 month to the last day of February", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("clamps 31 Jan + 1 month to the 29th in a leap year", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("moves backwards across a year boundary", () => {
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
  });
});

describe("diffDays", () => {
  it("counts days across a month boundary", () => {
    expect(diffDays("2026-01-30", "2026-02-02")).toBe(3);
  });

  it("is negative when the end date is earlier", () => {
    expect(diffDays("2026-02-02", "2026-01-30")).toBe(-3);
  });

  it("is 0 for the same date", () => {
    expect(diffDays("2026-03-06", "2026-03-06")).toBe(0);
  });
});

describe("dateInMonth", () => {
  it("clamps day 31 to 30 in April", () => {
    expect(dateInMonth("2026-04", 31)).toBe("2026-04-30");
  });

  it("clamps day 31 to 30 in June", () => {
    expect(dateInMonth("2026-06", 31)).toBe("2026-06-30");
  });

  it("keeps day 31 in a 31-day month", () => {
    expect(dateInMonth("2026-05", 31)).toBe("2026-05-31");
  });

  it("zero-pads single-digit days", () => {
    expect(dateInMonth("2026-03", 6)).toBe("2026-03-06");
  });
});
