import { describe, it, expect } from "vitest";
import { buildSeedData } from "./seed";
import { getInvoiceStatus } from "./invoice";

const TODAY = "2026-11-21";

describe("buildSeedData", () => {
  it("creates 40 customers with ids cust-01..cust-40", () => {
    const data = buildSeedData(TODAY);
    expect(data.customers).toHaveLength(40);
    expect(data.customers[0].id).toBe("cust-01");
    expect(data.customers[39].id).toBe("cust-40");
  });

  it("is deterministic: two calls deep-equal", () => {
    expect(buildSeedData(TODAY)).toEqual(buildSeedData(TODAY));
  });

  it("has at least 5 invoices overdue on the given date", () => {
    const data = buildSeedData(TODAY);
    const overdue = data.invoices.filter(
      (inv) => getInvoiceStatus(inv, TODAY) === "overdue",
    );
    expect(overdue.length).toBeGreaterThanOrEqual(5);
  });
});
