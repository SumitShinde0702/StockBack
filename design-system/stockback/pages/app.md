# StockBack App Surface — Applied Override

> Overrides `../MASTER.md` for every surface in `apps/web`.
> Master is kept as the generated baseline; this file is what the code actually implements.

## Why this overrides Master

| Master says | Override | Reason |
|---|---|---|
| Accent/CTA `#8B5CF6` (purple) | Gold `#F5B23E` is the only CTA colour | Master's own anti-pattern list forbids "AI purple/pink gradients". A payments product needs one unambiguous confirm colour. |
| Light-mode component CSS (white modals, `#E2E8F0` inputs) | Dark-first tokens | The product is a dark, phone-sized payment app. Light mode is out of scope. |
| Background `#0F172A`, Card `#222735` | Deeper `#080B12` base with a 4-step elevation ramp | Master's card is lighter than its background, which inverts depth. |
| Landing-page section order (Hero → Proof → CTA) | Task flow: Scan → Review → Authorise → Receipt | This is an app, not a marketing page. The trust/"transparent pricing" principle is kept as the fee-disclosure rule below. |

## Colour tokens

Semantic only. Never write a raw hex in a component.

| Token | Hex | Use |
|---|---|---|
| `--sb-bg` | `#080B12` | App canvas |
| `--sb-surface` | `#0E1320` | Cards, sheets |
| `--sb-surface-raised` | `#151C2C` | Nested rows, inputs |
| `--sb-surface-overlay` | `#1B2436` | Popovers, pressed states |
| `--sb-border` | `#232D42` | Hairlines |
| `--sb-border-strong` | `#33405A` | Focused / selected edges |
| `--sb-fg` | `#F4F7FB` | Primary text |
| `--sb-fg-muted` | `#93A1B8` | Secondary text (4.9:1 on `--sb-bg`) |
| `--sb-fg-subtle` | `#63708A` | Tertiary labels only, never body copy |
| `--sb-primary` | `#F5B23E` | Brand, confirm CTA, reward accent |
| `--sb-on-primary` | `#120C02` | Text on gold |
| `--sb-success` | `#3ED8A0` | Permitted, settled, confirmed |
| `--sb-warning` | `#F7C948` | Stale quote, degraded data |
| `--sb-danger` | `#FF7A70` | Guard block, failure, rejection |
| `--sb-chain` | `#6FA8FF` | X Layer / onchain facts |
| `--sb-rail-sgqr` | `#93A1B8` | Rail badge: decoded, offchain |
| `--sb-rail-xlayer` | `#6FA8FF` | Rail badge: real onchain settlement |
| `--sb-rail-reward` | `#F5B23E` | Rail badge: xStock cashback |

The three rail colours exist so a judge can tell at a glance which parts of the demo are real onchain
actions versus decoded data. Never reuse them for decoration.

## Typography

- `IBM Plex Sans` — all UI text. Loaded via `next/font/google`, weights 400/500/600/700.
- `IBM Plex Mono` — addresses, tx hashes, token units, QR payloads. Weights 400/500.
- Every monetary or quantity figure uses `font-variant-numeric: tabular-nums` so digits do not jitter
  while a live price updates.
- Scale: `11/13/15/17/20/28/44`. Body is never below 13px; the primary amount is 44px at 375px wide.
- Amount-first hierarchy: on any screen showing money, the amount is the largest element on screen.

## Layout

- Mobile-first. The app is authored at 375px and is the real product.
- Desktop (`>=1024px`) renders the app inside a 390x844 device frame beside a judge-facing context
  panel. The frame is presentation only and must never gate functionality.
- Breakpoints verified: 375, 768, 1024, 1440.
- Bottom tab bar, 3 items max: Pay, Rewards, Settings. Respects `env(safe-area-inset-bottom)`.
- Spacing scale 4/8/12/16/20/24/32/48. Radii: `10` controls, `16` cards, `24` sheets, `999` pills.

## Motion

Master's GSAP stagger preset is not used; there is no GSAP dependency. CSS only, to keep the bundle
small and avoid hydration flicker on a phone.

- Standard ease `cubic-bezier(0.22, 0.61, 0.36, 1)`, 180-260ms, for enters and state changes.
- Spring-ish ease `cubic-bezier(0.34, 1.56, 0.64, 1)`, 260-320ms, reserved for the success reveal and
  the reward counter only. Never on data rows.
- Exits are faster than enters (120-160ms).
- The scan line is a continuous 2.4s loop; it is the only perpetual animation in the app.
- Every animation is disabled under `prefers-reduced-motion: reduce`, which renders the final state.

## Mandatory product rules

1. **Fee disclosure is never collapsed.** The 2.00% spread, its 1% protocol / 1% reward split, and the
   exact crypto debit are visible on the review screen without interaction. Master's "Unclear fees"
   anti-pattern is the single most important rule in this product.
2. **Rail honesty.** Receipts label "SGQR decoded", "Settled on X Layer", and "xStock cashback" as
   three separate, separately-coloured facts. Never imply the SGQR moved fiat.
3. **State is never conveyed by colour alone.** Guard blocked, permitted, and overridden each carry an
   icon plus text.
4. **No state is unstyled.** empty, scanning, parsing, parse-error, quoting, quote-stale, quote-error,
   guard-blocked, guard-override, wallet-prompt, pending, confirmed, rejected, unsupported-merchant,
   insufficient-backing, and offline all have designed treatments.
5. **Touch targets** are at least 44x44px with 8px separation.
6. **Focus** is a 2px `--sb-primary` ring at 2px offset, never removed.

## Component inventory (`apps/web/components/ui`)

`Button`, `Card`, `AmountDisplay`, `StatRow`, `Badge`, `RailBadge`, `Sheet`, `Skeleton`, `Toggle`,
`SegmentedControl`, `Field`, `Callout`, `Spinner`, `CopyableHash`, `PhoneFrame`, `StepHeader`.

## Anti-patterns inherited from Master

Playful design, unclear fees, purple/pink AI gradients, emoji as icons, invisible focus, instant state
changes, low-contrast text, layout-shifting hovers.
