# Tijori — Project Brief

## WHAT
An AI back office for one-person subscription businesses. Our launch user is Meena, who runs a home tiffin service with ~40 monthly subscribers in Bengaluru. She tracks money in a notebook and WhatsApp. She can't tell who owes her, since when, or whether she'll have rent money on the 5th. Tijori gives her: customers & plans, monthly invoices, payment tracking, WhatsApp reminder drafts, a "who owes me" view, bills, a 30–90 day cash forecast, "what if" scenarios, and a Today screen of next-action alerts.

## USERS
One owner, on a phone first, desktop second. Not an accountant: use plain words ("Money coming in", "Bills", "Who owes me"), never jargon like "receivables".

## TECH
Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts + lucide-react. No login. All data in the browser via ONE data module (lib/store) backed by localStorage, so we can swap to a real database later without touching UI code. Deployed on Vercel.

## RULES
- Synthetic sample data only.
- Indian currency format everywhere (₹1,23,456, en-IN).
- Mobile-first: bottom nav on mobile, sidebar on desktop.
- Keep files small and focused.
- Business logic (forecast, ageing, ranking) lives in pure functions under lib/, separate from UI.
- shadcn/ui here is built on Base UI: NEVER use asChild. Use the render prop, e.g. <Button render={<Link href='/x' />}>Text</Button>.

## BRAND
Name "Tijori", tagline "Your business's tijori, now smart." Warm, trustworthy look: deep green primary, saffron/amber accent for warnings, red for danger, lots of white space, rounded cards, large readable numbers.
