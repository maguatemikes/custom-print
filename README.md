# Berlin Houseware

A **Shopify Hydrogen** storefront for **ecommerce + consignment** — new goods
and verified **pre-loved homeware**, side by side. Fully headless and
server-rendered, hosted on the edge, with a custom **ResaleOS** consignment
integration that gives every consignor their own seller store.

**Live:** https://berlinhousewares.maguatemikes.workers.dev
Aesthetic: Nike / Off-White influence — bold, uncluttered, pill buttons —
recolored to a **light-green** palette. Inter typeface.

---

## Tech stack

| Layer | Choice |
|---|---|
| **Framework** | [Shopify Hydrogen](https://hydrogen.shopify.dev/) `2026.4.3` (full SSR) |
| **Router / runtime** | [React Router 7](https://reactrouter.com/) `7.16` (Remix lineage) · React `18.3` |
| **Commerce backend** | Shopify **headless** — Storefront API + Customer Account API |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first `@theme`) |
| **Font** | Inter, self-hosted via `@fontsource/inter` (weights 400–800) |
| **Language / tooling** | TypeScript `5.9` · Vite `8` · GraphQL Codegen · ESLint + Prettier |
| **Hosting** | Cloudflare Workers (Shopify **Oxygen**-compatible build) |
| **Consignment** | **ResaleOS** API + Shopify Admin API automation |
| **Runtime** | Node `22` / `24` (dev) · Workers runtime (`nodejs_compat`) in prod |

---

## Architecture at a glance

```
Browser
  │  (server-rendered HTML, hydrated React)
  ▼
Cloudflare Worker  ──►  Hydrogen request handler  ──►  React Router (routes + loaders)
  │                                                          │
  │  static assets (dist/client)                             ├─► Storefront API      (catalog, cart, search, blog)
  │  scheduled cron (*/10m seller sweep)                     ├─► Customer Account API (OAuth login, orders, addresses)
  │                                                          ├─► Admin API            (seller-sync writes)
  │                                                          └─► ResaleOS API         (SKU → consignor lookup)
  ▼
Shopify-hosted checkout  (cart.checkoutUrl — never custom)
```

- **Full SSR** — pages are server-rendered and hydrated; standard Hydrogen data
  flow (loaders, `useOptimisticVariant`, `getProductOptions`, `CartForm`,
  `Analytics`).
- **Edge-first** — the Worker serves static assets directly and falls through to
  SSR for everything else. A `scheduled` handler runs the seller sweep on cron.
- **Checkout stays on Shopify** — we hand off to `cart.checkoutUrl`; there is no
  custom checkout.

---

## Shopify + headless

- **Storefront API** powers the catalog, collections, product detail, search
  (regular **and** predictive), cart mutations, blog, pages, and policies.
  Data is cached at the sub-request layer (`storefront.CacheLong()` for the
  header menu; short default for volatile collection/product queries).
- **Customer Account API** (OAuth) powers login, order history, addresses, and
  profile. The authorize URL is built from `SHOP_ID`.
- **Native SEO infra** — `sitemap.xml` (index + per-type children, localized),
  `robots.txt`, canonical/OG/Twitter tags, and JSON-LD (Product, Article,
  Organization, WebSite, FAQPage). Canonical/OG URLs are **absolute**, built
  from the request origin (`app/lib/seo.ts`).
- **Local dev uses [Mock.shop](https://mock.shop/)** demo data by default; the
  live deploy talks to the real store.

---

## Consignment (ResaleOS integration)

The differentiator: this isn't just a store, it's a **multi-consignor
marketplace**. Every consignor gets their own seller store, kept in sync
automatically.

- **Join key** — a Shopify product is matched to its true consignor via
  **variant SKU** (base SKU, before any `-N` suffix) = ResaleOS `resaleosId`.
  See `app/lib/resaleos.server.ts`.
- **Grouping** — stores are keyed on **`consignor.accountId`** (one consignor,
  many brands, still one store), with the product **vendor** as fallback when
  ResaleOS has no match. See `app/lib/sellers.ts` / `sellers.server.ts`.
- **Seller sync** — a light sweep finds products with no `custom.seller`
  metafield link and links just those (via the **Admin API**:
  `ensureSeller` + `setProductSeller`). The common case is "nothing to do" —
  one cheap query, zero writes. See `app/lib/seller-sync.server.ts`.
  - **Runs every 10 minutes** on a Cloudflare cron (`wrangler.toml` →
    `server.ts` `scheduled` → `runSellerSync`).
  - **On-demand test:** `GET /admin/run-seller-sync` or
    `/admin/sync-sellers?...&cron=1`.
- **Seller storefronts** — `/sellers` (directory) and `/sellers/:handle`
  (per-consignor store). Design/rules in `docs/seller-storefront-plan.md`.

> ℹ️ Products synced from ResaleOS land with **no sales channel** by default and
> won't appear on the storefront until published to the **Headless/Hydrogen**
> channel. Automate with Shopify **Flow** (`Product created → Publish product`)
> pointed at the headless channel — not just "Online Store".

---

## Features

**Storefront**
- **Home** — hero (responsive CDN `<Image>`, LCP-prioritized), 1:1 category
  tiles, value props, trending products, consign band, newsletter.
- **Product detail** — vertical-thumbnail gallery, hybrid colour swatches
  (native swatch → variant photo → name→hex fallback; square image swatches,
  circular colour dots), dynamic "Color: Red" labels, size boxes, quantity
  stepper, add-to-cart / buy-it-now, trust line, smooth native accordions,
  reviews. Variant selection is **URL-driven** (`?Color=…&Size=…`), SSR-shareable.
- **Collections** — native Storefront filters (color/brand/price/availability),
  custom sort dropdown, optimistic filter UI, grid loading state, smooth
  scroll-to-results, pagination.
- **Search** — regular results page **and** predictive type-ahead, brand-styled.
- **Cart** — slide-out drawer, line items, **promo/discount codes** (native
  `CartForm` `DiscountCodesUpdate`), free-shipping progress bar, optimistic
  updates.

**Consignment & accounts**
- **Sellers** — directory + per-consignor storefronts (ResaleOS-driven).
- **Consign** — new+pre-loved positioning, how-it-works, payout tiers, seller
  FAQ (FAQPage schema), consignor-portal CTA + QR.
- **Account** — login (Customer Account API), orders (with filter), order
  detail, addresses, profile.

**Content & SEO**
- Blog (journal), pages, policies.
- Sitemap, robots, canonical, OG/Twitter, JSON-LD, absolute URLs.

**Performance**
- CDN-optimized responsive images (WebP/AVIF via `?width=…` transforms),
  `prefetch="intent"` on links, optimistic UI, tree-shaken Tailwind (~11 KB gzip
  CSS), edge SSR.

---

## Getting started

**Requirements:** Node `22` or `24`.

```bash
npm install
npm run dev        # dev server on localhost:3000 (Mock.shop data)
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with codegen (Mock.shop) |
| `npm run build` | Production build (`shopify hydrogen build --codegen`) |
| `npm run preview` | Preview a production build locally |
| `npm run typecheck` | `react-router typegen && tsc --noEmit` |
| `npm run codegen` | Regenerate GraphQL types after query changes |
| `npm run lint` | ESLint |
| `npm run deploy` | Build + `wrangler deploy` (see hosting) |

> **Customer-account pages locally:** login uses Shopify's Customer Account API,
> which needs a public HTTPS callback — plain `localhost` returns 400. Run with
> the `--customer-account-push` tunnel to test login/orders/addresses locally,
> or verify on the live deploy.

---

## Hosting & deployment

Hosted on **Cloudflare Workers** (`wrangler.toml`). The build emits a Workers
module at `dist/server/index.js` plus browser assets in `dist/client`.

- **Auto-deploy:** Cloudflare **Workers Builds** deploys on every push to
  `main`. (Manual: `npm run deploy`.)
- **Assets:** served directly from `dist/client`; unmatched requests fall
  through to the Worker for SSR.
- **Cron:** `crons = ["*/10 * * * *"]` → the seller sweep.

### Environment variables

**Public** (browser-exposed, committed in `wrangler.toml`):

| Var | Purpose |
|---|---|
| `PUBLIC_STORE_DOMAIN` | Storefront API domain |
| `PUBLIC_CHECKOUT_DOMAIN` | Checkout domain (Analytics/consent) |
| `PUBLIC_STOREFRONT_API_TOKEN` | Storefront API token |
| `PUBLIC_STOREFRONT_ID` | Shop analytics id |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` / `_URL` | Customer Account OAuth |
| `SHOP_ID` | Builds the customer-account authorize URL |

> ⚠️ `wrangler deploy` (run by Workers Builds) applies **only** the vars in
> `wrangler.toml` and wipes dashboard-set plain vars — so public vars must live
> in the file to survive each deploy.

**Secrets** (set via `wrangler secret put …` or the dashboard — never committed;
secrets persist across deploys):

| Secret | Purpose |
|---|---|
| `SESSION_SECRET` | Session cookie signing |
| `PRIVATE_RESALEOS_API_KEY` | ResaleOS consignor lookups |
| `PRIVATE_ADMIN_API_TOKEN` · `PRIVATE_ADMIN_CLIENT_ID` · `PRIVATE_ADMIN_CLIENT_SECRET` | Shopify Admin API (seller-sync writes) |
| `PRIVATE_SYNC_SECRET` | Guards the on-demand sync endpoints |

---

## Project structure

```
app/
  routes/            File-based routes (products, collections, cart, account,
                     sellers, consign, blog, search, sitemap/robots, admin sync)
  components/        UI (Header, Footer, ProductForm, CollectionFilters, Cart*,
                     Search*, ProductGallery, …)
  lib/               resaleos.server · seller-sync.server · sellers · shopify-admin
                     · seo · search · orderFilters · variants · context · session
  graphql/           Storefront + Customer Account queries/mutations
  styles/            tailwind.css (@theme tokens) · app.css · reset.css
server.ts            Worker entry: fetch handler + scheduled (cron) handler
wrangler.toml        Cloudflare Workers config (vars, assets, cron)
docs/                design-system.md · working-agreement.md · seller-storefront-plan.md
```

---

## Conventions

- **Design system is the source of truth** — read
  [`docs/design-system.md`](docs/design-system.md) before building any UI
  (tokens, `.ui-container` + Section pattern, `.btn-*` pills, type scale,
  colour/contrast rules). Never dark text on green.
- **Keep it native** — standard Hydrogen data patterns, URL-driven variant
  state, Shopify-hosted checkout. Don't move variant selection into React state
  or build a custom checkout.
- **Working agreement** — ask before `git commit`/`push` and before any
  `wrangler` command. See [`docs/working-agreement.md`](docs/working-agreement.md).

---

## Documentation

- [`docs/design-system.md`](docs/design-system.md) — visual + structural source of truth
- [`docs/working-agreement.md`](docs/working-agreement.md) — how AI/assistants should operate here
- [`docs/seller-storefront-plan.md`](docs/seller-storefront-plan.md) — consignor storefront design
- [`CLAUDE.md`](CLAUDE.md) — project guide / quick reference
