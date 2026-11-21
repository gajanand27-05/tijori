# Tijori: your business's tijori, now smart.

Tijori is a smart back office for one-person subscription businesses. It keeps customers, monthly invoices, payments, bills and reminders in one place, and turns them into a 30–90 day cash forecast with "what if" scenarios and a Today screen of next actions. It is built mobile-first, with a bottom nav on phones and a sidebar on desktop, and it runs entirely in the browser.

## Live demo

https://tijori-pi-lac.vercel.app

No login. Demo data loads automatically. To restore it at any time, go to Settings → Reset demo data.

## The problem and the user

Meena runs a home tiffin service in Bengaluru with about 40 monthly subscribers. She tracks money in a notebook and on WhatsApp, so she cannot easily tell who owes her, how much, and since when, or whether she will have rent money on the 5th. Tijori is built for her: one owner, not an accountant, so it uses plain words such as "Money coming in", "Bills" and "Who owes me".

## How Tijori meets Problem Statement 1

| # | Requirement | How Tijori meets it | Screen |
|---|---|---|---|
| 1 | Invoice → payment tracking with drafted reminders | One tap generates this month's bills for every customer (pro-rata for paused days). Record full or partial payments by UPI or cash. Reminders are drafted in English, Hindi or Kannada in a gentle, firm or final tone, and open in WhatsApp with the message filled in. | Invoices (`/app/invoices`), Remind dialog |
| 2 | "Who owes me, how much, since when" | Total owed, ageing buckets (not yet due, 1–7, 8–30, 30+ days), and one card per customer with amount, oldest unpaid date and last reminder, sorted by "chase first". | Dues (`/app/dues`) |
| 3 | 30–90 day cash forecast | A day-by-day running balance from today's cash for 30, 60 or 90 days, using each customer's own payment delay. Shows the lowest point and the first day below the safety buffer, with the assumptions in plain English. | Forecast (`/app/forecast`) |
| 4 | "What if" scenarios | Four scenarios with adjustable sliders: top customers pay late, customers cancel, costs go up, festival pause. A one-tap demo: "top 4 customers pay 15 days late". Tijori then shows the shortfall and whom to chase to cover it. | Forecast → What if? |
| 5 | Alerts with a clear next action | "Do this today" cards, each with one button (Send reminder, Chase, View bills, Generate bills). When 3 or more customers are late, a "Rough day" banner starts a step-by-step chase mode. | Today (`/app`) |

## Demo walkthrough (about 3 minutes)

1. **Today.** See "Rent ₹15,000 is due on 5 Dec. You'll have only ₹3,250 left" and the "Rough day" banner.
2. **Dues.** See who owes what and since when, in ageing buckets.
3. **Remind.** Open a reminder for Mohan Lal, switch to हिंदी, and tap Open in WhatsApp.
4. **Forecast.** Switch between 30, 60 and 90 days, see the dip on rent day, and open "How we calculated this".
5. **What if?** Tap "Demo: top 4 pay 15 days late". You'd be ₹5,150 short on 5 Dec, and Tijori shows whom to chase.
6. **Smart capture.** On Today, paste "Mohan bhaiya ne 4,200 GPay kiya", tap Read message, then Confirm. The payment is recorded.

## How the forecast works

The forecast uses plain assumptions. You can read them in `lib/forecast.ts`.

- **Usual payment delay per customer.** The average number of days late each customer's paid invoices were paid. A customer with no history is assumed to pay 3 days late. Early payments count as 0 days.
- **Overdue money expected soon.** Unpaid invoices that are already past their expected date are assumed to arrive within the next few days: the larger of 3 days or half the customer's usual delay.
- **Customers who left are excluded.** Their unpaid invoices are listed as not expected, so they do not inflate the forecast.
- **Bills on their dates.** Monthly, weekly, every-N-days and one-off bills are paid out on their due day. A monthly bill due on the 31st is paid on the last day of shorter months.
- **Safety buffer.** The default buffer is ₹5,000. The forecast reports the first day the running balance falls below it.

## Tech stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS 4 and shadcn/ui (built on Base UI)
- Recharts for the forecast chart; lucide-react for icons
- Vitest for tests: 147 tests across 12 test files, all passing
- All data is stored in the browser's localStorage, through one data module (`lib/store.ts`). There is no server, no database, no API routes and no login.

## Run locally

Requires Node.js.

    npm install
    npm run dev     # then open http://localhost:3000
    npm test        # runs the Vitest suite

## Built with the Codebenders IDE (NEXEN AI)

Tijori was built prompt by prompt in the Codebenders IDE (NEXEN AI). See the prompt log included with the submission for the full sequence.

## Data note

All names and numbers in Tijori are synthetic. No real customer data is used.

## Team PAIRADOX

- Gajanand V Dhayagode
- Shruthi
