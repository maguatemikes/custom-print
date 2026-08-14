/* -------------------------------------------------------------------------- */
/* Config — the custom-print catalogue + placeholder pricing                  */
/*                                                                            */
/* Pure data + helpers extracted from custom-print.design.tsx. No React, no    */
/* DOM — keep this side-effect-free so the route file stays the only stateful  */
/* place. The wizard imports everything it needs from here.                    */
/* -------------------------------------------------------------------------- */

export const SHAPES: Array<{name: string; note: string; soon?: boolean}> = [
  {name: 'Square', note: 'Classic four-sided'},
  {name: 'Triangle', note: 'Pre-folded, pointed'},
];
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
  {name: '35 x 35', list: 40},
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

// A sensible default size per shape (the mid option), used when the shape flips.
export const DEFAULT_SIZE: Record<string, string> = {
  Square: '22 x 22',
  Triangle: '22 x 30 x 22',
};

export const MIN_QTY = 12;

// Uniform Shopify list price every variant starts at — the "you save vs" anchor.
// The volume discount reduces from this down to the per-piece tier price, so it
// must match BASE in the tiered-pricing discount function.
export const LIST_PRICE = 25.0;

// "Buy more, save more" tiers — the all-inclusive per-piece price by quantity
// band (price = the highest break ≤ qty). Shape-specific price sheets: squares
// and triangles differ. Mirrors the Shopify tiered-discount function. Discount %
// is derived from the 12-qty anchor at display time, so it isn't stored here.
export type Tier = {
  min: number;
  max: number | null;
  label: string;
  each: number;
};

// 22×22 square (digital print). Applied to every square size for now.
export const SQUARE_TIERS: Tier[] = [
  {min: 12, max: 23, label: '12 – 23', each: 13.8},
  {min: 24, max: 35, label: '24 – 35', each: 10.64},
  {min: 36, max: 47, label: '36 – 47', each: 8.81},
  {min: 48, max: 59, label: '48 – 59', each: 6.77},
  {min: 60, max: 71, label: '60 – 71', each: 5.73},
  {min: 72, max: 107, label: '72 – 107', each: 4.34},
  {min: 108, max: 143, label: '108 – 143', each: 3.92},
  {min: 144, max: 299, label: '144 – 299', each: 3.65},
  {min: 300, max: 599, label: '300 – 599', each: 3.22},
  {min: 600, max: 1199, label: '600 – 1,199', each: 2.87},
  {min: 1200, max: null, label: '1,200+', each: 2.54},
];

// 22×30×22 triangle. Applied to every triangle size for now.
export const TRIANGLE_TIERS: Tier[] = [
  {min: 12, max: 23, label: '12 – 23', each: 9.8},
  {min: 24, max: 35, label: '24 – 35', each: 6.81},
  {min: 36, max: 47, label: '36 – 47', each: 5.92},
  {min: 48, max: 59, label: '48 – 59', each: 5.27},
  {min: 60, max: 71, label: '60 – 71', each: 4.85},
  {min: 72, max: 107, label: '72 – 107', each: 4.34},
  {min: 108, max: 143, label: '108 – 143', each: 3.91},
  {min: 144, max: 299, label: '144 – 299', each: 3.46},
  {min: 300, max: 599, label: '300 – 599', each: 2.98},
  {min: 600, max: 1199, label: '600 – 1,199', each: 2.76},
  {min: 1200, max: null, label: '1,200+', each: 2.48},
];

/** The price sheet for a shape (triangle vs square). */
export function tiersFor(shape: string): Tier[] {
  return shape === 'Triangle' ? TRIANGLE_TIERS : SQUARE_TIERS;
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

/** The tier whose band contains this quantity, for the shape's price sheet. */
export function tierFor(qty: number, shape = 'Square'): Tier {
  const tiers = tiersFor(shape);
  return (
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1]
  );
}
/** Per-piece price for a quantity, from the shape's tier table. */
export function unitPriceFor(qty: number, shape = 'Square'): number {
  return tierFor(qty, shape).each;
}
/** Next quantity band above the current qty (for the "order X+ to drop" hint). */
export function nextTier(qty: number, shape = 'Square') {
  return tiersFor(shape).find((t) => t.min > qty);
}
export function money(n: number, cc: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cc,
  }).format(n);
}

export const STORAGE_KEY = 'cb:custom-design:v1';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
