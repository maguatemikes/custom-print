/**
 * Store-wide minimum order quantity. Every catalogue product starts at (and
 * can't go below) this in the storefront UI — the wizard, the PDP steppers,
 * the cart line stepper, and cart permalinks all clamp to it.
 *
 * This is a front-end minimum (UX). It is NOT enforced at checkout by Shopify —
 * a cart-validation Function would be needed for that. The custom-print wizard
 * keeps its own MIN_QTY in app/lib/customPrintData.ts (same value).
 */
export const MIN_ORDER_QTY = 12;
