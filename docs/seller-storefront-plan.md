# Seller Storefronts (ResaleOS consignors) — build plan

Status: **planned, not built.** Parked to focus on site UI first. This is the
agreed architecture for consignor "mini storefronts" (click a seller → their own
store page with their products), à la the "FIND LOCAL / Dyson store" reference.

---

## 1. The two systems and how they join

- **ResaleOS** (`https://www.resaleos.co/api/v1`, `Authorization: Bearer ros_live_…`)
  is the source of truth for products, sales, consignors, inventory. It **syncs
  approved products to Shopify**.
- **Shopify Storefront API** is what Hydrogen renders from (images, price, PDP,
  cart, checkout).

**Join key (confirmed):** Shopify variant **`sku` = ResaleOS `resaleosId`**
(e.g. `191805`). Sales link to Shopify orders via `sale.externalOrderId =
"shopify:<orderId>"`.

### ResaleOS API shape (from live inspection)
- Endpoints: `/products` (+ `/products/[id]` CRUD), `/sales`, `/sales/[id]`.
  **No `/consignors` or `/accounts` endpoint** (404).
- Webhooks: `product.created` / `product.updated` / `product.deleted`, signed with
  `X-Resaleos-Signature: sha256=…`.
- Inventory locations: Berlin Housewares `6a47a805f24222dbfb92c4dc`,
  WFE `6a4e5f59a634fa6bf6a82a87`.
- **Product**: `resaleosId`, `title`, `status`, `price`, `brand` (free-text, messy),
  `sku` (= resaleosId), `categoryId` (Shopify taxonomy gid), `attributes`,
  `consignor { accountId, name }` — **`name` is `null` here** — `consignorSplit`,
  `inventory[{location, quantity}]`.
- **Sale**: `saleNumber`, `channel`, totals, `customer {accountId,name,email}` (buyer),
  `items[{ productResaleosId, sku, variantId, quantity, unitPrice, location,
  consignor{ name, split, amount } }]` — consignor **`name` is populated here but has
  NO accountId** — `externalOrderId`.

---

## 2. Core decision: group by `consignor.accountId` (NOT `brand`)

`brand` is free-text entered per product and is inconsistent (real data: account
`A-215038` carries brands "Mike Thrift", "wfe", `null`; and "wfe" vs "Wholesale For
Everyone"). Grouping by brand would **fragment one seller across many stores** and
break on typos. `accountId` is **stable, typo-proof, and multi-brand-proof** — one
seller can list many brands and they all stay in their one store.

- **`accountId`** = grouping/join key (never shown to shoppers).
- **`brand`** = demoted to an in-store **filter facet** only.

Current data: 2 consignor accounts (`A-215038`, `A-840975`); one product
(Black Paisley Bandana `#608890`) has **no consignor** → needs an "unassigned" rule
(hide, or default seller).

---

## 3. Seller identity → a Shopify `Seller` metaobject

Neither system exposes a clean seller name/logo/bio to the storefront
(`consignor.name` is null in `/products`; `/sales` names are informal and lack
accountId). So the public identity lives in a Shopify **metaobject**, keyed to
`accountId`.

**Definition** (`seller`, **Storefront access ON**):
| field | type | note |
|---|---|---|
| `resaleos_account_id` | text | JOIN KEY (e.g. `A-215038`) |
| `display_name` | text | "Mike's Closet" |
| `handle` | (metaobject handle) | the `/sellers/{handle}` slug — pin to accountId |
| `logo`, `banner` | file | |
| `bio`, `policies` | rich text | About / Policies tabs |
| `verified` | boolean | badge |
| `member_since` | date | |

**Name resolution (first match wins):** metaobject `display_name` →
`/sales` name (bridged: sale item `productResaleosId` → product `resaleosId` →
its `consignor.accountId`) → neutral placeholder. **Never** the raw ID.

---

## 4. Scalable architecture — do the join at WRITE-TIME, not per page view

Calling ResaleOS on every seller-page view does not scale (latency, rate limits,
hard dependency). Instead:

```
ResaleOS product.created/updated  ──(webhook, verify signature)──►  Worker endpoint
      │  (Shopify ADMIN API)
      ├─ 1. upsert Seller metaobject for consignor.accountId (create if new)
      └─ 2. set product metafield custom.seller = → that metaobject (reference)
                                   │
   Shopify now holds it all ───────┘
                                   │
   Storefront reads = 100% Shopify (CDN-cached, NO ResaleOS call):
   • /sellers/$handle → filter products by the seller metafield
   • product cards / PDP → seller name+logo via the metafield reference
```

ResaleOS is touched only on **writes** (webhooks) + optional stats. This scales to
thousands of sellers/visitors.

---

## 5. Files to build (when resumed)
- `app/lib/resaleos.server.ts` — cached ResaleOS client (key = Worker secret).
- `app/lib/shopify-admin.server.ts` — Admin API client (create metaobject, set metafield).
- `app/routes/webhooks.resaleos.tsx` — signed webhook receiver → upsert metaobject + tag product.
- `app/routes/sellers.$handle.tsx` — seller store (hero + Products/About/Policies + grid).
- `app/routes/sellers._index.tsx` — sellers directory.
- "Sold by {seller}" link on PDP + `ProductItem` cards.
- Seller metaobject definition (auto via Admin API on first run, or once by hand).

## 6. Phases
1. **MVP** — `/sellers/$handle` reading ResaleOS live (no Admin API). Validates the UI. (OK to call ResaleOS per page at small scale.)
2. **Scalable** — webhook + Admin API → metaobject + product metafield → storefront reads pure Shopify.
3. **Rich** — seller profiles (logo/bio), sales/stock stats, seller dashboards (Customer Account ↔ consignor accountId).

## 7. Open enablers / dependencies (before/at build)
- [ ] **Rotate the ResaleOS key**; fresh key → Worker secret. (Old one was exposed in chat.)
- [ ] **Shopify Admin API custom app** (`write_metaobjects` + `write_products`) → token as Worker secret.
- [ ] Ask ResaleOS: include **`consignor.name`** in the product webhook/payload? can `/sales` filter by consignor? (removes the name bridge; enables stats)
- [ ] **Logo/bio source** — no system has these; seller-portal field or admin entry.
- [ ] Rule for **unassigned** products (no consignor).
- Note: rating / reviews / "responds in <2h" / visits from the reference UI are **not**
  in either API — need a reviews app or manual data.

## 8. Notes
- Public Storefront read checks: token `93f257f7a4678e1bf9f2346816a53f00`, domain
  `berlinhousewares-com.myshopify.com`, endpoint `/api/2025-01/graphql.json`.
- Full session context in `.claude/sessions/2026-07-16-065729.md`.
