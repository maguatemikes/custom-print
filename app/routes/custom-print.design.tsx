import {useEffect, useMemo, useRef, useState} from 'react';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/custom-print.design';
import {siteOrigin} from '~/lib/seo';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {useAside} from '~/components/Aside';

/* -------------------------------------------------------------------------- */
/* Config — the custom-print catalogue + placeholder pricing                  */
/* -------------------------------------------------------------------------- */

const SHAPES: Array<{name: string; note: string}> = [
  {name: 'Square', note: 'Classic four-sided'},
  {name: 'Triangle', note: 'Pre-folded, pointed'},
];
const MATERIALS: Array<{name: string; note: string}> = [
  {name: 'Cotton', note: 'Soft & breathable'},
  {name: 'Polyester', note: 'Quick-dry, vivid print'},
];

// Per-size list price (the "vs" anchor). Volume multipliers discount from here.
const SIZES: Array<{name: string; list: number}> = [
  {name: '14 x 14', list: 14},
  {name: '18 x 18', list: 18},
  {name: '22 x 22', list: 24},
  {name: '27 x 27', list: 30},
  {name: '35 x 35', list: 40},
];

const MIN_QTY = 12;

// The undiscounted single-unit price (qty 1–11) — the "you save vs" anchor.
const BASE_PRICE = 25.0;

// "Buy more, save more" tiers — mirrors the Shopify tiered-discount function.
// `label` is the band shown in the table; `each` is the per-piece price.
type Tier = {
  min: number;
  max: number | null;
  label: string;
  discount: string;
  each: number;
};
const TIERS: Tier[] = [
  {min: 1, max: 11, label: '11', discount: '—', each: 25.0},
  {min: 12, max: 23, label: '12 – 23', discount: '23.08%', each: 19.23},
  {min: 24, max: 35, label: '24 – 35', discount: '42.4%', each: 14.4},
  {min: 36, max: 47, label: '36 – 47', discount: '48.72%', each: 12.82},
  {min: 48, max: 59, label: '48 – 59', discount: '55.92%', each: 11.02},
  {min: 60, max: 71, label: '60 – 71', discount: '61.52%', each: 9.62},
  {min: 72, max: 83, label: '72 – 83', discount: '63.16%', each: 9.21},
  {min: 84, max: 143, label: '84 – 143', discount: '62.88%', each: 9.28},
  {min: 144, max: 299, label: '144 – 299', discount: '74.68%', each: 6.33},
  {min: 300, max: 599, label: '300 – 599', discount: '78.32%', each: 5.42},
  {min: 600, max: 1199, label: '600 – 1,199', discount: '84.96%', each: 3.76},
  {min: 1200, max: 3599, label: '1,200 – 3,599', discount: '86.36%', each: 3.41},
  {min: 3600, max: null, label: '3,600+', discount: '88.6%', each: 2.85},
];

const INTENTS: Array<{value: string; label: string}> = [
  {value: 'ready', label: 'Yes — my design is ready to go'},
  {value: 'help', label: 'No — I need someone to help me design it'},
  {value: 'layout', label: 'I have a design, but need help laying it out'},
];

const STEPS = ['Bandana', 'Design', 'Quantity', 'Quote'] as const;

// Logo layout patterns — where the logo repeats across the bandana. Positions
// are in the preview's upright coordinate space (see BandanaPreview).
type LogoMark = {x: number; y: number; rot: number};
const P = 50; // spacing between marks

function gridMarks(alternate: boolean): LogoMark[] {
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

const PATTERNS: Array<{
  value: string;
  label: string;
  marks: LogoMark[];
  full?: boolean;
}> = [
  {
    value: 'full',
    label: 'Full print',
    full: true,
    marks: [{x: 0, y: 0, rot: 0}],
  },
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
];

function patternMarks(value: string): LogoMark[] {
  return PATTERNS.find((p) => p.value === value)?.marks ?? PATTERNS[0].marks;
}

/* -------------------------------------------------------------------------- */
/* SEO + loader                                                               */
/* -------------------------------------------------------------------------- */

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Design your custom bandana — custombandanas';
  const description =
    'Build your fully custom, made-to-order bandana in four steps: shape & size, quantity, design help, and an instant quote. Printed to order — proof before we print.';
  const url = `${siteOrigin(matches)}/custom-print/design`;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
  ];
};

type WizardVariant = {
  id: string;
  size: string;
  material: string;
  amount: number;
  currencyCode: string;
  variantTitle: string;
  image: {
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
};

/**
 * Loads the "Design your bandana" product's Size × Material variants — the price
 * buckets each custom order attaches to (design specifics ride as line-item
 * attributes). The wizard picks the variant matching the chosen Size + Material
 * (custom size → the `Custom` variant). If the product isn't published to the
 * Headless channel, `variants` is empty and the wizard shows a setup notice.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {storefront} = context;
  let variants: WizardVariant[] = [];
  let currencyCode = 'USD';
  let productTitle = 'Design your bandana';
  let productHandle = 'design-your-bandana';
  try {
    const data = (await storefront.query(CUSTOM_PRODUCT_QUERY, {
      variables: {handle: 'design-your-bandana'},
    })) as {
      product?: {
        title?: string;
        handle?: string;
        variants?: {
          nodes?: Array<{
            id: string;
            title?: string;
            price?: {amount?: string; currencyCode?: string};
            image?: {
              url?: string;
              altText?: string | null;
              width?: number | null;
              height?: number | null;
            } | null;
            selectedOptions?: Array<{name: string; value: string}>;
          }>;
        };
      } | null;
    };
    if (data?.product?.title) productTitle = data.product.title;
    if (data?.product?.handle) productHandle = data.product.handle;
    variants = (data?.product?.variants?.nodes ?? []).map((v) => {
      const opt = (n: string) =>
        v.selectedOptions?.find((o) => o.name === n)?.value ?? '';
      return {
        id: v.id,
        size: opt('Size'),
        material: opt('Material'),
        amount: Number(v.price?.amount ?? 0),
        currencyCode: v.price?.currencyCode ?? 'USD',
        variantTitle: v.title ?? '',
        image: v.image?.url
          ? {
              url: v.image.url,
              altText: v.image.altText ?? null,
              width: v.image.width ?? null,
              height: v.image.height ?? null,
            }
          : null,
      };
    });
    currencyCode = variants[0]?.currencyCode ?? 'USD';
  } catch {
    // Product not published to the headless channel yet — handled in the UI.
  }
  return {variants, currencyCode, productTitle, productHandle};
}

/* -------------------------------------------------------------------------- */
/* Pricing helpers                                                            */
/* -------------------------------------------------------------------------- */

/** The tier whose band contains this quantity. */
function tierFor(qty: number): Tier {
  return (
    TIERS.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    TIERS[TIERS.length - 1]
  );
}
/** Per-piece price for a quantity, from the tier table. */
function unitPriceFor(qty: number): number {
  return tierFor(qty).each;
}
/** Next quantity band above the current qty (for the "order X+ to drop" hint). */
function nextTier(qty: number) {
  return TIERS.find((t) => t.min > qty);
}
function money(n: number, cc: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cc,
  }).format(n);
}

const STORAGE_KEY = 'cb:custom-design:v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST a data URL to the upload route → Shopify Files CDN URL (null on fail). */
async function uploadImage(
  dataUrl: string,
  filename: string,
): Promise<string | null> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({dataUrl, filename}),
    });
    const json = (await res.json()) as {url?: string};
    return json.url ?? null;
  } catch {
    return null;
  }
}

/** Rasterize the live preview SVG to a PNG data URL (the composite proof). */
function svgToPng(svg: SVGSVGElement, size = 600): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  const xml = new XMLSerializer().serializeToString(clone);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas context'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('svg render failed'));
    img.src = src;
  });
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export default function CustomDesign() {
  const {variants, currencyCode, productTitle, productHandle} =
    useLoaderData<typeof loader>();
  const {open} = useAside();

  const [step, setStep] = useState(0);
  // Pre-selected sensible defaults — the first step is valid on arrival and a
  // price shows immediately (lower friction + a default-anchoring nudge).
  const [shape, setShape] = useState<string>('Square');
  const [size, setSize] = useState<string>('22 x 22');
  const [customSize, setCustomSize] = useState(false);
  const [csW, setCsW] = useState('');
  const [csH, setCsH] = useState('');
  const [material, setMaterial] = useState<string>('Cotton');
  const [keepWhite, setKeepWhite] = useState(true);
  const [baseHex, setBaseHex] = useState('#e23b3b');
  const [qty, setQty] = useState<number>(MIN_QTY);
  const [email, setEmail] = useState('');
  const [deliveryAck, setDeliveryAck] = useState(false);
  const [terms, setTerms] = useState(false);
  const [intent, setIntent] = useState<string>('ready');
  const [pattern, setPattern] = useState<string>('single');
  const [logo, setLogo] = useState<{
    name: string;
    type: string;
    size: number;
    preview: string | null;
    dataUrl: string | null;
  } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoRotate, setLogoRotate] = useState(0);
  const [logoScale, setLogoScale] = useState(100);
  // Hosted CDN URLs (Shopify Files). Null until uploaded (or if no token yet).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [designOutput, setDesignOutput] = useState<string | null>(null);

  // Restore saved progress on mount ("your selections are saved as you go").
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.step === 'number') setStep(s.step);
      if (s.shape) setShape(s.shape);
      if (s.size) setSize(s.size);
      if (s.material) setMaterial(s.material);
      if (typeof s.customSize === 'boolean') setCustomSize(s.customSize);
      if (s.csW) setCsW(s.csW);
      if (s.csH) setCsH(s.csH);
      if (typeof s.keepWhite === 'boolean') setKeepWhite(s.keepWhite);
      if (s.baseHex) setBaseHex(s.baseHex);
      if (s.qty) setQty(s.qty);
      if (s.email) setEmail(s.email);
      if (s.deliveryAck) setDeliveryAck(true);
      if (s.terms) setTerms(true);
      if (s.intent) setIntent(s.intent);
      if (s.pattern) setPattern(s.pattern);
      if (typeof s.logoRotate === 'number') setLogoRotate(s.logoRotate);
      if (typeof s.logoScale === 'number') setLogoScale(s.logoScale);
    } catch {
      /* ignore corrupt state */
    }
  }, []);

  // Persist progress.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          shape,
          size,
          customSize,
          csW,
          csH,
          material,
          keepWhite,
          baseHex,
          qty,
          email,
          deliveryAck,
          terms,
          intent,
          pattern,
          logoRotate,
          logoScale,
        }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [
    step,
    shape,
    size,
    customSize,
    csW,
    csH,
    material,
    keepWhite,
    baseHex,
    qty,
    email,
    deliveryAck,
    terms,
    intent,
    pattern,
    logoRotate,
    logoScale,
  ]);

  // Upload the logo to Shopify Files the moment it's chosen (so the CDN URL is
  // ready well before checkout). Falls back to null if no Admin token yet.
  useEffect(() => {
    if (!logo?.dataUrl) {
      setLogoUrl(null);
      return;
    }
    let cancelled = false;
    uploadImage(logo.dataUrl, logo.name).then((u) => {
      if (!cancelled) setLogoUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [logo?.dataUrl, logo?.name]);

  // On the Quote step, rasterize the preview → composite PNG → host it as the
  // "Design output" (the whole rendered bandana). Uploaded ahead of add-to-cart.
  useEffect(() => {
    if (step !== 3) return;
    const svg = document.querySelector<SVGSVGElement>(
      'svg[aria-label$="preview"]',
    );
    if (!svg) return;
    let cancelled = false;
    svgToPng(svg)
      .then((png) => uploadImage(png, `design-output-${step}.png`))
      .then((u) => {
        if (!cancelled) setDesignOutput(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step]);

  const sizeReady = customSize ? Boolean(csW && csH) : Boolean(size);
  const sizeDisplay = customSize
    ? `${csW || '?'} × ${csH || '?'} in`
    : size
      ? `${size} in`
      : '';

  // Match the chosen Size + Material to a real Shopify variant (custom → the
  // "Custom" size variant). Price + checkout come from that variant.
  const sizeOption = customSize ? 'Custom' : size;
  const selectedVariant = useMemo(
    () =>
      variants.find(
        (v) => v.size === sizeOption && v.material === material,
      ) ?? null,
    [variants, sizeOption, material],
  );
  const variantId = selectedVariant?.id ?? null;
  // "Buy more, save more" tiered pricing (mirrors the Shopify discount function).
  const unit = unitPriceFor(qty);
  const total = unit * qty;
  const list = BASE_PRICE;
  const saved = (BASE_PRICE - unit) * qty;
  const nt = nextTier(qty);
  const intentLabel = INTENTS.find((i) => i.value === intent)?.label ?? '';
  const patternLabel = PATTERNS.find((p) => p.value === pattern)?.label ?? '';
  const baseColor = keepWhite ? '#ffffff' : baseHex;
  const baseLabel = keepWhite ? 'White base' : `${baseHex.toUpperCase()} base`;

  const stepValid = [
    Boolean(shape && sizeReady && material), // Bandana
    Boolean(intent), // Design
    qty >= MIN_QTY && EMAIL_RE.test(email) && deliveryAck && terms, // Quantity
    true, // Quote
  ];

  const attributes = [
    {key: 'Custom order', value: 'Bandana'},
    {key: 'Shape', value: shape},
    {key: 'Size', value: sizeDisplay},
    {key: 'Material', value: material},
    {key: 'Base colour', value: keepWhite ? 'White' : baseHex},
    {key: 'Logo layout', value: patternLabel},
    ...(logo ? [{key: 'Logo', value: logoUrl ?? logo.name}] : []),
    ...(logo
      ? [{key: 'Logo adjust', value: `${logoRotate}° · ${logoScale}%`}]
      : []),
    ...(designOutput ? [{key: 'Design output', value: designOutput}] : []),
    {key: 'Quantity', value: String(qty)},
    {key: 'Design help', value: intentLabel},
    {key: 'Contact email', value: email},
  ];

  // Rich merchandise object so useOptimisticCart renders the line instantly
  // (title, price, image) — no empty-cart flash before the server responds.
  const merchandise = selectedVariant
    ? {
        id: selectedVariant.id,
        availableForSale: true,
        title: selectedVariant.variantTitle,
        price: {amount: String(selectedVariant.amount), currencyCode},
        image: selectedVariant.image,
        product: {handle: productHandle, title: productTitle},
        selectedOptions: [
          {name: 'Size', value: selectedVariant.size},
          {name: 'Material', value: selectedVariant.material},
        ],
      }
    : null;

  const lines = variantId
    ? [{merchandiseId: variantId, quantity: qty, selectedVariant: merchandise, attributes}]
    : [];

  return (
    <div className="bg-paper">
      <div className="ui-container py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          {/* Left — live preview (same footprint as the PDP gallery) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <BandanaPreview
              shape={shape}
              size={sizeDisplay}
              material={material}
              qty={qty}
              baseColor={baseColor}
              logoPreview={logo?.preview ?? null}
              marks={patternMarks(pattern)}
              fullDesign={pattern === 'full'}
              logoRotate={logoRotate}
              logoScale={logoScale}
            />
          </div>

          {/* Right — configurator (PDP info column) */}
          <div className="lg:py-2">
            <p className="eyebrow text-brand-700">Custom Print</p>
            <h1 className="mt-1 text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
              Design your bandana
            </h1>
            <p className="mt-2 text-sm text-muted">
              Made to order · we proof your artwork before anything goes on
              fabric.
            </p>

            {/* Live running price once we know size */}
            <div className="mt-4 flex items-end gap-3">
              <span className="text-2xl font-extrabold text-ink">
                {sizeReady ? money(total, currencyCode) : '—'}
              </span>
              {sizeReady ? (
                <span className="pb-0.5 text-sm text-muted">
                  {money(unit, currencyCode)}/pc · {qty} pcs
                </span>
              ) : (
                <span className="pb-0.5 text-sm text-muted">
                  Pick a size to see pricing
                </span>
              )}
            </div>

            <ProgressBar step={step} />

            <div className="mt-6">
              {step === 0 ? (
                <BandanaStep
                  shape={shape}
                  setShape={setShape}
                  size={size}
                  setSize={setSize}
                  customSize={customSize}
                  setCustomSize={setCustomSize}
                  csW={csW}
                  setCsW={setCsW}
                  csH={csH}
                  setCsH={setCsH}
                  material={material}
                  setMaterial={setMaterial}
                  keepWhite={keepWhite}
                  setKeepWhite={setKeepWhite}
                  baseHex={baseHex}
                  setBaseHex={setBaseHex}
                />
              ) : null}

              {step === 1 ? (
                <DesignStep
                  intent={intent}
                  setIntent={setIntent}
                  pattern={pattern}
                  setPattern={setPattern}
                  logo={logo}
                  setLogo={setLogo}
                  logoError={logoError}
                  setLogoError={setLogoError}
                  logoRotate={logoRotate}
                  setLogoRotate={setLogoRotate}
                  logoScale={logoScale}
                  setLogoScale={setLogoScale}
                />
              ) : null}

              {step === 2 ? (
                <QuantityStep
                  qty={qty}
                  setQty={setQty}
                  currencyCode={currencyCode}
                  email={email}
                  setEmail={setEmail}
                  deliveryAck={deliveryAck}
                  setDeliveryAck={setDeliveryAck}
                  terms={terms}
                  setTerms={setTerms}
                />
              ) : null}

              {step === 3 ? (
                <QuoteStep
                  shape={shape}
                  size={sizeDisplay}
                  material={material}
                  baseLabel={baseLabel}
                  qty={qty}
                  list={list}
                  unit={unit}
                  total={total}
                  saved={saved}
                  nextT={nt}
                  currencyCode={currencyCode}
                  variantId={variantId}
                  lines={lines}
                  onAdded={() => open('cart')}
                  preview={
                    <BandanaPreview
                      shape={shape}
                      size={sizeDisplay}
                      material={material}
                      qty={qty}
                      baseColor={baseColor}
                      logoPreview={logo?.preview ?? null}
                      marks={patternMarks(pattern)}
                      fullDesign={pattern === 'full'}
                      logoRotate={logoRotate}
                      logoScale={logoScale}
                      compact
                    />
                  }
                  specs={[
                    {
                      label: 'Base colour',
                      value: keepWhite ? 'White' : baseHex.toUpperCase(),
                      color: baseColor,
                    },
                    {label: 'Logo layout', value: patternLabel},
                    ...(logo
                      ? [
                          {label: 'Logo', value: logo.name},
                          {
                            label: 'Rotate / size',
                            value: `${logoRotate}° · ${logoScale}%`,
                          },
                        ]
                      : [{label: 'Logo', value: 'None'}]),
                    {label: 'Design help', value: intentLabel},
                  ]}
                />
              ) : null}
            </div>

            {/* Nav */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/10 pt-5">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="btn btn-ghost text-ink disabled:opacity-0"
              >
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!stepValid[step]}
                  className="btn min-h-11 bg-orange-500 px-6 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Step {step + 2} →
                </button>
              ) : (
                <span />
              )}
            </div>

            <p className="mt-4 text-xs text-muted">
              Your selections are saved as you go.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Live preview tile — mirrors the PDP gallery footprint (rounded-3xl mint tile).
 * Renders a representative bandana mockup that reacts to the chosen shape/size;
 * the real artwork is collected after checkout, so the centre shows an "artwork"
 * placeholder rather than faking a design.
 */
function BandanaPreview({
  shape,
  size,
  material,
  qty,
  baseColor,
  logoPreview,
  marks,
  fullDesign,
  logoRotate,
  logoScale,
  compact,
}: {
  shape: string;
  size: string;
  material: string;
  qty: number;
  baseColor: string;
  logoPreview: string | null;
  marks: LogoMark[];
  fullDesign: boolean;
  logoRotate: number;
  logoScale: number;
  compact?: boolean;
}) {
  const isTriangle = shape === 'Triangle';
  const art = `rotate(${logoRotate}) scale(${logoScale / 100})`;

  // Placeholder ink flips to light on dark bases so it stays visible on any
  // base colour (adaptive contrast rather than a fixed dark tone).
  const lum = (() => {
    const h = baseColor.replace('#', '');
    if (h.length < 6) return 1;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  })();
  const onDark = lum < 0.5;
  const phStroke = onDark ? 'rgba(255,255,255,0.8)' : 'rgba(16,20,16,0.3)';
  const phText = onDark ? 'rgba(255,255,255,0.92)' : 'rgba(16,20,16,0.45)';
  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-mint">
        {!compact ? (
          <span className="eyebrow absolute left-5 top-5 z-10 text-brand-700">
            Preview
          </span>
        ) : null}

        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${shape || 'Bandana'} preview`}
        >
          <g transform="translate(200 200)">
            {/* Clean, upright bandana filling the whole canvas */}
            {isTriangle ? (
              <path d="M0 -200 L200 200 L-200 200 Z" fill={baseColor} />
            ) : (
              <rect
                x="-200"
                y="-200"
                width="400"
                height="400"
                fill={baseColor}
              />
            )}

            {fullDesign ? (
              /* Full print — your own edge-to-edge design covers the bandana */
              logoPreview ? (
                <g transform={art}>
                  <image
                    href={logoPreview}
                    x="-200"
                    y="-200"
                    width="400"
                    height="400"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              ) : (
                <>
                  <rect
                    x="-165"
                    y="-165"
                    width="330"
                    height="330"
                    fill="none"
                    stroke={phStroke}
                    strokeWidth="2"
                    strokeDasharray="9 9"
                  />
                  <text
                    x="0"
                    y="6"
                    textAnchor="middle"
                    fontSize="19"
                    fontWeight="700"
                    fill={phText}
                    letterSpacing="1.5"
                  >
                    YOUR DESIGN
                  </text>
                </>
              )
            ) : (
              /* Logo layout — uploaded artwork or a placeholder */
              marks.map((m, i) => (
                <g
                  key={i}
                  transform={`translate(${m.x * 2.4} ${m.y * 2.4 + (isTriangle ? 45 : 0)}) rotate(${m.rot})`}
                >
                  {logoPreview ? (
                    <image
                      href={logoPreview}
                      x="-20"
                      y="-20"
                      width="40"
                      height="40"
                      transform={art}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : (
                    <>
                      <rect
                        x="-20"
                        y="-20"
                        width="40"
                        height="40"
                        rx="6"
                        fill="none"
                        stroke={phStroke}
                        strokeWidth="1.4"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill={phText}
                        letterSpacing="0.5"
                      >
                        LOGO
                      </text>
                    </>
                  )}
                </g>
              ))
            )}
          </g>
        </svg>
      </div>

      {!compact ? (
        <p className="mt-2 text-xs text-muted">
          Representative mockup — upload your real artwork after checkout.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

function ProgressBar({step}: {step: number}) {
  // Endowed-progress head start: the fill reaches the NEXT circle, so step 1
  // already looks underway (stops on circle 2) — a nudge to finish.
  const reached = Math.min(step + 1, STEPS.length - 1);
  const pct = Math.round((reached / (STEPS.length - 1)) * 100);
  return (
    <div
      className="mt-5"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Design progress"
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-ink">
          Step {step + 1} of {STEPS.length} ·{' '}
          <span className="text-muted">{STEPS[step]}</span>
        </span>
        <span className="text-muted">{pct}%</span>
      </div>

      {/* Continuous filled track with step circles on top */}
      <div className="relative flex items-center justify-between">
        <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-mint" />
        <span
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500 transition-all duration-300"
          style={{width: `${pct}%`}}
        />
        {STEPS.map((label, i) => {
          const passed = i <= reached;
          return (
            <span
              key={label}
              className={`relative z-10 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ring-2 ring-paper transition-colors ${
                passed ? 'bg-brand-500 text-white' : 'bg-mint text-muted'
              }`}
            >
              {passed ? '✓' : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Numbered sub-field — mirrors the PDP "Personalize me" step element (ink number
 * badge + title + description line, content indented under it).
 */
function Field({
  n,
  title,
  hint,
  children,
}: {
  n?: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        {n ? (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
            {n}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className={n ? 'pl-7' : ''}>{children}</div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${
        selected
          ? 'border-ink bg-ink text-white'
          : 'border-black/15 bg-white text-ink hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

function BandanaStep({
  shape,
  setShape,
  size,
  setSize,
  customSize,
  setCustomSize,
  csW,
  setCsW,
  csH,
  setCsH,
  material,
  setMaterial,
  keepWhite,
  setKeepWhite,
  baseHex,
  setBaseHex,
}: {
  shape: string;
  setShape: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  customSize: boolean;
  setCustomSize: (v: boolean) => void;
  csW: string;
  setCsW: (v: string) => void;
  csH: string;
  setCsH: (v: string) => void;
  material: string;
  setMaterial: (v: string) => void;
  keepWhite: boolean;
  setKeepWhite: (v: boolean) => void;
  baseHex: string;
  setBaseHex: (v: string) => void;
}) {
  return (
    <div>
      <Field
        n={1}
        title="Base colour"
        hint="Start on a white base, or pick any colour from the spectrum."
      >
        <div className="mb-3 grid grid-cols-2 gap-2">
          <OptionCard selected={keepWhite} onClick={() => setKeepWhite(true)}>
            White base
          </OptionCard>
          <OptionCard selected={!keepWhite} onClick={() => setKeepWhite(false)}>
            Custom colour
          </OptionCard>
        </div>
        {!keepWhite ? (
          <ColorSpectrum value={baseHex} onChange={setBaseHex} />
        ) : null}
      </Field>

      <Field n={2} title="Bandana shape" hint="Choose the cut of your bandana.">

        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map((s) => (
            <OptionCard
              key={s.name}
              selected={shape === s.name}
              onClick={() => setShape(s.name)}
            >
              {s.name}
            </OptionCard>
          ))}
        </div>
      </Field>

      <Field n={3} title="Bandana size" hint="Pick a finished size.">
        <SelectMenu
          ariaLabel="Bandana size"
          value={customSize ? 'custom' : size}
          onChange={(v) => {
            if (v === 'custom') {
              setCustomSize(true);
            } else {
              setCustomSize(false);
              setSize(v);
            }
          }}
          options={[
            ...SIZES.map((s) => ({value: s.name, label: `${s.name} in`})),
            {value: 'custom', label: 'Custom size — enter your own'},
          ]}
        />
        {customSize ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={4}
              max={80}
              placeholder="W"
              value={csW}
              onChange={(e) => setCsW(e.target.value)}
              aria-label="Custom width in inches"
              className="h-11 w-20 rounded-lg border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="text-muted">×</span>
            <input
              type="number"
              min={4}
              max={80}
              placeholder="H"
              value={csH}
              onChange={(e) => setCsH(e.target.value)}
              aria-label="Custom height in inches"
              className="h-11 w-20 rounded-lg border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="text-sm text-muted">inches</span>
          </div>
        ) : null}
      </Field>

      <Field n={4} title="Material" hint="Choose the fabric we print on.">
        <SelectMenu
          ariaLabel="Material"
          value={material}
          onChange={setMaterial}
          options={MATERIALS.map((m) => ({
            value: m.name,
            label: m.name,
            meta: m.note,
          }))}
        />
      </Field>
    </div>
  );
}

/**
 * "Buy more, save more" tier table — row labels (Qty / Discount / Price-each)
 * + horizontally drag-scrollable tier columns. The band containing the current
 * quantity is highlighted; tapping a band sets the quantity to its start.
 */
function TierTable({
  qty,
  setQty,
  currencyCode,
}: {
  qty: number;
  setQty: (v: number) => void;
  currencyCode: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({down: false, moved: false, startX: 0, scrollLeft: 0});
  const active = tierFor(qty);

  const onDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    drag.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
  };
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    const d = drag.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.scrollLeft - dx;
  };
  const end = () => {
    drag.current.down = false;
  };

  return (
    <div className="max-w-md overflow-hidden rounded-xl border border-black/10">
      <div className="flex">
        {/* Sticky row labels */}
        <div className="shrink-0 border-r border-black/10 bg-white text-[11px] font-semibold text-muted">
          <div className="flex h-10 items-center px-3">Quantity</div>
          <div className="flex h-7 items-center px-3">Discount</div>
          <div className="flex h-8 items-center px-3">Price/each</div>
        </div>
        {/* Scrollable tier columns */}
        <div
          ref={ref}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={end}
          onPointerLeave={end}
          className="no-scrollbar flex flex-1 cursor-grab select-none overflow-x-auto active:cursor-grabbing"
        >
          {TIERS.filter((t) => t.min >= MIN_QTY).map((t) => {
            const isActive = t === active;
            return (
              <button
                key={t.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  if (drag.current.moved) return;
                  setQty(Math.max(MIN_QTY, t.min));
                }}
                className={`w-[74px] shrink-0 border-l border-black/5 text-center transition first:border-l-0 ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-ink hover:bg-mint'
                }`}
              >
                <span className="flex h-10 items-center justify-center px-1 text-[11px] font-semibold leading-tight">
                  {t.label}
                </span>
                <span
                  className={`flex h-7 items-center justify-center text-[11px] ${
                    isActive ? 'text-white/80' : 'text-brand-700'
                  }`}
                >
                  {t.discount}
                </span>
                <span className="flex h-8 items-center justify-center text-xs font-bold">
                  {money(t.each, currencyCode)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuantityStep({
  qty,
  setQty,
  currencyCode,
  email,
  setEmail,
  deliveryAck,
  setDeliveryAck,
  terms,
  setTerms,
}: {
  qty: number;
  setQty: (v: number) => void;
  currencyCode: string;
  email: string;
  setEmail: (v: string) => void;
  deliveryAck: boolean;
  setDeliveryAck: (v: boolean) => void;
  terms: boolean;
  setTerms: (v: boolean) => void;
}) {
  return (
    <div>
      <Field
        n={1}
        title="Quantity"
        hint={`Buy more, save more — minimum order ${MIN_QTY} pieces; the more you order, the lower the unit price.`}
      >
        <TierTable qty={qty} setQty={setQty} currencyCode={currencyCode} />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted">Or enter a quantity</span>
          <input
            type="number"
            min={MIN_QTY}
            value={qty}
            onChange={(e) =>
              setQty(Math.max(MIN_QTY, Number(e.target.value) || MIN_QTY))
            }
            aria-label="Custom quantity"
            className="h-11 w-24 rounded-xl border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <span className="text-sm text-muted">pcs</span>
        </div>
        {qty < MIN_QTY ? (
          <p className="mt-2 text-xs font-semibold text-red-600">
            Minimum order is {MIN_QTY} pieces.
          </p>
        ) : null}
      </Field>

      <Field
        n={2}
        title="Email for your quote"
        hint="We'll send your quote and design-intake link here."
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email"
          className="h-11 w-full rounded-xl border border-black/15 px-4 text-sm focus:border-brand-500 focus:outline-none"
        />
      </Field>

      <div className="rounded-xl bg-mint p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink">
          Delivery time
        </h3>
        <p className="mt-1 text-sm text-muted">
          Standard production &amp; delivery is roughly 20–30 business days after
          your design is approved. Rush options may be available — ask our team.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={deliveryAck}
            onChange={(e) => setDeliveryAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          I understand and acknowledge the estimated delivery time.
        </label>
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          I agree to the Terms &amp; Conditions and understand custom orders are
          non-refundable once production begins.
        </label>
      </div>
    </div>
  );
}

/** Mini thumbnail illustrating a logo layout (dots). */
function PatternThumb({marks}: {marks: LogoMark[]}) {
  return (
    <svg viewBox="-90 -90 180 180" className="h-11 w-11" aria-hidden="true">
      {marks.map((m, i) => (
        <rect
          key={i}
          x="-11"
          y="-11"
          width="22"
          height="22"
          rx="4"
          transform={`translate(${m.x * 1.45} ${m.y * 1.45}) rotate(${m.rot})`}
          fill="currentColor"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

function DesignStep({
  intent,
  setIntent,
  pattern,
  setPattern,
  logo,
  setLogo,
  logoError,
  setLogoError,
  logoRotate,
  setLogoRotate,
  logoScale,
  setLogoScale,
}: {
  intent: string;
  setIntent: (v: string) => void;
  pattern: string;
  setPattern: (v: string) => void;
  logo: {
    name: string;
    type: string;
    size: number;
    preview: string | null;
    dataUrl: string | null;
  } | null;
  setLogo: (
    v: {
      name: string;
      type: string;
      size: number;
      preview: string | null;
      dataUrl: string | null;
    } | null,
  ) => void;
  logoError: string | null;
  setLogoError: (v: string | null) => void;
  logoRotate: number;
  setLogoRotate: (v: number) => void;
  logoScale: number;
  setLogoScale: (v: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-to-scroll for the pattern slider (desktop has no touch/scrollbar).
  const sliderRef = useRef<HTMLDivElement>(null);
  const drag = useRef({down: false, moved: false, startX: 0, scrollLeft: 0});
  const onSliderDown = (e: React.PointerEvent) => {
    const el = sliderRef.current;
    if (!el) return;
    drag.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
  };
  const onSliderMove = (e: React.PointerEvent) => {
    const el = sliderRef.current;
    const d = drag.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.scrollLeft - dx;
  };
  const endSliderDrag = () => {
    drag.current.down = false;
  };

  const onFile = (file?: File | null) => {
    setLogoError(null);
    if (!file) return;
    const okType =
      /^image\/(png|jpeg|svg\+xml)$/.test(file.type) ||
      file.type === 'application/pdf';
    if (!okType) {
      setLogoError('Please use a PNG, JPG, SVG or PDF file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setLogoError('That file is over 25MB — please upload a smaller one.');
      return;
    }
    // Read as a base64 data URL so the actual artwork carries in the cart line
    // (temporary — swap for a Files-API upload URL later). Images also preview.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl =
        typeof reader.result === 'string' ? reader.result : null;
      setLogo({
        name: file.name,
        type: file.type,
        size: file.size,
        preview: file.type.startsWith('image/') ? dataUrl : null,
        dataUrl,
      });
    };
    reader.onerror = () => setLogoError('Could not read that file — try again.');
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Field
        n={1}
        title="Upload your logo"
        hint="Optional — PNG, JPG, SVG or PDF. We check print quality and send a proof."
      >
        {!logo ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-white px-4 py-6 text-center transition-colors hover:border-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span className="text-sm font-semibold text-ink">
              Drag a file or{' '}
              <span className="text-brand-700 underline">browse</span>
            </span>
            <span className="text-xs text-muted">
              PNG · JPG · SVG · PDF, up to 25MB
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-mint">
              {logo.preview ? (
                <img
                  src={logo.preview}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[11px] font-bold text-muted">
                  {(logo.name.split('.').pop() || 'FILE').toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {logo.name}
              </p>
              <p className="text-xs text-muted">
                {Math.round(logo.size / 1024)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogo(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {logoError ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{logoError}</p>
        ) : null}

        {/* Rotate + size controls (only once a logo/design is present) */}
        {logo ? (
          <div className="mt-3 space-y-3 rounded-xl bg-mint/60 p-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
                <span>Rotate</span>
                <span className="text-muted">{logoRotate}°</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Rotate left"
                  onClick={() => setLogoRotate((logoRotate + 270) % 360)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-ink hover:border-ink"
                >
                  ⟲
                </button>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={logoRotate}
                  onChange={(e) => setLogoRotate(Number(e.target.value))}
                  aria-label="Logo rotation"
                  className="h-2 w-full accent-brand-600"
                />
                <button
                  type="button"
                  aria-label="Rotate right"
                  onClick={() => setLogoRotate((logoRotate + 90) % 360)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-ink hover:border-ink"
                >
                  ⟳
                </button>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
                <span>Size</span>
                <span className="text-muted">{logoScale}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={160}
                value={logoScale}
                onChange={(e) => setLogoScale(Number(e.target.value))}
                aria-label="Logo size"
                className="h-2 w-full accent-brand-600"
              />
            </div>
          </div>
        ) : null}
      </Field>

      <Field
        n={2}
        title="Logo layout"
        hint="Choose how your logo repeats across the bandana."
      >
        <div
          ref={sliderRef}
          onPointerDown={onSliderDown}
          onPointerMove={onSliderMove}
          onPointerUp={endSliderDrag}
          onPointerLeave={endSliderDrag}
          className="no-scrollbar flex max-w-sm cursor-grab select-none gap-2 overflow-x-auto pb-1 active:cursor-grabbing"
        >
          {PATTERNS.map((p) => {
            const active = pattern === p.value;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                aria-label={p.label}
                title={p.label}
                onClick={() => {
                  if (drag.current.moved) return; // ignore click after a drag
                  setPattern(p.value);
                }}
                className={`grid aspect-square w-20 shrink-0 snap-start place-items-center rounded-xl border transition ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-black/15 bg-white text-ink hover:border-ink'
                }`}
              >
                {p.full ? (
                  <span className="px-1 text-center text-[11px] font-semibold leading-tight">
                    {p.label}
                  </span>
                ) : (
                  <PatternThumb marks={p.marks} />
                )}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        n={3}
        title="Do you have a production design ready to go?"
        hint="This tells our team how much help you need — you can also share files after checkout."
      >
        <div className="grid gap-2">
          {INTENTS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={intent === o.value}
              onClick={() => setIntent(o.value)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                intent === o.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-black/15 bg-white text-ink hover:border-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="rounded-xl bg-mint p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink">
          What happens next
        </h3>
        <p className="mt-1 text-sm text-muted">
          Just place your order. We&apos;ll email you a link (and show it on your
          order confirmation) to upload your artwork, share your design ideas,
          and book a quick call with our creative team to start production.
        </p>
      </div>
    </div>
  );
}

function QuoteStep({
  shape,
  size,
  material,
  baseLabel,
  qty,
  list,
  unit,
  total,
  saved,
  nextT,
  currencyCode,
  variantId,
  lines,
  onAdded,
  preview,
  specs,
}: {
  shape: string;
  size: string;
  material: string;
  baseLabel: string;
  qty: number;
  list: number;
  unit: number;
  total: number;
  saved: number;
  nextT?: {min: number; each: number};
  currencyCode: string;
  variantId: string | null;
  lines: Array<{
    merchandiseId: string;
    quantity: number;
    selectedVariant?: unknown;
    attributes: Array<{key: string; value: string}>;
  }>;
  onAdded: () => void;
  preview: React.ReactNode;
  specs: Array<{label: string; value: string; color?: string}>;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
        Your quote
      </h3>

      <div className="mt-3 overflow-hidden rounded-2xl border border-black/10">
        {/* Preview banner */}
        <div className="flex items-center gap-4 border-b border-black/10 bg-mint/40 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10">
            {preview}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{shape} Bandana</p>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">
              {size} · {material} · {qty} pcs
            </p>
          </div>
        </div>

        {/* Everything attached to the order */}
        <dl className="divide-y divide-black/5 px-4">
          {specs.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              <dt className="shrink-0 text-muted">{s.label}</dt>
              <dd className="flex min-w-0 items-center justify-end gap-1.5 text-right font-medium text-ink">
                {s.color ? (
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{background: s.color}}
                  />
                ) : null}
                <span className="truncate">{s.value}</span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Pricing */}
        <dl className="space-y-2 border-t border-black/10 p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Unit price</dt>
            <dd className="font-semibold text-ink">
              {money(unit, currencyCode)}
            </dd>
          </div>
          {saved > 0 ? (
            <div className="flex items-center justify-between text-brand-700">
              <dt>You save vs {money(list, currencyCode)}/pc</dt>
              <dd className="font-semibold">{money(saved, currencyCode)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-black/10 pt-2 text-base">
            <dt className="font-bold text-ink">Total</dt>
            <dd className="font-extrabold text-ink">
              {money(total, currencyCode)}
            </dd>
          </div>
          {nextT ? (
            <p className="pt-1 text-xs text-muted">
              Order {nextT.min}+ to drop to {money(nextT.each, currencyCode)}/pc.
            </p>
          ) : null}
        </dl>
      </div>

      <div className="mt-5 [&_form]:max-w-full">
        {variantId ? (
          <AddToCartButton
            className="btn w-full min-h-11 bg-orange-500 text-white transition-colors hover:bg-orange-600"
            onClick={onAdded}
            lines={lines}
          >
            Add to Cart — {money(total, currencyCode)}
          </AddToCartButton>
        ) : (
          <div className="rounded-xl border border-dashed border-black/20 bg-mint p-4 text-center text-sm text-muted">
            The made-to-order custom product isn&apos;t set up in Shopify yet.
            Create a <code className="font-semibold">custom-bandana</code>{' '}
            product (inventory off) and publish it to the Headless channel to
            enable checkout.
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          After checkout, we&apos;ll send your design-intake link to start
          production with our creative team.
        </p>
      </div>
    </div>
  );
}

const CUSTOM_PRODUCT_QUERY = `#graphql
  query CustomBandana(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      variants(first: 100) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
          image {
            url
            altText
            width
            height
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
` as const;
