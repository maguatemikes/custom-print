# Custom Bandana volume pricing — Shopify discount function (deploy pack)

Makes the **checkout** charge the same per-size tiered prices the wizard shows.
Everything here is generic + metafield-driven: **new products = edit the metafield,
never this function.**

## Files
- `pricing.metafield.json` — the pricing DATA (Jurong cost per size, markup, bands).
  Goes into the shop metafield `custom.volume_pricing` (type: JSON).
- `run.js` — the discount function logic (reference; validate field shapes vs your CLI's Functions docs).
- `input.graphql` — the function's input query.

## How it works
1. Each **variant price** in Shopify = that size's **base (list) price** — the highest band.
   (A function can only discount DOWN, so the base must be the top of the ladder.)
2. The function reads `custom.volume_pricing`, finds the cart line's product by **handle**,
   its **size** by variant option, computes the tier price (`cost × 3`, per the bands),
   and **discounts the line down to it**.
3. Products NOT in the metafield are ignored (your pre-made catalogue is never touched).

## Deploy (Ryan — one time)
1. `shopify app init` (or reuse an existing app) → add a **product discount** function extension.
2. Drop in `run.js` + `input.graphql` (adapt to the extension template).
3. `shopify app deploy`.
4. In admin: create the shop metafield **custom.volume_pricing** (JSON) and paste
   `pricing.metafield.json`.
5. In admin → Discounts → **Create automatic discount** → choose this function → Save (Active).
6. Set each variant's **price** to its base (see below).

## Variant base prices to set
Base = the **1–11** rate (or the **12–23** rate — your call; see note). At ×3:

| Square | 1–11 base | 12–23 base |
|---|---|---|
| 14×14 | $35.64 | $12.22 |
| 18×18 | $42.84 | $14.69 |
| 22×22 | $52.20 | $17.90 |
| 27×27 | $63.00 | $21.60 |

| Triangle | 1–11 base | 12–23 base |
|---|---|---|
| 14×20×14 | $28.80 | $9.87 |
| 18×24×18 | $34.20 | $11.73 |
| 22×30×22 | $41.40 | $14.19 |
| 27×38×27 | $48.60 | $16.66 |

**Base decision (open):** `1–11` shows big "% off" at checkout (66–98%); `12–23` reads
as a calmer 0→~73% volume discount. Same final price either way — only the headline
discount differs. Set the variant price to whichever column you choose.

## Adding a product later (Rectangle, etc.)
1. Create the product; set variant prices to its base.
2. Add its cost data under `products` in the metafield JSON.
3. Done — no function change, no redeploy.

## Keep the wizard in sync
The Hydrogen wizard currently hardcodes the same cost data in `app/lib/customPrintData.ts`.
Point it at this metafield too (single source of truth) so display + checkout never drift.

## Caveats
- Requires a Partners account + Shopify CLI (this is an app, not a setting).
- Confirm your plan's limit on active discounts/functions (one is fine).
- Validate `run.js` field names against the current Functions API for your CLI version.
