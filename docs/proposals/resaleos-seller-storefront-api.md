# Consignor data for public seller storefronts — notes & a few ideas

**To:** ResaleOS — Product / API team
**From:** Berlin Houseware ( _[your name]_ · _[email]_ · berlinhousewares.com )
**Re:** A few small, additive API ideas that would make public per-consignor
storefronts easier — shared for discussion
**Date:** _[fill in]_ · **Status:** Draft, open to your thoughts

---

## 1. Who we are & what we've built

We run **Berlin Houseware**, a headless Shopify (Hydrogen) storefront for new +
**consignment** homeware, with **ResaleOS as our consignment system of record**.
We've built **public "seller storefronts"** — a page per consignor (their items,
name, logo, verified badge, bio) at `berlinhousewares.com/sellers/<store>`.

It's live and built directly on your API, and we're really happy with how much of
it ResaleOS already makes possible. We wanted to share a few things we worked
around along the way — in case any are easy wins on your side, and because we
suspect other merchants building the same thing hit them too. Everything here is
just an idea for discussion, all **read/subscribe-only**, nothing breaking.

## 2. How our integration works today (and the workarounds we carry)

**Join key:** Shopify variant `sku` = ResaleOS `resaleosId` (e.g. `191805`). We
consume `/products`, `/products/{id}`, `/sales`, and your signed webhooks
(`product.created/updated/deleted`, `X-Resaleos-Signature`).

To make per-seller stores work, we currently carry a few workarounds:

| # | What we do | Why we ended up there |
|---|---|---|
| 1 | Group products by `consignor.accountId`, and treat `brand` as just a filter. | `brand` is free-text and varies (one seller lists many brands; "wfe" vs "Wholesale For Everyone"). `accountId` is the one stable, typo-proof key. |
| 2 | A "name bridge": we resolve a seller's name via `/sales` + a hand-set Shopify field, never the ID. | `consignor.name` comes back `null` in `/products`, but is present in `/sales` — where it has no `accountId`. Neither call alone gives us `{accountId + name}`. |
| 3 | Keep seller identity (name, logo, bio, verified) by hand in a Shopify metaobject. | We couldn't find a consignor profile in either system to read from, so we store it ourselves. |
| 4 | Do the join at write-time (Admin API writes a metaobject + product metafield) so storefront reads never call ResaleOS. | Calling ResaleOS on every page view didn't feel safe at scale (latency, rate limits, a hard dependency). |
| 5 | Run a cron sweep that links unlinked products. | We retired our webhook receiver, and without a consignor-level event, polling is how renames / new links eventually land. |

None of these are blockers — the store works today. They're just the fragile bits
we'd love to simplify.

## 3. A few things that would help

Sharing these roughly in order of value-for-effort. Shapes are just illustrative —
we'd happily match whatever conventions you prefer, and we may well have missed
endpoints that already do some of this.

### 3.1 — `consignor.name` alongside `accountId` on the product `[the cheapest win]`
If the `consignor` object on `/products`, `/products/{id}`, and the product
webhook could carry **both** `accountId` **and** `name`, that alone would let us
drop our whole name-bridge (workaround #2). Today it looks like:

```jsonc
"consignor": { "accountId": "A-215038", "name": null }   // name is empty here
```

and just filling that in would do it:

```jsonc
"consignor": { "accountId": "A-215038", "name": "Mike's Closet" }
```

(If `/sales` could also carry the `accountId` next to the name, even better.)
We're guessing this is close to a one-field change, but you'd know best.

### 3.2 — A consignor endpoint, if you're open to it
`GET /api/v1/consignors/{accountId}` currently 404s. If there's appetite to add
one, something like this would cover a seller's public identity and let it live in
ResaleOS instead of being hand-kept on our side (workaround #3):

```jsonc
{
  "consignor": {
    "accountId": "A-215038",
    "slug": "mikes-closet",        // stable, public, URL-safe — optional but ideal
    "name": "Mike's Closet",
    "bio": "…", "logoUrl": "…", "verified": true,
    "status": "active",
    "updatedAt": "2026-07-30T12:00:00Z"
  }
}
```

Even a minimal `{accountId, name, slug, status}` would be a big step — the
profile bits (logo/bio/verified) could come later (see §3.6).

### 3.3 — Maybe a `consignor.updated` webhook later
Since you already send signed `product.*` webhooks, an event like
`consignor.updated` (on name / logo / verification / status change) would let us
retire the polling in workaround #5 and reflect renames closer to real-time.
Purely a nice-to-have.

### 3.4 — Filtering `/sales` by consignor, if practical
Something like `GET /api/v1/sales?consignorAccountId=A-215038` (paginated) would
let us show per-seller stats and reconcile `consignorSplit` payouts without
pulling all sales and filtering our side.

### 3.5 — Listing a consignor's products
A reverse lookup — e.g. `GET /api/v1/consignors/{accountId}/products?limit=&cursor=&status=listed`
— would let a store be assembled straight from ResaleOS, instead of us scanning
the whole Shopify catalog and mapping product → consignor one at a time.

### 3.6 — Down the road: profile fields + a directory
- If ResaleOS could eventually store `logo`, `bio`, `verified`, `slug` on the
  consignor (§3.2), consignors could manage their own store identity rather than
  us entering it by hand.
- A `GET /api/v1/consignors?limit=&cursor=` to list active consignors would let us
  build a "browse all sellers" index.

## 4. If it helps to prioritize

| Rough priority | The idea | What it would simplify for us |
|---|---|---|
| **Biggest win** | 3.1 `name`+`accountId` on `/products` & webhook · 3.2 `GET /consignors/{id}` | The name bridge (#2) and hand-kept identity (#3) |
| **Next** | 3.3 `consignor.updated` · 3.4 `/sales` by consignor · 3.5 consignor→products | Retires polling (#5); enables stats/payouts & ResaleOS-sourced stores |
| **Later** | 3.6 profile fields + directory | Removes manual profile entry; enables a sellers index |

## 5. Why we think it's worth it for ResaleOS too

We genuinely think this helps beyond just us:

- It would make ResaleOS the home of the **public** seller identity, not only
  back-office inventory — which tends to make the platform stickier.
- Per-seller storefronts give consignors a page they'll share, and that traffic
  flows back to ResaleOS-backed stores.
- Any ResaleOS + Shopify/headless merchant building seller pages hits these same
  gaps, so solving them once could be a nice differentiator ("public consignor
  storefronts, supported out of the box").
- The surface area feels small — §3.1/§3.3 build on payloads/events you already
  send, and §3.2/§3.4/§3.5 are reads over data you already hold.

## 6. Where we'd love to land

We'd be glad to be an early adopter, validate the shapes, and share exactly how
the storefront consumes each field. If you're up for it, could we grab ~30 minutes
to (a) check what already exists — we may have missed things — and (b) get your
read on whether the two "biggest win" items are feasible? No pressure on any of the
rest.

Thanks so much for building an API that got us this far — _[your name]_, _[email]_.

---

_Appendix — how we use ResaleOS today: signed `product.*` webhooks +
`GET /products[/id]` + `GET /sales`, Bearer-authenticated, results cached our
side. Everything above is read/subscribe only — we're not asking for any write
access._
