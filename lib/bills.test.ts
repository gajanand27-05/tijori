import { describe, it, expect } from "vitest";
import type { Bill } from "./types";
import {
  billOccurrences,
  upcomingBills,
  nextDueDate,
  recurrenceLabel,
} from "./bills";

describe("billOccurrences", () => {
  it("clamps monthly day 31 to Feb 28 in 2025", () => {
    const bill: Bill = {
      id: "b1",
      name: "Rent",
      category: "rent",
      amount: 100,
      recurrence: { type: "monthly", day: 31 },
    };
    expect(billOccurrences(bill, "2025-02-01", "2025-02-28")).toEqual(["2025-02-28"]);
  });

  it("clamps monthly day 31 to Feb 29 in leap year 2024", () => {
    const bill: Bill = {
      id: "b1",
      name: "Rent",
      category: "rent",
      amount: 100,
      recurrence: { type: "monthly", day: 31 },
    };
    expect(billOccurrences(bill, "2024-02-01", "2024-02-29")).toEqual(["2024-02-29"]);
  });

  it("clamps monthly day 31 to 30 in April", () => {
    const bill: Bill = {
      id: "b1",
      name: "Rent",
      category: "rent",
      amount: 100,
      recurrence: { type: "monthly", day: 31 },
    };
    expect(billOccurrences(bill, "2025-04-01", "2025-04-30")).toEqual(["2025-04-30"]);
  });

  it("clamps monthly day 30 to 28 in Feb 2025", () => {
    const bill: Bill = {
      id: "b1",
      name: "Rent",
      category: "rent",
      amount: 100,
      recurrence: { type: "monthly", day: 30 },
    };
    expect(billOccurrences(bill, "2025-02-01", "2025-02-28")).toEqual(["2025-02-28"]);
  });

  it("returns monthly day 5 across Jan-Mar 2025", () => {
    const bill: Bill = {
      id: "b1",
      name: "Gas",
      category: "gas",
      amount: 40,
      recurrence: { type: "monthly", day: 5 },
    };
    expect(billOccurrences(bill, "2025-01-01", "2025-03-31")).toEqual([
      "2025-01-05",
      "2025-02-05",
      "2025-03-05",
    ]);
  });

  it("returns Mondays across a month boundary", () => {
    const bill: Bill = {
      id: "b2",
      name: "Vegetables",
      category: "vegetables",
      amount: 500,
      recurrence: { type: "weekly", weekday: 1 },
    };
    expect(billOccurrences(bill, "2025-03-25", "2025-04-10")).toEqual([
      "2025-03-31",
      "2025-04-07",
    ]);
  });

  it("returns every 10 days on the grid from startDate", () => {
    const bill: Bill = {
      id: "b3",
      name: "Packaging",
      category: "packaging",
      amount: 200,
      recurrence: { type: "everyNDays", n: 10, startDate: "2025-03-01" },
    };
    expect(billOccurrences(bill, "2025-03-15", "2025-04-05")).toEqual([
      "2025-03-21",
      "2025-03-31",
    ]);
  });

  it("returns every 7 days from startDate only within range", () => {
    const bill: Bill = {
      id: "b3",
      name: "Packaging",
      category: "packaging",
      amount: 200,
      recurrence: { type: "everyNDays", n: 7, startDate: "2025-03-01" },
    };
    // Grid from 2025-03-01 in steps of 7 days; first on/after 2025-06-01 is 2025-06-07.
    expect(billOccurrences(bill, "2025-06-01", "2025-06-30")).toEqual([
      "2025-06-07",
      "2025-06-14",
      "2025-06-21",
      "2025-06-28",
    ]);
  });

  it("returns a oneOff date only when it is in range", () => {
    const bill: Bill = {
      id: "b4",
      name: "Repair",
      category: "other",
      amount: 300,
      recurrence: { type: "oneOff", date: "2025-03-10" },
    };
    expect(billOccurrences(bill, "2025-03-01", "2025-03-31")).toEqual(["2025-03-10"]);
    expect(billOccurrences(bill, "2025-04-01", "2025-04-30")).toEqual([]);
  });
});

describe("upcomingBills", () => {
  const rent: Bill = {
    id: "r",
    name: "Rent",
    category: "rent",
    amount: 100,
    recurrence: { type: "monthly", day: 1 },
  };
  const gas: Bill = {
    id: "g",
    name: "Gas",
    category: "gas",
    amount: 50,
    recurrence: { type: "oneOff", date: "2025-03-05" },
  };

  it("sorts by date and accumulates running totals", () => {
    const result = upcomingBills([gas, rent], "2025-03-01", "2025-03-05");
    expect(result.map((o) => [o.name, o.date])).toEqual([
      ["Rent", "2025-03-01"],
      ["Gas", "2025-03-05"],
    ]);
    expect(result[0].runningTotal).toBe(100);
    expect(result[result.length - 1].runningTotal).toBe(150);
  });

  it("returns [] for empty input", () => {
    expect(upcomingBills([], "2025-03-01", "2025-03-31")).toEqual([]);
  });
});

describe("nextDueDate", () => {
  it("finds the next monthly day 5 after today", () => {
    const bill: Bill = {
      id: "b1",
      name: "Gas",
      category: "gas",
      amount: 40,
      recurrence: { type: "monthly", day: 5 },
    };
    expect(nextDueDate(bill, "2025-03-06")).toBe("2025-04-05");
  });

  it("returns null for a past oneOff", () => {
    const bill: Bill = {
      id: "b4",
      name: "Repair",
      category: "other",
      amount: 300,
      recurrence: { type: "oneOff", date: "2025-01-01" },
    };
    expect(nextDueDate(bill, "2025-03-06")).toBeNull();
  });
});

describe("recurrenceLabel", () => {
  it("formats monthly ordinals", () => {
    expect(recurrenceLabel({ type: "monthly", day: 5 })).toBe("5th of every month");
    expect(recurrenceLabel({ type: "monthly", day: 1 })).toBe("1st of every month");
    expect(recurrenceLabel({ type: "monthly", day: 2 })).toBe("2nd of every month");
    expect(recurrenceLabel({ type: "monthly", day: 3 })).toBe("3rd of every month");
    expect(recurrenceLabel({ type: "monthly", day: 11 })).toBe("11th of every month");
    expect(recurrenceLabel({ type: "monthly", day: 21 })).toBe("21st of every month");
    expect(recurrenceLabel({ type: "monthly", day: 31 })).toBe("31st of every month");
  });

  it("formats weekly, everyNDays and oneOff", () => {
    expect(recurrenceLabel({ type: "weekly", weekday: 1 })).toBe("Every Monday");
    expect(recurrenceLabel({ type: "everyNDays", n: 10, startDate: "2025-03-01" })).toBe(
      "Every 10 days",
    );
    expect(recurrenceLabel({ type: "oneOff", date: "2025-12-12" })).toBe("Once on 12 Dec");
  });
});
