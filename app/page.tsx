import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tijori: know who owes you and if rent is safe",
  description:
    "Tijori tracks monthly payments, dues, bills and cash forecasts for one-person businesses, starting with home tiffin services.",
};

const problems = [
  {
    title: "Money arrives late",
    body: "Payments come in weeks after the due date, and you only notice when the money is missing.",
  },
  {
    title: "Bills arrive on time",
    body: "Rent, gas and vendor bills fall due on fixed dates, whether or not your customers have paid.",
  },
  {
    title: "A notebook can't see next month",
    body: "A notebook shows what already happened. It can't tell you if next month's money covers next month's bills.",
  },
];

const steps = [
  "Add customers",
  "Bills go out on the 1st",
  "Tijori chases dues with you (WhatsApp, in English, हिंदी, ಕನ್ನಡ)",
  "See your next 90 days",
];

const chips = [
  { label: "Tiffin services", status: "Live" },
  { label: "Tutors", status: "Coming soon" },
  { label: "Gyms & yoga", status: "Coming soon" },
  { label: "Milk delivery", status: "Coming soon" },
  { label: "Laundry", status: "Coming soon" },
  { label: "PG hostels", status: "Coming soon" },
];

type Plan = {
  name: string;
  price: string;
  period?: string;
  features: string[];
  recommended?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "Free",
    features: ["Up to 15 customers", "Dues and reminders"],
  },
  {
    name: "Pro",
    price: "₹149",
    period: "/month",
    recommended: true,
    features: ["Unlimited customers", "Cash forecast", "What-if scenarios", "Reminders in 3 languages"],
  },
  {
    name: "Pro+",
    price: "₹399",
    period: "/month",
    features: ["AI quick capture", "Staff access", "Priority support"],
  },
];

function PhoneMock() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-xs rounded-[2.5rem] border-8 border-foreground bg-background p-3 shadow-xl"
    >
      <div className="flex flex-col gap-3 rounded-[1.75rem] bg-background p-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
        <div className="rounded-2xl border border-warning bg-warning/20 p-4">
          <p className="text-base font-semibold text-foreground">
            Rent ₹15,000 due 5 Dec, only ₹3,250 left
          </p>
        </div>
        <div className="rounded-2xl border border-border border-l-4 border-l-destructive bg-card p-4">
          <p className="text-sm font-semibold text-foreground">
            Chase Rahul Bhatia today: ₹4,600, 18 days late
          </p>
        </div>
        <div className="rounded-2xl border border-border border-l-4 border-l-warning bg-card p-4">
          <p className="text-sm font-semibold text-foreground">
            Priya hasn&apos;t paid 6 days after your reminder
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      {/* Hero */}
      <section className="px-6 pb-16 pt-12 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Tijori</p>
            <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Know who owes you. Know if rent is safe. Every month.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Tijori is the back office for one-person businesses that run on monthly payments,
              starting with home tiffin services.
            </p>
            <div>
              <Button
                size="lg"
                className="h-12 rounded-xl px-6 text-base"
                render={<Link href="/app" />}
              >
                Open live demo
              </Button>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* Problem */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
            Monthly money is hard to see
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {problems.map((item) => (
              <div key={item.title} className="rounded-3xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="pt-1.5 text-lg font-medium text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Built for */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">Built for</h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {chips.map((chip) => (
              <li
                key={chip.label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
              >
                {chip.label}
                {chip.status === "Live" ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Live
                  </span>
                ) : null}
                {chip.status === "Coming soon" ? (
                  <span className="rounded-full bg-warning/30 px-2 py-0.5 text-xs text-warning-foreground">
                    Coming soon
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">Pricing</h2>
          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col gap-6 rounded-3xl bg-card p-6 ${
                  plan.recommended
                    ? "border-2 border-primary shadow-lg md:-my-4 md:p-8"
                    : "border border-border"
                }`}
              >
                <div className="flex flex-col gap-2">
                  {plan.recommended ? (
                    <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Recommended
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
                    {plan.period ? (
                      <span className="text-base text-muted-foreground">{plan.period}</span>
                    ) : null}
                  </p>
                </div>
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-foreground">
                      <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-lg font-medium text-foreground">
            Recover one late payment and Tijori has paid for itself 16 times over.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <p className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          Built for ACE Builders Hackathon 2026 with Codebenders. Sample data only. Team PAIRADOX.
        </p>
      </footer>
    </main>
  );
}
