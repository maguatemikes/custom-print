# Berlin Houseware — Project Guide

Shopify **Hydrogen** storefront (React Router 7 / Remix, full SSR) for
**ecommerce + consignment** — new goods and verified pre-loved homeware.
Nike/Off-White-influenced UI in a **light-green** theme, **Inter** font,
**Tailwind v4**. Local dev runs on **Mock.shop** data.

## ⚠️ Working agreement — always follow

**Ask me first before `git commit`/`git push`, and before running any `wrangler`
command.** Prepare/edit locally, describe what you'd do, then wait for my
go-ahead. See **[docs/working-agreement.md](docs/working-agreement.md)**.

@docs/working-agreement.md

## ⚠️ Design consistency — read before building UI

Before creating or editing **any page, route, or UI component**, read
**[docs/design-system.md](docs/design-system.md)** and follow it (tokens,
`.ui-container` + Section pattern, `.btn-*` pills, type scale, header/footer/PDP
conventions). Reuse existing primitives and components instead of inventing new
markup. Consistency with the current site takes priority.

@docs/design-system.md

## Key conventions (quick reference)

- **Tokens** live in `app/styles/tailwind.css` (`@theme`). Primary green =
  `brand-500 #37ad57`; text `ink`; surfaces `paper` / `mint`.
- **CSS layers**: `reset.css` → `@layer base`, `app.css` → `@layer components`;
  Tailwind utilities win, so **never use `!important`** and never add global
  element rules outside a `@layer`.
- **Headings**: uppercase, `font-extrabold`, `tracking-tight`. Sections:
  full-width `<section>` (bg) + inner `ui-container py-16 md:py-24`.
- **Hydrogen**: keep standard loaders / `useOptimisticVariant` / `CartForm` /
  `Analytics`. Variant selection stays **URL-driven** (`?Color=…`), SSR-shareable.
  Checkout is **Shopify-hosted** (`cart.checkoutUrl`) — never custom.

## Commands

- `npm run dev` — dev server on `localhost:3000` (Mock.shop).
- `npm run build` — production build (must stay green).
- `npm run typecheck` — `react-router typegen && tsc --noEmit`.
- `npm run codegen` — regenerate GraphQL types after changing a query.

## Session memory

- `/remember` — snapshot the current session (decisions, changes, open threads)
  to `.claude/sessions/`.
- `/restore-session` — reload the most recent snapshot to continue where we left
  off. Snapshots live in `.claude/sessions/` (`latest.md` = newest).
