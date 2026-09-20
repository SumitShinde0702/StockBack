# Landing — page override

> Overrides `design-system/stockback/MASTER.md` for `/` only. The product UI at `/app` still follows `pages/app.md`.

**Route:** `/`  
**Purpose:** Judge-facing pitch. The live product is a separate, phone-first surface at `/app`.

## Structure

Trust & Authority + Conversion, adapted for a 3-minute demo:

1. Hero — one sentence, one screenshot of the receipt, two CTAs
2. Problem — three numbered claims, then a pull-quote
3. Impact — four sourced statistics, each linked
4. Solution — three pillars plus the 2% / 1% / 1% split
5. How it works — six technical steps, then the fee-split rationale
6. Honesty — real vs stand-in, side by side
7. Phone CTA — LAN QR to `/app`, plus deployed addresses

## Rules that differ from Master

- **No phone frame on this page.** The product lives at `/app`. The hero device is a static composition, not a live render, and is `aria-hidden`.
- **No unsourced numbers.** Every statistic on Impact is a published third-party figure with a date and a link. If a source cannot be cited, the number does not appear.
- **CTA:** "Open the app" goes to `/app`. Secondary CTA is "See how it works" (`#how`). Repeat the primary CTA in the phone section.
- **Motion:** fade-up 14px / 450ms / `ease-standard`, once, skipped under `prefers-reduced-motion`. Do not stagger more than three items in a row.

## Anti-patterns for this page

- Do not embed the live app beside the pitch. That is what we just split apart.
- Do not invent SGQR or crypto-adoption figures.
- Do not use generic crypto gradients or glassmorphism.
