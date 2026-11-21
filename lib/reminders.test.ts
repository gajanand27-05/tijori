import { describe, it, expect } from "vitest";
import { suggestTone, draftReminder, whatsappLink, type Tone } from "./reminders";
import type { Language } from "./types";

const TONES: Tone[] = ["gentle", "firm", "final"];
const LANGS: Language[] = ["en", "hi", "kn"];

describe("suggestTone", () => {
  it("maps days overdue to tone boundaries", () => {
    expect(suggestTone(0)).toBe("gentle");
    expect(suggestTone(7)).toBe("gentle");
    expect(suggestTone(8)).toBe("firm");
    expect(suggestTone(30)).toBe("firm");
    expect(suggestTone(31)).toBe("final");
  });
});

describe("draftReminder", () => {
  for (const tone of TONES) {
    for (const language of LANGS) {
      it(`renders ${tone} / ${language} with name, amount and UPI id`, () => {
        const out = draftReminder({
          tone,
          language,
          customerName: "Rahul Sharma",
          amount: 2400,
          months: ["Oct 2025"],
          businessName: "Meena's Kitchen",
          ownerName: "Meena",
          upiId: "meenaskitchen@upi",
        });
        expect(out.length).toBeGreaterThan(0);
        expect(out).toContain("2,400");
        expect(out).toContain("Rahul");
        expect(out).toContain("meenaskitchen@upi");
      });

      it(`renders ${tone} / ${language} without UPI id and without "undefined"`, () => {
        const out = draftReminder({
          tone,
          language,
          customerName: "Rahul Sharma",
          amount: 2400,
          months: ["Oct 2025"],
          businessName: "Meena's Kitchen",
          ownerName: "Meena",
        });
        expect(out).not.toContain("undefined");
        expect(out).not.toContain("meenaskitchen@upi");
      });
    }
  }
});

describe("whatsappLink", () => {
  it("prefixes 91 to a 10-digit number after stripping punctuation", () => {
    expect(whatsappLink("98450-12345", "hi").startsWith("https://wa.me/919845012345?text=")).toBe(true);
  });

  it("keeps an existing 12-digit number with 91", () => {
    expect(whatsappLink("+919845012345", "hi").startsWith("https://wa.me/919845012345?text=")).toBe(true);
  });

  it("strips spaces and plus from a formatted number", () => {
    expect(whatsappLink("+91 98450 12345", "hi").startsWith("https://wa.me/919845012345?text=")).toBe(true);
  });

  it("encodes text so it round-trips", () => {
    const text = "hi";
    const link = whatsappLink("+919845012345", text);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(text);

    const tricky = "Pay 2,400 & thanks now";
    const link2 = whatsappLink("+919845012345", tricky);
    expect(decodeURIComponent(link2.split("?text=")[1])).toBe(tricky);
  });
});
