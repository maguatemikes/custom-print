// @ts-check
/**
 * Shopify Product Discount Function — reference logic.
 *
 * Generic + metafield-driven: it reads the shop metafield `custom.volume_pricing`
 * (see pricing.metafield.json) and applies the per-size tiered price to any cart
 * line whose product is listed there. Adding a product = add it to the metafield;
 * NO change to this function, NO redeploy.
 *
 * Rule: selling price per piece = Jurong fabric cost × markup (default 3).
 *   • 72 pcs and up → cost at that Jurong break × markup.
 *   • below 72 (their MOQ) → (72 × cost@72 ÷ band's `mid`) × markup.
 * The variant PRICE must be the highest band (the base) so this can only discount
 * DOWN to the tier price.
 *
 * NOTE FOR RYAN: validate the exact input/return shapes against the current
 * Shopify Functions docs for your CLI version — the field names here match the
 * product-discount API but evolve between versions.
 */

/** @param {{cart:any, discountNode:any, shop:any}} input */
export function run(input) {
  const raw = input?.shop?.metafield?.value;
  const cfg = raw ? JSON.parse(raw) : null;
  const empty = {discountApplicationStrategy: 'FIRST', discounts: []};
  if (!cfg) return empty;

  const markup = cfg.markup ?? 3;
  const bands = cfg.bands ?? [];
  const discounts = [];

  for (const line of input.cart.lines) {
    const variant = line.merchandise;
    const handle = variant?.product?.handle;
    if (!handle) continue;

    const sheet = cfg.products?.[handle]; // self-targeting: skip unlisted products
    if (!sheet) continue;

    const size = variant.selectedOptions?.find((o) => o.name === 'Size')?.value;
    const costs = size ? sheet.sizes?.[size] : null;
    if (!costs) continue; // no cost row for this size → leave the line alone

    const qty = line.quantity;
    const target = tierPrice(costs, qty, bands, markup);
    const base = Number(variant.price?.amount ?? 0); // the variant's list price
    if (!target || base <= 0 || target >= base) continue;

    const percentage = ((1 - target / base) * 100).toFixed(4);
    discounts.push({
      targets: [{cartLine: {id: line.id}}],
      value: {percentage: {value: percentage}},
      message: 'Volume tiered pricing',
    });
  }

  return {discountApplicationStrategy: 'FIRST', discounts};
}

/** Per-piece target price for a quantity, from a size's cost array. */
function tierPrice(costs, qty, bands, markup) {
  // the highest band whose min <= qty
  let band = bands[0];
  for (const b of bands) if (qty >= b.min) band = b;
  const cost =
    band.idx != null ? costs[band.idx] : (72 * costs[0]) / band.mid;
  return Math.round(cost * markup * 100) / 100;
}
