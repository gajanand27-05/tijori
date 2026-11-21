# Tijori: your business's tijori, now smart.

Tijori is an AI-assisted back office for one-person subscription businesses. It keeps customers, monthly invoices, payments, bills and reminders in one place, and turns them into a 30–90 day cash forecast with "what if" scenarios and a Today screen of next actions. It is built mobile-first, with a bottom nav on phones and a sidebar on desktop, and it runs entirely in the browser.

## Live demo

https://tijori-pi-lac.vercel.app

No login. Demo data loads automatically. To restore it at any time, go to Settings → Reset demo data.

## The problem and the user

Meena runs a home tiffin service in Bengaluru with about 40 monthly subscribers. She tracks money in a notebook and on WhatsApp, so she cannot easily tell who owes her, how much, and since when, or whether she will have rent money on the 5th. Tijori is built for her: one owner, not an accountant, so it uses plain words such as "Money coming in", "Bills" and "Who owes me".

## How Tijori meets Problem Statement 1

| # | Requirement | How Tijori meets it | Screen |
|---|---|---|---|
| 1 | Invoice → payment tracking with drafted reminders | Monthly invoices are recorded and payments are tracked against them. Customers who are late get a reminder draft in English, Hindi or Kannada. | Invoices (`/app/invoices`) and the Remind dialog |
| 2 | "Who owes me, how much, since when" | One list of every customer who owes money, with the amount and the date it has been owed since. | Dues (`/app/dues`) |
| 3 | 30–90 day cash forecast | A day-by-day running balance from today's cash, shown for 30, 60 or 90 days, with the first day it dips below the safety buffer. | Forecast (`/app/forecast`) |
| 4 | "What if" scenarios | Four toggles on the forecast: top customers pay late; a customer cancels; vegetable costs rise 10%; a festival pause of 3 customers for 7 days. | Forecast → What-if panel |
| 5 | Alerts with a clear next action | Each alert states the problem and offers one button, such as "Send reminder", "Send firm reminder" or "Chase all N". | Today (`/app`) |

## Demo walkthrough (about 5 minutes)

1. **Today.** Open the app and read the alerts. Each one names the problem and the next action.
2. **Dues.** See who owes money, how much, and since when.
3. **Remind in Hindi.** Open a reminder for a late customer, switch the language to हिंदी, and read the drafted message.
4. **Forecast.** Pick 30, 60 or 90 days and see when the balance first falls below the ₹5,000 buffer.
5. **What-if.** Turn on a scenario such as "Customers cancel" and watch the forecast change.
6. **Smart capture.** Use the quick-entry box to add a payment or an invoice in one step.

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
