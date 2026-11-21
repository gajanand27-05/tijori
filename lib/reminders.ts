import type { Language } from "./types";

export type Tone = "gentle" | "firm" | "final";

export function suggestTone(daysOverdue: number): Tone {
  if (daysOverdue < 8) return "gentle";
  if (daysOverdue <= 30) return "firm";
  return "final";
}

type Vars = {
  firstName: string;
  amount: string;
  months: string;
  pay: string;
  owner: string;
  business: string;
};

// Placeholders: {firstName}, {amount}, {months}, {pay}, {owner}, {business}.
// A line containing {pay} is dropped entirely when no UPI id is provided.
const TEMPLATES: Record<Tone, Record<Language, string>> = {
  gentle: {
    en: [
      "Hi {firstName}, hope you're doing well!",
      "Just a friendly reminder that {amount} is pending for {months} tiffin service.",
      "{pay}",
      "If you've already paid, please ignore this message. Thank you!",
      "{owner}",
      "{business}",
    ].join("\n"),
    hi: [
      "नमस्ते {firstName} जी,",
      "आशा है आप ठीक होंगे। यह एक छोटी सी याद दिलाने के लिए है कि {months} का {amount} अभी बाकी है।",
      "{pay}",
      "अगर आप पहले ही भुगतान कर चुके हैं, तो कृपया इस संदेश को अनदेखा करें। धन्यवाद!",
      "{owner}",
      "{business}",
    ].join("\n"),
    kn: [
      "ನಮಸ್ಕಾರ {firstName} ಅವರೇ,",
      "ಹೇಗಿದ್ದೀರಿ? {months} ತಿಂಗಳಿನ {amount} ಬಾಕಿ ಇರುವುದನ್ನು ನೆನಪಿಸಲು ಈ ಸಂದೇಶ.",
      "{pay}",
      "ಈಗಾಗಲೇ ಪಾವತಿಸಿದ್ದರೆ ಈ ಸಂದೇಶವನ್ನು ನಿರ್ಲಕ್ಷಿಸಿ. ಧನ್ಯವಾದಗಳು!",
      "{owner}",
      "{business}",
    ].join("\n"),
  },
  firm: {
    en: [
      "Hello {firstName},",
      "Our records show {amount} is still pending for {months}.",
      "Could you please arrange the payment this week? Thank you for your support.",
      "{pay}",
      "Please let us know if there's any issue.",
      "{owner}",
      "{business}",
    ].join("\n"),
    hi: [
      "नमस्ते {firstName} जी,",
      "हमारे रिकॉर्ड के अनुसार {months} का {amount} अभी बाकी है।",
      "कृपया इसी हफ्ते भुगतान कर दें, तो बड़ी मेहरबानी होगी।",
      "{pay}",
      "किसी भी तरह की परेशानी हो तो हमें बताइए। आपके सहयोग के लिए धन्यवाद।",
      "{owner}",
      "{business}",
    ].join("\n"),
    kn: [
      "ನಮಸ್ಕಾರ {firstName} ಅವರೇ,",
      "ನಮ್ಮ ದಾಖಲೆಯ ಪ್ರಕಾರ {months} ತಿಂಗಳಿನ {amount} ಇನ್ನೂ ಬಾಕಿ ಇದೆ.",
      "ಈ ವಾರದೊಳಗೆ ಪಾವತಿ ಮಾಡಲು ವ್ಯವಸ್ಥೆ ಮಾಡಬಹುದೇ?",
      "{pay}",
      "ಯಾವುದೇ ತೊಂದರೆ ಇದ್ದರೆ ದಯವಿಟ್ಟು ತಿಳಿಸಿ. ಧನ್ಯವಾದಗಳು.",
      "{owner}",
      "{business}",
    ].join("\n"),
  },
  final: {
    en: [
      "Hello {firstName},",
      "This is our last reminder regarding the {amount} pending for {months}.",
      "If we don't hear from you or receive payment soon, we may have to stop the service. Before that, we'd like to talk to you directly.",
      "{pay}",
      "Please call or message us at your earliest convenience.",
      "{owner}",
      "{business}",
    ].join("\n"),
    hi: [
      "नमस्ते {firstName} जी,",
      "{months} के {amount} के बकाया के बारे में यह हमारी आखिरी याद दिलाने वाला संदेश है।",
      "अगर जल्द भुगतान नहीं हो पाता, तो हमें सेवा रोकनी पड़ सकती है। इसलिए हम चाहते हैं कि इस पर आपसे सीधे बात कर लें।",
      "{pay}",
      "कृपया जल्द ही कॉल या मैसेज करके बताइए। धन्यवाद।",
      "{owner}",
      "{business}",
    ].join("\n"),
    kn: [
      "ನಮಸ್ಕಾರ {firstName} ಅವರೇ,",
      "{months} ತಿಂಗಳಿನ {amount} ಬಾಕಿ ಕುರಿತು ಇದು ನಮ್ಮ ಕೊನೆಯ ನೆನಪಿನ ಸಂದೇಶ.",
      "ಶೀಘ್ರದಲ್ಲಿ ಪಾವತಿ ಆಗದಿದ್ದರೆ ಸೇವೆಯನ್ನು ನಿಲ್ಲಿಸಬೇಕಾಗಬಹುದು. ಅದಕ್ಕೂ ಮೊದಲು ನಿಮ್ಮೊಂದಿಗೆ ನೇರವಾಗಿ ಮಾತನಾಡಲು ಬಯಸುತ್ತೇವೆ.",
      "{pay}",
      "ದಯವಿಟ್ಟು ಆದಷ್ಟು ಬೇಗ ಕರೆ ಮಾಡಿ ಅಥವಾ ಸಂದೇಶ ಕಳುಹಿಸಿ. ಧನ್ಯವಾದಗಳು.",
      "{owner}",
      "{business}",
    ].join("\n"),
  },
};

const PAY_LINES: Record<Language, (upiId: string) => string> = {
  en: (upiId) => `Pay to ${upiId} on UPI.`,
  hi: (upiId) => `${upiId} पर UPI से भुगतान करें।`,
  kn: (upiId) => `UPI ಮೂಲಕ ${upiId} ಗೆ ಪಾವತಿಸಿ.`,
};

function fill(template: string, vars: Vars, hasPay: boolean): string {
  return template
    .split("\n")
    .filter((line) => hasPay || !line.includes("{pay}"))
    .map((line) =>
      line
        .split("{firstName}").join(vars.firstName)
        .split("{amount}").join(vars.amount)
        .split("{months}").join(vars.months)
        .split("{pay}").join(vars.pay)
        .split("{owner}").join(vars.owner)
        .split("{business}").join(vars.business),
    )
    .join("\n");
}

export function draftReminder(input: {
  tone: Tone;
  language: Language;
  customerName: string;
  amount: number;
  months: string[];
  businessName: string;
  ownerName: string;
  upiId?: string;
}): string {
  const firstName = input.customerName.trim().split(/\s+/)[0] ?? "";
  const amount =
    "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(input.amount);
  const upiId = input.upiId?.trim() ?? "";
  const hasPay = upiId.length > 0;

  const vars: Vars = {
    firstName,
    amount,
    months: input.months.join(", "),
    pay: hasPay ? PAY_LINES[input.language](upiId) : "",
    owner: input.ownerName,
    business: input.businessName,
  };

  return fill(TEMPLATES[input.tone][input.language], vars, hasPay);
}

export function whatsappLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
}
