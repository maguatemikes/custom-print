/* -------------------------------------------------------------------------- */
/* Config — the CUSTOM SCARF catalogue + placeholder pricing                   */
/*                                                                            */
/* Sibling to customPrintData.ts (bandanas), but for made-to-order SCARVES:     */
/* square scarves, oblong/rectangular scarves, and shawls/wraps — each a set of  */
/* preset finished sizes. Pure data + helpers — no React, no DOM. Reuses a few    */
/* generic helpers from customPrintData (money, MIN_QTY, EMAIL_RE, MATERIALS,      */
/* the Tier type) but never touches the bandana shapes/sizes/patterns/pricing.     */
/* Size reference: standard scarf/shawl dimension ranges.                          */
/* -------------------------------------------------------------------------- */

import type {Tier} from './customPrintData';
import {MIN_QTY} from './customPrintData';

export {MIN_QTY} from './customPrintData';
export {money, EMAIL_RE, MATERIALS} from './customPrintData';

/* -------------------------------------------------------------------------- */
/* Scarf types — a SELECTABLE catalogue (one shared product)                   */
/*                                                                            */
/* One "Custom Scarf" product backs the wizard (Material variants). The shopper   */
/* picks a TYPE (square / oblong / shawl) and a SIZE inside the wizard; type +      */
/* size ride as line-item attributes and the price is computed from the cut tier    */
/* engine, not a per-type variant. The route slug `/custom-scarf/<slug>` only sets   */
/* the INITIAL type.                                                                  */
/* -------------------------------------------------------------------------- */

/** The single Shopify product backing every scarf type (Material variants). */
export const SCARF_PRODUCT_HANDLE = 'custom-scarf';

export type ScarfSize = {name: string; w: number; h: number};

export type ScarfType = {
  /** Slug key (matches the SCARF_TYPES record key) — used in state + the URL. */
  slug: string;
  /** Human label used across the wizard. */
  label: string;
  /** Short blurb for the type picker. */
  blurb: string;
  /** Preset finished sizes (inches), shown as choices. */
  sizes: ScarfSize[];
  /** Index of the default/mid size. */
  defaultIndex: number;
};

const sq = (n: number): ScarfSize => ({name: `${n} × ${n}`, w: n, h: n});
const rect = (w: number, h: number): ScarfSize => ({name: `${w} × ${h}`, w, h});

export const SCARF_TYPES: Record<string, ScarfType> = {
  square: {
    slug: 'square',
    label: 'Square scarf',
    blurb: 'Bandana & neckerchief through full head-wrap squares.',
    sizes: [sq(18), sq(20), sq(25), sq(28), sq(31), sq(39), sq(51)],
    defaultIndex: 2, // 25 × 25
  },
  oblong: {
    slug: 'oblong',
    label: 'Oblong scarf',
    blurb: 'Rectangular / draping scarves for classic loops & layering.',
    sizes: [rect(12, 60), rect(12, 72), rect(20, 72), rect(32, 72)],
    defaultIndex: 1, // 12 × 72
  },
  shawl: {
    slug: 'shawl',
    label: 'Shawl / wrap',
    blurb: 'Generous wraps for full shoulder coverage & layering.',
    sizes: [rect(36, 71), rect(50, 78), rect(75, 78)],
    defaultIndex: 0, // 36 × 71
  },
};

/** Ordered list of types for the picker UI. */
export const SCARF_TYPE_LIST: ScarfType[] = Object.values(SCARF_TYPES);

// Preview scaling reference (inches): the largest SQUARE side fills the preview
// frame, and every other size scales true-to-ratio from it (so 18×18 is exactly
// 18/51 of a 51×51). Sizes whose longest side exceeds this reference (shawls /
// long oblongs) are clamped to fit the frame.
export const SCARF_REF_DIM = Math.max(
  ...SCARF_TYPES.square.sizes.map((s) => Math.max(s.w, s.h)),
);

/** Slug (`square`) → type config, case-insensitive. Null for unknown slugs. */
export function scarfTypeFor(slug: string | undefined): ScarfType | null {
  return SCARF_TYPES[(slug ?? '').toLowerCase()] ?? null;
}

/** The default size for a type. */
export function defaultSizeFor(type: ScarfType): ScarfSize {
  return type.sizes[type.defaultIndex] ?? type.sizes[0];
}

/** Find a size by name within a type (else its default). */
export function sizeFor(type: ScarfType, name: string): ScarfSize {
  return type.sizes.find((s) => s.name === name) ?? defaultSizeFor(type);
}

/** The scarf-wizard path for a Shopify product handle (the single product). */
export function customScarfPath(handle: string): string | null {
  return handle === SCARF_PRODUCT_HANDLE ? '/custom-scarf/square' : null;
}

/* -------------------------------------------------------------------------- */
/* Alias SKUs — one physical product sold under search-intent names            */
/*                                                                            */
/* The same made-to-order piece maps to a NAMED alias based on type + size     */
/* (Neckerchief, Square scarf, Shawl, …) so we can target search intent and     */
/* carry a traceable SKU on every order. Scheme: ALIAS-WxH-MATERIAL-FINISH.      */
/* PLACEHOLDER mapping — tune the names/bands with the boss's final grouping.    */
/* -------------------------------------------------------------------------- */

export type ScarfAlias = {code: string; label: string};

/** Pick the search-intent alias for a given type + finished size. */
export function scarfAliasFor(
  typeSlug: string,
  w: number,
  h: number,
): ScarfAlias {
  if (typeSlug === 'shawl') return {code: 'SHW', label: 'Shawl / wrap'};
  if (typeSlug === 'oblong') {
    return Math.min(w, h) >= 20
      ? {code: 'DRP', label: 'Draping scarf'}
      : {code: 'OBL', label: 'Oblong scarf'};
  }
  // Square — banded by side length (boss's groupings).
  const s = Math.max(w, h);
  if (s <= 20) return {code: 'NCK', label: 'Neckerchief'};
  if (s <= 29) return {code: 'SQS', label: 'Square scarf'};
  if (s <= 45) return {code: 'LSQ', label: 'Large square scarf'};
  return {code: 'WRP', label: 'Wrap scarf'};
}

const SCARF_MAT_CODE: Record<string, string> = {Cotton: 'CTN', Polyester: 'PLY'};
const SCARF_FINISH_CODE: Record<string, string> = {
  hem: 'HEM',
  rolled: 'ROLL',
  fringe: 'FRNG',
};

/** Build the alias SKU for a configuration: ALIAS_WxH_MATERIAL_FINISH_COLOR
 * (colour = the base hex, uppercased, no `#`). */
export function scarfSku(
  typeSlug: string,
  w: number,
  h: number,
  material: string,
  finishValue: string,
  baseHex: string,
): string {
  const a = scarfAliasFor(typeSlug, w, h);
  const mat = SCARF_MAT_CODE[material] ?? material.slice(0, 3).toUpperCase();
  const fin =
    SCARF_FINISH_CODE[finishValue] ?? finishValue.slice(0, 4).toUpperCase();
  const col = baseHex.replace('#', '').toUpperCase();
  return `${a.code}_${w}x${h}_${mat}_${fin}_${col}`;
}

/* -------------------------------------------------------------------------- */
/* Edge finishing                                                             */
/* -------------------------------------------------------------------------- */

export type ScarfFinish = {value: string; label: string; note: string; surcharge: number};

// Per-piece finishing surcharge (USD), added on top of the area base price.
export const SCARF_FINISHES: ScarfFinish[] = [
  {value: 'hem', label: 'Hemmed edge', note: 'Folded + stitched — clean & durable', surcharge: 2},
  {value: 'rolled', label: 'Rolled hem', note: 'Narrow rolled edge — soft, premium drape', surcharge: 3},
  {value: 'fringe', label: 'Fringed edge', note: 'Knotted fringe — casual, textured', surcharge: 4},
];

export function finishFor(value: string): ScarfFinish {
  return SCARF_FINISHES.find((f) => f.value === value) ?? SCARF_FINISHES[0];
}

export const SCARF_STEPS = ['Scarf', 'Quantity', 'Quote'] as const;

/* -------------------------------------------------------------------------- */
/* Placeholder pricing — area × rate + finishing, with a volume ladder         */
/*                                                                            */
/* PLACEHOLDER until a real scarf price list arrives. Model: per-piece base =    */
/* area (sq in) × RATE × material factor + finishing surcharge; then a quantity-  */
/* band multiplier discounts from the 1–11 "list" price. Swap RATE / MULT for the */
/* supplier sheet when it lands — the wizard reads only the helpers below.         */
/* -------------------------------------------------------------------------- */

/** USD per square inch at the 1–11 (list) band, before volume discount. */
export const SCARF_RATE_PER_SQIN = 0.04;

/** Material price multiplier. */
export const SCARF_MATERIAL_FACTOR: Record<string, number> = {
  Cotton: 1.0,
  Polyester: 1.1,
};

type ScarfBand = {min: number; max: number | null; label: string; mult: number};
const SCARF_BANDS: ScarfBand[] = [
  {min: 1, max: 11, label: '1 – 11', mult: 1.0},
  {min: 12, max: 23, label: '12 – 23', mult: 0.85},
  {min: 24, max: 47, label: '24 – 47', mult: 0.78},
  {min: 48, max: 71, label: '48 – 71', mult: 0.72},
  {min: 72, max: 143, label: '72 – 143', mult: 0.64},
  {min: 144, max: 299, label: '144 – 299', mult: 0.57},
  {min: 300, max: 599, label: '300 – 599', mult: 0.5},
  {min: 600, max: 1199, label: '600 – 1,199', mult: 0.45},
  {min: 1200, max: null, label: '1,200+', mult: 0.4},
];

/** Fabric area (sq in) for a scarf size. */
export function scarfArea(w: number, h: number): number {
  return w * h;
}

/** Per-piece list (1–11 / compare-at) price before the volume discount. */
export function scarfListPrice(
  areaSqIn: number,
  finishValue: string,
  material: string,
): number {
  const mat = SCARF_MATERIAL_FACTOR[material] ?? 1;
  const base =
    areaSqIn * SCARF_RATE_PER_SQIN * mat + finishFor(finishValue).surcharge;
  return Math.round(base * 100) / 100;
}

/** The full tier ladder for a given area + finish + material. */
export function scarfTiers(
  areaSqIn: number,
  finishValue: string,
  material: string,
): Tier[] {
  const list = scarfListPrice(areaSqIn, finishValue, material);
  return SCARF_BANDS.map((b) => ({
    min: b.min,
    max: b.max,
    label: b.label,
    each: Math.round(list * b.mult * 100) / 100,
  }));
}

/** The tier whose band contains this quantity. */
export function scarfTierFor(
  qty: number,
  areaSqIn: number,
  finishValue: string,
  material: string,
): Tier {
  const tiers = scarfTiers(areaSqIn, finishValue, material);
  return (
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1]
  );
}

/** Per-piece price for a quantity. */
export function scarfUnitPrice(
  qty: number,
  areaSqIn: number,
  finishValue: string,
  material: string,
): number {
  return scarfTierFor(qty, areaSqIn, finishValue, material).each;
}

/** Next quantity band above the current qty (for the "order X+ to drop" hint). */
export function scarfNextTier(
  qty: number,
  areaSqIn: number,
  finishValue: string,
  material: string,
): Tier | undefined {
  return scarfTiers(areaSqIn, finishValue, material).find((t) => t.min > qty);
}

export const SCARF_STORAGE_KEY = 'cb:custom-scarf:v1';

// Default base colour for a new scarf (matches the bandana wizard's red).
export const SCARF_DEFAULT_HEX = '#e23b3b';
