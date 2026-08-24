/* -------------------------------------------------------------------------- */
/* Config — the custom-print catalogue + placeholder pricing                  */
/*                                                                            */
/* Pure data + helpers extracted from custom-print.design.tsx. No React, no    */
/* DOM — keep this side-effect-free so the route file stays the only stateful  */
/* place. The wizard imports everything it needs from here.                    */
/* -------------------------------------------------------------------------- */

// Each shape is its OWN Shopify product with its own wizard page. The route slug
// in `/custom-print/<slug>` selects the shape: it fixes the shape label (drives
// sizes/patterns/pricing) and which product handle the wizard loads. Adding a new
// shape = create the product + add one entry here (+ a preview if new geometry).
// Sizes + variant prices come LIVE from the product; tiers/patterns stay in code.
export type ShapeRoute = {
  /** Human label used across the wizard (must match the tiers / patterns keys). */
  label: string;
  /** Shopify product handle whose Size × Material variants back this shape. */
  handle: string;
  /** Default logo layout for this shape (square vs triangle pattern sets). */
  defaultPattern: string;
  /** Short blurb for the shape-picker landing. */
  blurb: string;
};

export const SHAPE_ROUTES: Record<string, ShapeRoute> = {
  square: {
    label: 'Square',
    handle: 'custom-square-bandana-wizard',
    defaultPattern: 'single',
    blurb: 'The classic four-sided bandana — from 14″ up to 35″.',
  },
  triangle: {
    label: 'Triangle',
    handle: 'custom-triangle-bandana-wizard',
    defaultPattern: 'tri-single',
    blurb: 'Pre-folded, pointed cut — sized by leg × long edge × leg.',
  },
};

/** Slug (`square`) → shape config, case-insensitive. Null for unknown slugs. */
export function shapeRouteFor(slug: string | undefined): ShapeRoute | null {
  return SHAPE_ROUTES[(slug ?? '').toLowerCase()] ?? null;
}

/**
 * The custom-print wizard path for a Shopify product handle, or null if the
 * handle isn't one of the made-to-order shape products. Lets product cards + the
 * PDP route a shape product straight into its own wizard instead of a generic
 * product page — the single source of truth for the handle⇄route mapping.
 */
export function customWizardPath(handle: string): string | null {
  for (const slug of Object.keys(SHAPE_ROUTES)) {
    if (SHAPE_ROUTES[slug].handle === handle) return `/custom-print/${slug}`;
  }
  return null;
}
export const MATERIALS: Array<{name: string; note: string}> = [
  {name: 'Cotton', note: 'Soft & breathable'},
  {name: 'Polyester', note: 'Quick-dry, vivid print'},
];

// Per-size list price (the "vs" anchor). Volume multipliers discount from here.
export const SIZES: Array<{name: string; list: number}> = [
  {name: '14 x 14', list: 14},
  {name: '18 x 18', list: 18},
  {name: '22 x 22', list: 24},
  {name: '27 x 27', list: 30},
];

// Triangle finished sizes — two legs × hypotenuse (leg × long edge × leg).
export const TRI_SIZES: Array<{name: string; list: number}> = [
  {name: '14 x 20 x 14', list: 14},
  {name: '18 x 24 x 18', list: 18},
  {name: '22 x 30 x 22', list: 24},
  {name: '27 x 38 x 27', list: 30},
];

// The size list depends on the chosen shape (square vs triangle cut).
export function sizesFor(shape: string) {
  return shape === 'Triangle' ? TRI_SIZES : SIZES;
}

/**
 * Normalize a size string for matching — ignore spaces + case so "22 x 22" and
 * "22x22" compare equal. One source of truth for size comparison, used by the
 * variant lookup AND the default/restore-size logic so they never diverge.
 */
export const normalizeSize = (s: string) => s.replace(/\s+/g, '').toLowerCase();

// A sensible default size per shape (the mid option), used when the shape flips.
export const DEFAULT_SIZE: Record<string, string> = {
  Square: '22 x 22',
  Triangle: '22 x 30 x 22',
};

export const MIN_QTY = 12;

// Custom (enter-your-own) bandana dimensions, in inches. Enforced in the wizard
// so 0/negative/out-of-range values can't pass the step and reach the cart.
export const MIN_CUSTOM_IN = 4;
export const MAX_CUSTOM_IN = 80;

/** True only when both custom dimensions are real numbers within the allowed range. */
export function isCustomSizeValid(w: string, h: string): boolean {
  const wn = Number(w);
  const hn = Number(h);
  return (
    Number.isFinite(wn) &&
    Number.isFinite(hn) &&
    wn >= MIN_CUSTOM_IN &&
    wn <= MAX_CUSTOM_IN &&
    hn >= MIN_CUSTOM_IN &&
    hn <= MAX_CUSTOM_IN
  );
}

/* -------------------------------------------------------------------------- */
/* Tiered pricing — derived from the Jurong supplier cost sheet × MARKUP       */
/*                                                                            */
/* Every price is Jurong's fabric cost × 3 (the ALL-IN price; the margin above */
/* cost covers our printing, labor, overhead, and profit). Two cost bases:    */
/*  • 72 pcs and up → Jurong's actual quoted price at that break.             */
/*  • below 72 (their MOQ) → we still buy 72 fabric, so cost/pc =             */
/*    (72 × Jurong-72-price) ÷ the band's typical size, spread over the order.*/
/* The 1–11 band is the base/compare-at price (not sold; minimum order = 12). */
/* -------------------------------------------------------------------------- */

/** Boss's rule: selling price = supplier fabric cost × 3. */
export const MARKUP = 3;

// Jurong fabric EXW cost per piece (USD), by size, at each quoted quantity
// break. Source: Jurong Rongguang price sheet (Cotton 90gsm, one colour).
// NOTE: 35×35 has no Jurong quote — ESTIMATED from 27×27 by area ratio; replace
// with a real quote when available.
export const JURONG_COST: Record<string, Record<number, number>> = {
  // Square
  '14 x 14': {72: 0.99, 144: 0.79, 300: 0.55, 600: 0.45, 1200: 0.42, 3600: 0.32, 6000: 0.3, 12000: 0.27},
  '18 x 18': {72: 1.19, 144: 0.95, 300: 0.65, 600: 0.55, 1200: 0.5, 3600: 0.39, 6000: 0.36, 12000: 0.33},
  '22 x 22': {72: 1.45, 144: 1.15, 300: 0.79, 600: 0.66, 1200: 0.6, 3600: 0.49, 6000: 0.43, 12000: 0.39},
  '27 x 27': {72: 1.75, 144: 1.39, 300: 0.95, 600: 0.83, 1200: 0.8, 3600: 0.73, 6000: 0.66, 12000: 0.62},
  // Triangle
  '14 x 20 x 14': {72: 0.8, 144: 0.7, 300: 0.6, 600: 0.55, 1200: 0.5, 3600: 0.35, 6000: 0.37, 12000: 0.27},
  '18 x 24 x 18': {72: 0.95, 144: 0.85, 300: 0.75, 600: 0.65, 1200: 0.6, 3600: 0.43, 6000: 0.33, 12000: 0.3},
  '22 x 30 x 22': {72: 1.15, 144: 0.95, 300: 0.85, 600: 0.75, 1200: 0.7, 3600: 0.55, 6000: 0.5, 12000: 0.4},
  '27 x 38 x 27': {72: 1.35, 144: 1.15, 300: 1.05, 600: 0.95, 1200: 0.9, 3600: 0.65, 6000: 0.53, 12000: 0.43},
};

/** Anchor size used to price a custom / unlisted size, per shape. */
const ANCHOR_SIZE: Record<string, string> = {
  Square: '22 x 22',
  Triangle: '22 x 30 x 22',
};

export type Tier = {
  min: number;
  max: number | null;
  label: string;
  each: number;
};

// Quantity bands. `mid` = the typical order size the 72-fabric buy is spread
// over for sub-MOQ bands; `brk` = the Jurong quote break for 72+ bands. The
// 1–11 band is the base (compare-at) price — hidden from the tier table.
type Band = {min: number; max: number | null; label: string; mid?: number; brk?: number};
const BANDS: Band[] = [
  {min: 1, max: 11, label: '1 – 11', mid: 6},
  {min: 12, max: 23, label: '12 – 23', mid: 17.5},
  {min: 24, max: 35, label: '24 – 35', mid: 29.5},
  {min: 36, max: 47, label: '36 – 47', mid: 41.5},
  {min: 48, max: 59, label: '48 – 59', mid: 53.5},
  {min: 60, max: 71, label: '60 – 71', mid: 65.5},
  {min: 72, max: 143, label: '72 – 143', brk: 72},
  {min: 144, max: 299, label: '144 – 299', brk: 144},
  {min: 300, max: 599, label: '300 – 599', brk: 300},
  {min: 600, max: 1199, label: '600 – 1,199', brk: 600},
  {min: 1200, max: 3599, label: '1,200 – 3,599', brk: 1200},
  {min: 3600, max: 5999, label: '3,600 – 5,999', brk: 3600},
  {min: 6000, max: 11999, label: '6,000 – 11,999', brk: 6000},
  {min: 12000, max: null, label: '12,000+', brk: 12000},
];

/** Jurong cost map for a size, falling back to the shape's anchor (custom sizes). */
function costMapFor(sizeKey: string, shape: string): Record<number, number> {
  return JURONG_COST[sizeKey] ?? JURONG_COST[ANCHOR_SIZE[shape] ?? '22 x 22'];
}

/** Per-piece selling price for one band of a size = supplier cost × MARKUP. */
function bandPrice(band: Band, cm: Record<number, number>): number {
  const cost =
    band.brk != null ? cm[band.brk] : (72 * cm[72]) / (band.mid as number);
  return Math.round(cost * MARKUP * 100) / 100;
}

/** The full per-size tier ladder (all bands, incl. the 1–11 base at index 0). */
export function tiersFor(sizeKey: string, shape: string): Tier[] {
  const cm = costMapFor(sizeKey, shape);
  return BANDS.map((b) => ({
    min: b.min,
    max: b.max,
    label: b.label,
    each: bandPrice(b, cm),
  }));
}

/** The 1–11 base (compare-at / "regular") price for a size. */
export function basePriceFor(sizeKey: string, shape: string): number {
  return tiersFor(sizeKey, shape)[0].each;
}


export const INTENTS: Array<{value: string; label: string}> = [
  {value: 'ready', label: 'Yes — my design is ready to go'},
  {value: 'help', label: 'No — I need someone to help me design it'},
  {value: 'layout', label: 'I have a design, but need help laying it out'},
];

export const STEPS = ['Bandana', 'Design', 'Quantity', 'Quote'] as const;

// Logo layout patterns — where the logo repeats across the bandana. Positions
// are in the preview's upright coordinate space (see BandanaPreview).
export type LogoMark = {x: number; y: number; rot: number};
const P = 50; // spacing between marks

export function gridMarks(alternate: boolean): LogoMark[] {
  const out: LogoMark[] = [];
  for (const gy of [-1, 0, 1]) {
    for (const gx of [-1, 0, 1]) {
      out.push({
        x: gx * P,
        y: gy * P,
        rot: alternate && (gx + gy) % 2 !== 0 ? 180 : 0,
      });
    }
  }
  return out;
}

export const PATTERNS: Array<{
  value: string;
  label: string;
  marks: LogoMark[];
  full?: boolean;
  seamless?: boolean;
}> = [
  // Full print renders edge-to-edge (the `full` flag drives the <image> branch);
  // it has no per-logo marks, so the array stays empty.
  {value: 'full', label: 'Full print', full: true, marks: []},
  {value: 'single', label: 'Single', marks: [{x: 0, y: 0, rot: 0}]},
  {
    value: 'diagonal',
    label: 'Diagonal ×3',
    marks: [
      {x: -P, y: -P, rot: 0},
      {x: 0, y: 0, rot: 0},
      {x: P, y: P, rot: 0},
    ],
  },
  {
    value: 'four',
    label: '4 logos',
    marks: [
      {x: -P, y: -P, rot: 0},
      {x: P, y: -P, rot: 0},
      {x: -P, y: P, rot: 0},
      {x: P, y: P, rot: 0},
    ],
  },
  {
    value: 'five',
    label: '5 logos',
    marks: [
      {x: -P, y: -P, rot: 0},
      {x: P, y: -P, rot: 0},
      {x: 0, y: 0, rot: 0},
      {x: -P, y: P, rot: 0},
      {x: P, y: P, rot: 0},
    ],
  },
  {value: 'multi-equal', label: 'Multiple · equal', marks: gridMarks(false)},
  {value: 'multi-alt', label: 'Multiple · alternating', marks: gridMarks(true)},
  // Seamless = the design tiled edge-to-edge as a 3×3 grid, no gaps. `marks`
  // only drives the picker thumbnail; the seamless flag drives the tiled render.
  {value: 'seamless', label: 'Seamless', seamless: true, marks: gridMarks(false)},
];

// Triangle layouts — the right-triangle fold (right angle bottom-left). Marks
// are in the same mark space as the square (×2.4 in the preview); positions are
// balanced inside the triangle so logos don't crowd the edges/hypotenuse.
export const TRI_PATTERNS: typeof PATTERNS = [
  {value: 'tri-full', label: 'Full print', full: true, marks: []},
  {value: 'tri-single', label: 'Center', marks: [{x: -28, y: 28, rot: 0}]},
  {
    value: 'tri-corners',
    label: 'Corners ×3',
    // The three corner dots of the (already-balanced) Six-dots grid — i.e. the
    // Six-dots layout with its three inner dots removed.
    marks: [
      {x: -61, y: -27, rot: 0}, // top-left corner (six-dots)
      {x: -61, y: 61, rot: 0}, // bottom-left corner (six-dots)
      {x: 27, y: 61, rot: 0}, // bottom-right corner (six-dots)
    ],
  },
  {
    value: 'tri-six',
    label: 'Six dots',
    marks: [
      {x: -61, y: -27, rot: 0},
      {x: -61, y: 17, rot: 0},
      {x: -17, y: 17, rot: 0},
      {x: -61, y: 61, rot: 0},
      {x: -17, y: 61, rot: 0},
      {x: 27, y: 61, rot: 0},
    ],
  },
  {
    value: 'tri-leg',
    label: 'Leg row',
    // The bottom row of the balanced Six-dots grid — i.e. the Six-dots layout
    // with its top three dots removed. Same structure, no ad-hoc coords.
    marks: [
      {x: -61, y: 61, rot: 0}, // bottom-left (six-dots)
      {x: -17, y: 61, rot: 0}, // bottom-centre (six-dots)
      {x: 27, y: 61, rot: 0}, // bottom-right (six-dots)
    ],
  },
  {
    value: 'tri-diagonal',
    label: 'Diagonal ×3',
    // Diagonal subset of the balanced Six-dots grid: top-left corner → centre
    // → bottom-right corner. Evenly spaced (Δx 44, Δy 44 each step).
    marks: [
      {x: -61, y: -27, rot: 0}, // top-left (six-dots)
      {x: -17, y: 17, rot: 0}, // centre (six-dots)
      {x: 27, y: 61, rot: 0}, // bottom-right (six-dots)
    ],
  },
  {
    value: 'tri-point',
    label: 'Point accent',
    // Single logo on the bottom-right corner of the Six-dots grid.
    marks: [{x: 27, y: 61, rot: 0}],
  },
  // Seamless tile (3×3), clipped to the triangle fold. Thumbnail uses the
  // Six-dots marks; the seamless flag drives the tiled render.
  {
    value: 'tri-seamless',
    label: 'Seamless',
    seamless: true,
    marks: [
      {x: -61, y: -27, rot: 0},
      {x: -61, y: 17, rot: 0},
      {x: -17, y: 17, rot: 0},
      {x: -61, y: 61, rot: 0},
      {x: -17, y: 61, rot: 0},
      {x: 27, y: 61, rot: 0},
    ],
  },
];

export function patternsFor(shape: string) {
  return shape === 'Triangle' ? TRI_PATTERNS : PATTERNS;
}

/* -------------------------------------------------------------------------- */
/* Pricing + formatting helpers (pure)                                        */
/* -------------------------------------------------------------------------- */

/** The tier whose band contains this quantity, for the size's price ladder. */
export function tierFor(qty: number, sizeKey: string, shape = 'Square'): Tier {
  const tiers = tiersFor(sizeKey, shape);
  return (
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1]
  );
}
/** Per-piece price for a quantity + size. */
export function unitPriceFor(qty: number, sizeKey: string, shape = 'Square'): number {
  return tierFor(qty, sizeKey, shape).each;
}
/** Next quantity band above the current qty (for the "order X+ to drop" hint). */
export function nextTier(qty: number, sizeKey: string, shape = 'Square') {
  return tiersFor(sizeKey, shape).find((t) => t.min > qty);
}
export function money(n: number, cc: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cc,
  }).format(n);
}

export const STORAGE_KEY = 'cb:custom-design:v1';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
