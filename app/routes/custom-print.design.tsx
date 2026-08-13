import {useEffect, useMemo, useRef, useState} from 'react';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/custom-print.design';
import {siteOrigin} from '~/lib/seo';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {useAside} from '~/components/Aside';
import {
  SHAPES,
  MATERIALS,
  SIZES,
  sizesFor,
  DEFAULT_SIZE,
  MIN_QTY,
  BASE_PRICE,
  TIERS,
  INTENTS,
  STEPS,
  PATTERNS,
  patternsFor,
  tierFor,
  unitPriceFor,
  nextTier,
  money,
  STORAGE_KEY,
  EMAIL_RE,
  type Tier,
  type LogoMark,
} from '~/lib/customPrintData';

/* -------------------------------------------------------------------------- */
/* SEO + loader                                                               */
/* -------------------------------------------------------------------------- */

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Design your custom bandana online — Custom Bandanas';
  const description =
    'Design custom-printed bandanas online in four steps: shape & size, quantity, design help, and an instant quote. Full-color digital printing, made to order, proofed before we print, with bulk & wholesale pricing.';
  const url = `${siteOrigin(matches)}/custom-print/design`;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: 'Custom Bandanas'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
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

/**
 * Rasterize the live preview SVG to a PNG data URL (the composite proof).
 * For the triangle the proof stays transparent outside the fold (clipped to
 * the right-triangle) so it reads as a triangle, not a white square; the
 * square keeps an opaque white backing.
 */
function svgToPng(
  svg: SVGSVGElement,
  size = 600,
  triangle = false,
): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  // The on-screen white overflow-mask must not bake into the PNG — the raster
  // clips to the triangle itself, so drop the mask to avoid a white seam.
  if (triangle) {
    clone
      .querySelectorAll('[data-tri-mask]')
      .forEach((el) => el.remove());
  }
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
      // Square: opaque white backing. Triangle: leave the canvas transparent.
      if (!triangle) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }
      ctx.drawImage(img, 0, 0, size, size);
      if (triangle) {
        // Keep only the right-triangle fold (top-left → bottom-left →
        // bottom-right); everything outside becomes transparent.
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(size, size);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
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
  const [baseHex, setBaseHex] = useState('#e23b3b');
  // Print option — the root choice that reshapes the wizard: a blank (solid
  // colour, no artwork) bandana skips the Design step; one/two-side print keeps
  // it. Two-side currently prints the same design on both faces.
  const [printSides, setPrintSides] = useState<'blank' | 'one' | 'two'>('one');
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
  // Column / row spacing of a repeating layout (100% = the preset positions).
  // Spreads the logos apart from their group centre; fly-off the edge is allowed.
  const [colSpace, setColSpace] = useState(100);
  const [rowSpace, setRowSpace] = useState(100);
  // Hosted CDN URLs (Shopify Files). Null until uploaded (or if no token yet).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [designOutput, setDesignOutput] = useState<string | null>(null);
  // Tracks the proof upload so checkout can't fire before it's attached.
  const [designStatus, setDesignStatus] = useState<
    'idle' | 'pending' | 'ready' | 'error'
  >('idle');

  // --- Two-sided printing ---
  // The front uses the design state above. When printing both sides, designMode
  // decides whether the back reuses the front ('same') or has its own artwork
  // ('different'); activeSide is which face the Design step + preview currently
  // show/edit. The back state mirrors the front's fields.
  const [designMode, setDesignMode] = useState<'same' | 'different'>('same');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [backLogo, setBackLogo] = useState<typeof logo>(null);
  const [backLogoError, setBackLogoError] = useState<string | null>(null);
  const [backPattern, setBackPattern] = useState<string>('single');
  const [backLogoRotate, setBackLogoRotate] = useState(0);
  const [backLogoScale, setBackLogoScale] = useState(100);
  const [backColSpace, setBackColSpace] = useState(100);
  const [backRowSpace, setBackRowSpace] = useState(100);
  const [backLogoUrl, setBackLogoUrl] = useState<string | null>(null);
  const [backDesignOutput, setBackDesignOutput] = useState<string | null>(null);

  // Print-option flags — declared here (before the effects that read them).
  const isBlank = printSides === 'blank';
  const isTwo = printSides === 'two';
  const isDiff = isTwo && designMode === 'different';
  // Bumped by the "Retry" button to re-run the proof generation after a failure.
  const [retryNonce, setRetryNonce] = useState(0);

  // Restore saved progress on mount ("your selections are saved as you go").
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<{
        step: number;
        shape: string;
        size: string;
        material: string;
        customSize: boolean;
        csW: string;
        csH: string;
        baseHex: string;
        printSides: 'blank' | 'one' | 'two';
        designMode: 'same' | 'different';
        backPattern: string;
        backLogoRotate: number;
        backLogoScale: number;
        backColSpace: number;
        backRowSpace: number;
        qty: number;
        email: string;
        deliveryAck: boolean;
        terms: boolean;
        intent: string;
        pattern: string;
        logoRotate: number;
        logoScale: number;
        colSpace: number;
        rowSpace: number;
      }>;
      if (typeof s.step === 'number') setStep(s.step);
      if (s.shape) setShape(s.shape);
      if (s.size) setSize(s.size);
      if (s.material) setMaterial(s.material);
      if (typeof s.customSize === 'boolean') setCustomSize(s.customSize);
      if (s.csW) setCsW(s.csW);
      if (s.csH) setCsH(s.csH);
      if (s.baseHex) setBaseHex(s.baseHex);
      if (s.printSides) setPrintSides(s.printSides);
      if (s.designMode) setDesignMode(s.designMode);
      if (s.backPattern) setBackPattern(s.backPattern);
      if (typeof s.backLogoRotate === 'number') setBackLogoRotate(s.backLogoRotate);
      if (typeof s.backLogoScale === 'number') setBackLogoScale(s.backLogoScale);
      if (typeof s.backColSpace === 'number') setBackColSpace(s.backColSpace);
      if (typeof s.backRowSpace === 'number') setBackRowSpace(s.backRowSpace);
      if (s.qty) setQty(s.qty);
      if (s.email) setEmail(s.email);
      if (s.deliveryAck) setDeliveryAck(true);
      if (s.terms) setTerms(true);
      if (s.intent) setIntent(s.intent);
      if (s.pattern) setPattern(s.pattern);
      if (typeof s.logoRotate === 'number') setLogoRotate(s.logoRotate);
      if (typeof s.logoScale === 'number') setLogoScale(s.logoScale);
      if (typeof s.colSpace === 'number') setColSpace(s.colSpace);
      if (typeof s.rowSpace === 'number') setRowSpace(s.rowSpace);
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
          baseHex,
          qty,
          email,
          deliveryAck,
          terms,
          intent,
          pattern,
          printSides,
          designMode,
          backPattern,
          backLogoRotate,
          backLogoScale,
          backColSpace,
          backRowSpace,
          logoRotate,
          logoScale,
          colSpace,
          rowSpace,
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
    baseHex,
    qty,
    email,
    deliveryAck,
    terms,
    intent,
    pattern,
    printSides,
    designMode,
    backPattern,
    backLogoRotate,
    backLogoScale,
    backColSpace,
    backRowSpace,
    logoRotate,
    logoScale,
    colSpace,
    rowSpace,
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

  // Same, for the back-side artwork (two-sided "different design").
  useEffect(() => {
    if (!backLogo?.dataUrl) {
      setBackLogoUrl(null);
      return;
    }
    let cancelled = false;
    uploadImage(backLogo.dataUrl, backLogo.name).then((u) => {
      if (!cancelled) setBackLogoUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [backLogo?.dataUrl, backLogo?.name]);

  // On the Quote step, rasterize the preview → composite PNG → host it as the
  // "Design output" (the whole rendered bandana). Uploaded ahead of add-to-cart.
  useEffect(() => {
    if (step !== 3) return;
    // A blank (solid-colour) bandana has no artwork to proof.
    if (isBlank) {
      setDesignStatus('ready');
      setDesignOutput(null);
      setBackDesignOutput(null);
      return;
    }
    let cancelled = false;
    setDesignStatus('pending');
    // Drop any previous proofs up front so a failed re-generation can never
    // re-attach a stale (out-of-date) design output to the order.
    setDesignOutput(null);
    setBackDesignOutput(null);

    // Rasterize a dedicated (hidden) proof preview → composite PNG → host it.
    const rasterizeAndUpload = async (label: string, filename: string) => {
      const svg = document.querySelector<SVGSVGElement>(
        `svg[aria-label$="${label}"]`,
      );
      if (!svg) return null;
      // Try twice — a transient upload hiccup shouldn't drop the proof.
      for (let attempt = 0; attempt < 2 && !cancelled; attempt++) {
        try {
          const png = await svgToPng(svg, 600, shape === 'Triangle');
          const url = await uploadImage(png, filename);
          if (url) return url;
        } catch {
          /* retry */
        }
      }
      return null;
    };

    (async () => {
      const frontUrl = await rasterizeAndUpload('front-proof', 'design-front.png');
      if (cancelled) return;
      if (frontUrl) setDesignOutput(frontUrl);
      let backOk = true;
      if (isDiff) {
        const backUrl = await rasterizeAndUpload('back-proof', 'design-back.png');
        if (cancelled) return;
        if (backUrl) setBackDesignOutput(backUrl);
        backOk = Boolean(backUrl);
      }
      if (cancelled) return;
      setDesignStatus(frontUrl && backOk ? 'ready' : 'error');
    })();
    return () => {
      cancelled = true;
    };
    // Re-render the proofs if the shape changes (square ↔ triangle affects the
    // transparent-clip), the shopper hits Retry, or the two-sided mode changes.
  }, [step, shape, retryNonce, isDiff, isBlank]);

  const sizeReady = customSize ? Boolean(csW && csH) : Boolean(size);
  const sizeDisplay = customSize
    ? `${csW || '?'} × ${csH || '?'} in`
    : size
      ? `${size} in`
      : '';

  // Match the chosen Size + Material to a real Shopify variant (custom → the
  // "Custom" size variant). Price + checkout come from that variant. Compare
  // sizes space-/case-insensitively so a Shopify typo like "22x30x22" vs the
  // wizard's "22 x 30 x 22" still matches (otherwise variantId is null →
  // checkout is silently blocked for that size).
  const sizeOption = customSize ? 'Custom' : size;
  const selectedVariant = useMemo(() => {
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    return (
      variants.find(
        (v) => norm(v.size) === norm(sizeOption) && v.material === material,
      ) ?? null
    );
  }, [variants, sizeOption, material]);
  const variantId = selectedVariant?.id ?? null;
  // "Buy more, save more" tiered pricing (mirrors the Shopify discount function).
  const unit = unitPriceFor(qty);
  const total = unit * qty;
  const list = BASE_PRICE;
  const saved = (BASE_PRICE - unit) * qty;
  const nt = nextTier(qty);
  const intentLabel = INTENTS.find((i) => i.value === intent)?.label ?? '';
  // Print option drives the flow: blank skips design; two prints both faces.
  const printLabel =
    printSides === 'blank'
      ? 'Blank — solid colour (no print)'
      : printSides === 'two'
        ? 'Printed both sides'
        : 'Printed one side';
  const previewBadge =
    printSides === 'blank'
      ? 'Solid colour · no print'
      : isDiff
        ? activeSide === 'back'
          ? 'Back side'
          : 'Front side'
        : printSides === 'two'
          ? 'Prints both sides'
          : null;
  // Layout is shape-aware: triangle uses its own set of balanced positions.
  const activePatterns = patternsFor(shape);
  const activePattern =
    activePatterns.find((p) => p.value === pattern) ?? activePatterns[0];
  const marks = activePattern.marks;
  const fullDesign = Boolean(activePattern.full);
  const seamless = Boolean(activePattern.seamless);
  const patternLabel = activePattern.label;

  // --- Two-sided accessors ---
  // Which face the Design step + main preview show/edit ('different' mode only).
  const showBack = isDiff && activeSide === 'back';
  const backActivePattern =
    activePatterns.find((p) => p.value === backPattern) ?? activePatterns[0];
  const backMarks = backActivePattern.marks;
  const backFull = Boolean(backActivePattern.full);
  const backSeamless = Boolean(backActivePattern.seamless);
  // Active-side accessors — the Design step edits, and the main preview shows,
  // whichever face is active. Front is the default for one-side / same-design.
  const dLogo = showBack ? backLogo : logo;
  const dSetLogo = showBack ? setBackLogo : setLogo;
  const dLogoError = showBack ? backLogoError : logoError;
  const dSetLogoError = showBack ? setBackLogoError : setLogoError;
  const dPattern = showBack ? backPattern : pattern;
  const dSetPattern = showBack ? setBackPattern : setPattern;
  const dRotate = showBack ? backLogoRotate : logoRotate;
  const dSetRotate = showBack ? setBackLogoRotate : setLogoRotate;
  const dScale = showBack ? backLogoScale : logoScale;
  const dSetScale = showBack ? setBackLogoScale : setLogoScale;
  const dCol = showBack ? backColSpace : colSpace;
  const dSetCol = showBack ? setBackColSpace : setColSpace;
  const dRow = showBack ? backRowSpace : rowSpace;
  const dSetRow = showBack ? setBackRowSpace : setRowSpace;
  const dMarks = showBack ? backMarks : marks;
  const dFull = showBack ? backFull : fullDesign;
  const dSeamless = showBack ? backSeamless : seamless;

  const baseColor = baseHex;
  const baseLabel = `${baseHex.toUpperCase()} base`;

  // Switching shape resets the layout AND the size to valid defaults for that
  // shape (square and triangle have different size lists).
  const selectShape = (v: string) => {
    setShape(v);
    setPattern(v === 'Triangle' ? 'tri-single' : 'single');
    setCustomSize(false);
    setSize(DEFAULT_SIZE[v] ?? SIZES[2].name);
  };

  const stepValid = [
    Boolean(shape && sizeReady && material), // Bandana
    isBlank || Boolean(intent), // Design (blank has nothing to design)
    qty >= MIN_QTY && EMAIL_RE.test(email) && deliveryAck && terms, // Quantity
    true, // Quote
  ];

  const attributes = [
    {key: 'Custom order', value: 'Bandana'},
    {key: 'Shape', value: shape},
    {key: 'Size', value: sizeDisplay},
    {key: 'Material', value: material},
    {key: 'Base colour', value: baseHex.toUpperCase()},
    {key: 'Print', value: printLabel},
    // A blank (solid-colour) bandana carries no artwork, so every design-related
    // attribute is omitted below.
    ...(isBlank ? [] : [{key: 'Logo layout', value: patternLabel}]),
    ...(!isBlank && logo ? [{key: 'Logo', value: logoUrl ?? logo.name}] : []),
    ...(!isBlank && logo
      ? [{key: 'Logo adjust', value: `${logoRotate}° · ${logoScale}%`}]
      : []),
    ...(!isBlank && logo && marks.length > 1
      ? [{key: 'Logo spacing', value: `col ${colSpace}% · row ${rowSpace}%`}]
      : []),
    ...(isBlank
      ? []
      : designOutput
        ? [{key: 'Design output', value: designOutput}]
        : designStatus === 'error'
          ? // Never silently drop the proof: if the upload failed and the shopper
            // proceeds anyway, flag it so production chases the artwork.
            [
              {
                key: 'Design output',
                value: '⚠ Upload failed — proof to follow by email',
              },
            ]
          : []),
    // Two-sided "different design" carries a second (back) artwork + proof.
    ...(isDiff && backLogo
      ? [{key: 'Back logo', value: backLogoUrl ?? backLogo.name}]
      : []),
    ...(isDiff
      ? backDesignOutput
        ? [{key: 'Design output (back)', value: backDesignOutput}]
        : designStatus === 'error'
          ? [
              {
                key: 'Design output (back)',
                value: '⚠ Upload failed — proof to follow by email',
              },
            ]
          : []
      : []),
    {key: 'Quantity', value: String(qty)},
    ...(isBlank ? [] : [{key: 'Design help', value: intentLabel}]),
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
              baseColor={baseColor}
              logoPreview={dLogo?.preview ?? null}
              marks={dMarks}
              fullDesign={dFull}
              seamless={dSeamless}
              logoRotate={dRotate}
              logoScale={dScale}
              colSpace={dCol}
              rowSpace={dRow}
              blank={isBlank}
              badge={previewBadge}
              flipSide={isDiff ? activeSide : null}
              onFlip={setActiveSide}
            />

            {/* Hidden per-side proof canvases — rasterized to PNG on the Quote
                step. Front always; back only for two-sided "different". Kept in
                the DOM (off-screen) so svgToPng can read them. */}
            {step === 3 && !isBlank ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -99999,
                  top: 0,
                  width: 400,
                  height: 400,
                  pointerEvents: 'none',
                }}
              >
                <BandanaPreview
                  shape={shape}
                  baseColor={baseColor}
                  logoPreview={logo?.preview ?? null}
                  marks={marks}
                  fullDesign={fullDesign}
                  seamless={seamless}
                  logoRotate={logoRotate}
                  logoScale={logoScale}
                  colSpace={colSpace}
                  rowSpace={rowSpace}
                  proofLabel="front-proof"
                />
                {isDiff ? (
                  <BandanaPreview
                    shape={shape}
                    baseColor={baseColor}
                    logoPreview={backLogo?.preview ?? null}
                    marks={backMarks}
                    fullDesign={backFull}
                    seamless={backSeamless}
                    logoRotate={backLogoRotate}
                    logoScale={backLogoScale}
                    colSpace={backColSpace}
                    rowSpace={backRowSpace}
                    proofLabel="back-proof"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right — configurator (PDP info column). min-w-0 lets this grid
              column shrink to its track so the full-width layout slider scrolls
              inside it instead of stretching the whole column. */}
          <div className="min-w-0 lg:py-2">
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
                  setShape={selectShape}
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
                  baseHex={baseHex}
                  setBaseHex={setBaseHex}
                  printSides={printSides}
                  setPrintSides={setPrintSides}
                />
              ) : null}

              {step === 1 ? (
                isBlank ? (
                  <BlankDesignNotice baseColor={baseColor} />
                ) : (
                <DesignStep
                  intent={intent}
                  setIntent={setIntent}
                  bothSides={printSides === 'two'}
                  designMode={designMode}
                  setDesignMode={setDesignMode}
                  activeSide={activeSide}
                  setActiveSide={setActiveSide}
                  frontReady={Boolean(logo)}
                  backReady={Boolean(backLogo)}
                  frontThumb={
                    <BandanaPreview
                      shape={shape}
                      baseColor={baseColor}
                      logoPreview={logo?.preview ?? null}
                      marks={marks}
                      fullDesign={fullDesign}
                      seamless={seamless}
                      logoRotate={logoRotate}
                      logoScale={logoScale}
                      colSpace={colSpace}
                      rowSpace={rowSpace}
                      compact
                    />
                  }
                  backThumb={
                    <BandanaPreview
                      shape={shape}
                      baseColor={baseColor}
                      logoPreview={backLogo?.preview ?? null}
                      marks={backMarks}
                      fullDesign={backFull}
                      seamless={backSeamless}
                      logoRotate={backLogoRotate}
                      logoScale={backLogoScale}
                      colSpace={backColSpace}
                      rowSpace={backRowSpace}
                      compact
                    />
                  }
                  pattern={dPattern}
                  setPattern={dSetPattern}
                  patterns={activePatterns}
                  isTriangle={shape === 'Triangle'}
                  logo={dLogo}
                  setLogo={dSetLogo}
                  logoError={dLogoError}
                  setLogoError={dSetLogoError}
                  logoRotate={dRotate}
                  setLogoRotate={dSetRotate}
                  logoScale={dScale}
                  setLogoScale={dSetScale}
                  colSpace={dCol}
                  setColSpace={dSetCol}
                  rowSpace={dRow}
                  setRowSpace={dSetRow}
                />
                )
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
                  designStatus={designStatus}
                  onAdded={() => open('cart')}
                  onRetry={() => setRetryNonce((n) => n + 1)}
                  twoUp={isDiff}
                  preview={
                    isDiff ? (
                      // Two-sided "different" — two framed thumbnails, labelled.
                      <div className="flex gap-2.5">
                        <div className="text-center">
                          <div className="h-[68px] w-[68px] overflow-hidden rounded-xl ring-1 ring-black/10">
                            <BandanaPreview
                              shape={shape}
                              baseColor={baseColor}
                              logoPreview={logo?.preview ?? null}
                              marks={marks}
                              fullDesign={fullDesign}
                              seamless={seamless}
                              logoRotate={logoRotate}
                              logoScale={logoScale}
                              colSpace={colSpace}
                              rowSpace={rowSpace}
                              compact
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Front
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="h-[68px] w-[68px] overflow-hidden rounded-xl ring-1 ring-black/10">
                            <BandanaPreview
                              shape={shape}
                              baseColor={baseColor}
                              logoPreview={backLogo?.preview ?? null}
                              marks={backMarks}
                              fullDesign={backFull}
                              seamless={backSeamless}
                              logoRotate={backLogoRotate}
                              logoScale={backLogoScale}
                              colSpace={backColSpace}
                              rowSpace={backRowSpace}
                              compact
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Back
                          </p>
                        </div>
                      </div>
                    ) : (
                      <BandanaPreview
                        shape={shape}
                        baseColor={baseColor}
                        logoPreview={logo?.preview ?? null}
                        marks={marks}
                        fullDesign={fullDesign}
                        seamless={seamless}
                        logoRotate={logoRotate}
                        logoScale={logoScale}
                        colSpace={colSpace}
                        rowSpace={rowSpace}
                        blank={isBlank}
                        badge={previewBadge}
                        compact
                      />
                    )
                  }
                  specs={[
                    {
                      label: 'Base colour',
                      value: baseHex.toUpperCase(),
                      color: baseColor,
                    },
                    {label: 'Print', value: printLabel},
                    ...(isBlank
                      ? []
                      : isDiff
                        ? [
                            {label: 'Front design', value: logo ? logo.name : 'None'},
                            {label: 'Front layout', value: patternLabel},
                            {
                              label: 'Back design',
                              value: backLogo ? backLogo.name : 'None',
                            },
                            {label: 'Back layout', value: backActivePattern.label},
                            {label: 'Design help', value: intentLabel},
                          ]
                        : [
                            {label: 'Logo / design layout', value: patternLabel},
                            ...(logo
                              ? [
                                  {label: 'Logo / design', value: logo.name},
                                  {
                                    label: 'Rotate / size',
                                    value: `${logoRotate}° · ${logoScale}%`,
                                  },
                                ]
                              : [{label: 'Logo / design', value: 'None'}]),
                            {label: 'Design help', value: intentLabel},
                          ]),
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
                className="btn btn-outline min-h-11 px-6 disabled:opacity-0"
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
 * Renders a representative bandana mockup that reacts to the chosen shape, base
 * colour, and logo layout; the real artwork is collected after checkout, so
 * without an uploaded logo the centre shows an "artwork" placeholder.
 */
function BandanaPreview({
  shape,
  baseColor,
  logoPreview,
  marks,
  fullDesign,
  seamless = false,
  logoRotate,
  logoScale,
  colSpace = 100,
  rowSpace = 100,
  compact,
  blank = false,
  badge = null,
  proofLabel = null,
  flipSide = null,
  onFlip,
}: {
  shape: string;
  baseColor: string;
  logoPreview: string | null;
  marks: LogoMark[];
  fullDesign: boolean;
  seamless?: boolean;
  logoRotate: number;
  logoScale: number;
  colSpace?: number;
  rowSpace?: number;
  compact?: boolean;
  blank?: boolean;
  badge?: string | null;
  proofLabel?: string | null;
  flipSide?: 'front' | 'back' | null;
  onFlip?: (side: 'front' | 'back') => void;
}) {
  const isTriangle = shape === 'Triangle';
  // Column / row spacing spreads the repeating logos apart FROM THEIR OWN group
  // centre (so the arrangement stays put and just expands), not the canvas
  // centre. Single-logo layouts have their centre on the logo, so it's a no-op.
  const gcx = marks.length
    ? marks.reduce((a, m) => a + m.x, 0) / marks.length
    : 0;
  const gcy = marks.length
    ? marks.reduce((a, m) => a + m.y, 0) / marks.length
    : 0;
  const spacedMarks = marks.map((m) => ({
    ...m,
    x: gcx + (m.x - gcx) * (colSpace / 100),
    y: gcy + (m.y - gcy) * (rowSpace / 100),
  }));
  // Right-triangle fold (right angle bottom-left, hypotenuse top-left→bottom-
  // right) — the real shape of a corner-folded bandana. Fills the canvas; the
  // top-right (outside) is masked so artwork never spills past the fold.
  const triPath = 'M-200 -200 L-200 200 L200 200 Z';
  // Masks everything outside the triangle (the top-right half) with the tile
  // colour — rasterization-safe (a plain polygon, unlike an SVG clip-path).
  const triMask = 'M-200 -200 L200 -200 L200 200 Z';
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
      <div
        className={`relative aspect-square w-full overflow-hidden ${
          isTriangle ? 'bg-transparent' : 'bg-mint'
        }`}
      >
        {!compact ? (
          // Adaptive contrast like the artwork placeholder — blends into the
          // base colour (light on dark bases, subtle dark on light bases)
          // instead of a fixed brand-blue label.
          <span
            className="eyebrow absolute left-5 top-5 z-10"
            style={{color: phText}}
          >
            Preview
          </span>
        ) : null}

        {badge && !compact ? (
          <span className="absolute bottom-4 left-5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : null}

        {flipSide && !compact ? (
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-white/90 p-0.5 shadow">
            {(['front', 'back'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={flipSide === s}
                onClick={() => onFlip?.(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
                  flipSide === s ? 'bg-ink text-white' : 'text-ink/70'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${shape || 'Bandana'} ${proofLabel ?? 'preview'}`}
        >
          <g transform="translate(200 200)">
            {/* Clean bandana filling the canvas (square) or folded triangle. */}
            {isTriangle ? (
              <path d={triPath} fill={baseColor} />
            ) : (
              <rect
                x="-200"
                y="-200"
                width="400"
                height="400"
                fill={baseColor}
              />
            )}

            {/* Blank = solid colour only: no artwork, no placeholder. */}
            {!blank &&
              (seamless ? (
                /* Seamless — the design tiled edge-to-edge as a 3×3 grid, no
                   gaps (slice-fills each cell). Triangle is clipped by triMask. */
                logoPreview ? (
                  <>
                    {[0, 1, 2].flatMap((j) =>
                      [0, 1, 2].map((i) => (
                        <image
                          key={`s-${i}-${j}`}
                          href={logoPreview}
                          x={-200 + (i * 400) / 3}
                          y={-200 + (j * 400) / 3}
                          width={400 / 3 + 0.5}
                          height={400 / 3 + 0.5}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      )),
                    )}
                  </>
                ) : (
                  <>
                    {[-200 / 3, 200 / 3].map((c) => (
                      <line
                        key={`sv-${c}`}
                        x1={c}
                        y1={-200}
                        x2={c}
                        y2={200}
                        stroke={phStroke}
                        strokeWidth="2"
                        strokeDasharray="9 9"
                      />
                    ))}
                    {[-200 / 3, 200 / 3].map((c) => (
                      <line
                        key={`sh-${c}`}
                        x1={-200}
                        y1={c}
                        x2={200}
                        y2={c}
                        stroke={phStroke}
                        strokeWidth="2"
                        strokeDasharray="9 9"
                      />
                    ))}
                    <text
                      x="0"
                      y="6"
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="700"
                      fill={phText}
                      letterSpacing="1.5"
                    >
                      SEAMLESS
                    </text>
                  </>
                )
              ) : fullDesign ? (
              /* Full print — your edge-to-edge design, clipped to the shape */
              logoPreview ? (
                /* Full print — centre the design on the triangle's centroid
                   (−67, 67) so it sits in the middle of the fold, not on the
                   hypotenuse; the square keeps canvas-centre. */
                <g
                  transform={`${isTriangle ? 'translate(-67 67) ' : ''}${art}`}
                >
                  <image
                    href={logoPreview}
                    x="-200"
                    y="-200"
                    width="400"
                    height="400"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              ) : isTriangle ? (
                <>
                  {/* Placeholder outline sits inside the right triangle. */}
                  <path
                    d="M-170 -125 L-170 170 L125 170 Z"
                    fill="none"
                    stroke={phStroke}
                    strokeWidth="2"
                    strokeDasharray="9 9"
                  />
                  <text
                    x="-58"
                    y="82"
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="700"
                    fill={phText}
                    letterSpacing="1.5"
                  >
                    YOUR DESIGN
                  </text>
                </>
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
              /* Logo layout — uploaded artwork or a placeholder (spaced) */
              spacedMarks.map((m, i) => (
                <g
                  key={i}
                  transform={`translate(${m.x * 2.4} ${m.y * 2.4}) rotate(${m.rot})`}
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
              ))}

            {/* Mask the top-right (outside the fold) with the page colour so the
                triangle stands alone (no grey square) and artwork never spills.
                Tagged so svgToPng can drop it — the PNG clips to the triangle
                and stays transparent outside instead of baking a white square. */}
            {isTriangle ? (
              <path d={triMask} fill="#ffffff" data-tri-mask="1" />
            ) : null}
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
  // Flip the bar from brand-blue to green once the track is full — a
  // completion/"almost done" cue that nudges the shopper to finish.
  const complete = pct >= 100;
  // Whole progress is green (fill + completed circles) — inline so nothing (stale
  // dev CSS or Tailwind) can override it. The % label deepens to green-600 at 100%.
  const barColor = '#22c55e';
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
        <span
          className={complete ? '' : 'text-muted'}
          style={complete ? {color: '#16a34a'} : undefined}
        >
          {pct}%
        </span>
      </div>

      {/* Continuous filled track with step circles on top */}
      <div className="relative flex items-center justify-between">
        <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-mint" />
        <span
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full transition-[width] duration-300"
          style={{width: `${pct}%`, backgroundColor: barColor}}
        />
        {STEPS.map((label, i) => {
          const passed = i <= reached;
          return (
            <span
              key={label}
              className={`relative z-10 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ring-2 ring-paper ${
                passed ? 'text-white' : 'bg-mint text-muted'
              }`}
              style={passed ? {backgroundColor: barColor} : undefined}
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
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-black/10 bg-black/[0.04] text-muted'
          : selected
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
  baseHex,
  setBaseHex,
  printSides,
  setPrintSides,
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
  baseHex: string;
  setBaseHex: (v: string) => void;
  printSides: 'blank' | 'one' | 'two';
  setPrintSides: (v: 'blank' | 'one' | 'two') => void;
}) {
  const PRINT_OPTIONS: Array<{
    value: 'blank' | 'one' | 'two';
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'one',
      label: 'Print 1 side',
      // Framed artwork = printed image on one face.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <circle cx="9.5" cy="9.5" r="1.4" />
          <path d="M5 16l4-4 3 3 3-4 4 5" />
        </svg>
      ),
    },
    {
      value: 'two',
      label: 'Print 2 sides',
      // Two stacked panels = front + back.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="8" y="4" width="12" height="12" rx="2.5" />
          <path d="M16 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
        </svg>
      ),
    },
    {
      value: 'blank',
      label: 'No print',
      // Empty panel, crossed = plain fabric, no artwork.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M6 18L18 6" />
        </svg>
      ),
    },
  ];
  return (
    <div>
      <Field
        n={1}
        title="Print option"
        hint="Print your artwork on one or both sides, or keep it plain (no print)."
      >
        <div className="grid grid-cols-3 gap-2">
          {PRINT_OPTIONS.map((o) => {
            const on = printSides === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setPrintSides(o.value)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-semibold leading-tight transition [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 ${
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-black/15 bg-white text-ink hover:border-ink'
                }`}
              >
                {o.icon}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        n={2}
        title="Base colour"
        hint="Pick any colour from the spectrum."
      >
        <ColorSpectrum value={baseHex} onChange={setBaseHex} />
      </Field>

      <Field n={3} title="Bandana shape" hint="Choose the cut of your bandana.">

        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map((s) => (
            <OptionCard
              key={s.name}
              selected={shape === s.name}
              disabled={s.soon}
              onClick={() => {
                if (!s.soon) setShape(s.name);
              }}
            >
              {s.soon ? `${s.name} · Coming soon` : s.name}
            </OptionCard>
          ))}
        </div>
      </Field>

      <Field n={4} title="Bandana size" hint="Pick a finished size.">
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
            ...sizesFor(shape).map((s) => ({value: s.name, label: `${s.name} in`})),
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

      <Field n={5} title="Material" hint="Choose the fabric we print on.">
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

      <div className="rounded-2xl border border-black/10 bg-mint/60 p-5">
        {/* Info — the context */}
        <h3 className="eyebrow text-brand-700">Delivery time</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Standard production &amp; delivery is roughly 20–30 business days after
          your design is approved. Rush options may be available — ask our team.
        </p>

        {/* Separate the context from the actions */}
        <div className="my-4 border-t border-black/10" />

        {/* Acknowledgments — the actions, grouped and evenly spaced */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
            <input
              type="checkbox"
              checked={deliveryAck}
              onChange={(e) => setDeliveryAck(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-600"
            />
            <span>I understand and acknowledge the estimated delivery time.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-600"
            />
            <span>
              I agree to the Terms &amp; Conditions and understand custom orders
              are non-refundable once production begins.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Labelled range control with − / + nudge buttons flanking the slider — matches
 * the Rotate control's [button][slider][button] shape so Size, Column space, and
 * Row space read as one balanced set of editor controls.
 */
function NudgeRow({
  label,
  value,
  min,
  max,
  step = 10,
  suffix = '%',
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const btn =
    'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-ink hover:border-ink';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
        <span>{label}</span>
        <span className="text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className={btn}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className="h-2 w-full accent-brand-600"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className={btn}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Mini thumbnail illustrating a logo layout (dots). */
function PatternThumb({
  marks,
  triangle = false,
  active = false,
  seamless = false,
}: {
  marks: LogoMark[];
  triangle?: boolean;
  active?: boolean;
  seamless?: boolean;
}) {
  const s = triangle ? 1.05 : 1.45;
  // Triangle dots render on an ~80px SVG vs the square's 44px, so shrink them to
  // read at the same on-screen size (12/180×80 ≈ 22/180×44 ≈ 5.4px).
  const dot = triangle ? 12 : 22;
  const r = dot / 2;
  const rx = triangle ? 2 : 4;
  // Triangle chips ARE a solid triangle (no square frame): the triangle carries
  // the selected state (dark when active, muted grey otherwise), and the logo
  // dots punch through as white (the card behind the chip).
  const triFill = active ? '#0b1622' : '#cbd5e1';
  const dotFill = triangle ? '#ffffff' : 'currentColor';

  // Seamless = a filled 3×3 grid of tiles (touching, thin gaps read as a grid),
  // NOT scattered dots. Triangle keeps only the lower-left cells (the fold).
  if (seamless) {
    const centers = [-60, 0, 60];
    const cell = 54;
    const cells: Array<{cx: number; cy: number}> = [];
    for (const cy of centers)
      for (const cx of centers) {
        if (triangle && cy < cx) continue; // keep the fold (lower-left)
        cells.push({cx, cy});
      }
    return (
      <svg
        viewBox="-90 -90 180 180"
        className={triangle ? 'h-full w-full' : 'h-11 w-11'}
        aria-hidden="true"
      >
        {triangle ? (
          <path d="M-87.5 -87.5 L-87.5 87.5 L87.5 87.5 Z" fill={triFill} />
        ) : null}
        {cells.map(({cx, cy}, i) => (
          <rect
            key={i}
            x={cx - cell / 2}
            y={cy - cell / 2}
            width={cell}
            height={cell}
            rx={rx}
            fill={dotFill}
            opacity={triangle ? 1 : 0.85}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="-90 -90 180 180"
      className={triangle ? 'h-full w-full' : 'h-11 w-11'}
      aria-hidden="true"
    >
      {triangle ? (
        <path d="M-87.5 -87.5 L-87.5 87.5 L87.5 87.5 Z" fill={triFill} />
      ) : null}
      {marks.map((m, i) => (
        <rect
          key={i}
          x={-r}
          y={-r}
          width={dot}
          height={dot}
          rx={rx}
          transform={`translate(${m.x * s} ${m.y * s}) rotate(${m.rot})`}
          fill={dotFill}
          opacity={triangle ? 1 : 0.85}
        />
      ))}
    </svg>
  );
}

/**
 * Shown in place of the Design step for a blank (solid-colour) bandana — there's
 * no artwork to configure, so we confirm the colour and let the shopper move
 * straight on to quantity.
 */
function BlankDesignNotice({baseColor}: {baseColor: string}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-mint px-5 py-8 text-center">
      {/* Fabric-style colour swatch (a landscape chip, not a centered circle —
          a circle on a light card reads as a flag). */}
      <div className="mx-auto mb-4 inline-flex flex-col items-center">
        <span
          className="block h-16 w-24 rounded-xl shadow-sm ring-1 ring-inset ring-black/10"
          style={{backgroundColor: baseColor}}
          aria-hidden="true"
        />
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {baseColor.toUpperCase()}
        </span>
      </div>
      <p className="text-base font-bold text-ink">Solid colour — no printing</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        A plain, solid-colour bandana with no artwork to set up. Continue to
        choose your quantity.
      </p>
    </div>
  );
}

type LogoFile = {
  name: string;
  type: string;
  size: number;
  preview: string | null;
  dataUrl: string | null;
};

function DesignStep({
  intent,
  setIntent,
  pattern,
  setPattern,
  patterns,
  isTriangle,
  logo,
  setLogo,
  logoError,
  setLogoError,
  logoRotate,
  setLogoRotate,
  logoScale,
  setLogoScale,
  colSpace,
  setColSpace,
  rowSpace,
  setRowSpace,
  bothSides,
  designMode,
  setDesignMode,
  activeSide,
  setActiveSide,
  frontReady,
  backReady,
  frontThumb,
  backThumb,
}: {
  intent: string;
  setIntent: (v: string) => void;
  bothSides: boolean;
  designMode: 'same' | 'different';
  setDesignMode: (v: 'same' | 'different') => void;
  activeSide: 'front' | 'back';
  setActiveSide: (v: 'front' | 'back') => void;
  frontReady: boolean;
  backReady: boolean;
  frontThumb: React.ReactNode;
  backThumb: React.ReactNode;
  pattern: string;
  setPattern: (v: string) => void;
  patterns: typeof PATTERNS;
  isTriangle: boolean;
  logo: LogoFile | null;
  setLogo: (v: LogoFile | null) => void;
  logoError: string | null;
  setLogoError: (v: string | null) => void;
  logoRotate: number;
  setLogoRotate: (v: number) => void;
  logoScale: number;
  setLogoScale: (v: number) => void;
  colSpace: number;
  setColSpace: (v: number) => void;
  rowSpace: number;
  setRowSpace: (v: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activePat = patterns.find((p) => p.value === pattern);
  const activeMarks = activePat?.marks ?? [];
  const isRepeating = activeMarks.length > 1;
  // Seamless fills each tile edge-to-edge, so rotate/size/spacing don't apply.
  const isSeamless = Boolean(activePat?.seamless);

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

  const diff = bothSides && designMode === 'different';

  return (
    <div>
      {bothSides ? (
        <Field
          n={1}
          title="Front and back"
          hint="One design on both sides, or a different back."
        >
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          {/* Radio group (same vs different) + side tabs, grouped in one panel. */}
          <div role="radiogroup" aria-label="Back design" className="p-2">
            {[
              {v: 'same' as const, title: 'Same design on both sides'},
              {v: 'different' as const, title: 'Different design on the back'},
            ].map((o) => {
              const sel = designMode === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => {
                    setDesignMode(o.v);
                    if (o.v === 'same') setActiveSide('front');
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    sel ? '' : 'hover:bg-black/[0.03]'
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                      sel ? 'border-brand-600' : 'border-black/25'
                    }`}
                  >
                    {sel ? (
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                    ) : null}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      sel ? 'text-brand-700' : 'text-muted'
                    }`}
                  >
                    {o.title}
                  </span>
                </button>
              );
            })}
          </div>

          {diff ? (
            <div className="flex gap-1 border-t border-black/10 p-2">
              {(['front', 'back'] as const).map((s) => {
                const on = activeSide === s;
                const ready = s === 'front' ? frontReady : backReady;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActiveSide(s)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm capitalize transition ${
                      on
                        ? 'bg-black/[0.05] font-bold text-ink'
                        : 'font-semibold text-muted hover:bg-black/[0.02] hover:text-ink'
                    }`}
                  >
                    <span
                      className={`block h-8 w-8 shrink-0 rounded-md bg-white p-0.5 transition ${
                        on
                          ? 'ring-2 ring-brand-600'
                          : ready
                            ? 'ring-1 ring-black/10'
                            : 'ring-1 ring-orange-400'
                      }`}
                    >
                      <span className="block h-full w-full overflow-hidden rounded-sm">
                        {s === 'front' ? frontThumb : backThumb}
                      </span>
                    </span>
                    {s}
                  </button>
                );
              })}
            </div>
          ) : null}
          </div>
        </Field>
      ) : null}
      <Field
        n={bothSides ? 2 : 1}
        title="Logo / design layout"
        hint="Choose how your logo or design repeats across the bandana."
      >
        <div
          ref={sliderRef}
          onPointerDown={onSliderDown}
          onPointerMove={onSliderMove}
          onPointerUp={endSliderDrag}
          onPointerLeave={endSliderDrag}
          className="no-scrollbar flex w-full cursor-grab select-none gap-2 overflow-x-auto pb-1 active:cursor-grabbing"
        >
          {patterns.map((p) => {
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
                className={
                  isTriangle
                    ? 'grid aspect-square w-20 shrink-0 snap-start place-items-center bg-transparent transition hover:opacity-80'
                    : `grid aspect-square w-20 shrink-0 snap-start place-items-center rounded-xl border transition ${
                        active
                          ? 'border-ink bg-ink text-white'
                          : 'border-black/15 bg-white text-ink hover:border-ink'
                      }`
                }
              >
                {p.full ? (
                  isTriangle ? (
                    /* Full print = a solid triangle with no logo dots. */
                    <PatternThumb marks={[]} triangle active={active} />
                  ) : (
                    <span className="px-1 text-center text-[11px] font-semibold leading-tight">
                      {p.label}
                    </span>
                  )
                ) : p.seamless ? (
                  <PatternThumb
                    marks={[]}
                    seamless
                    triangle={isTriangle}
                    active={active}
                  />
                ) : (
                  <PatternThumb
                    marks={p.marks}
                    triangle={isTriangle}
                    active={active}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        n={bothSides ? 3 : 2}
        title={
          diff
            ? activeSide === 'back'
              ? 'Upload back artwork'
              : 'Upload front artwork'
            : 'Upload your logo / design'
        }
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

        {/* Rotate + size controls — hidden for seamless (fixed tile fill). */}
        {logo && !isSeamless ? (
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
            <NudgeRow
              label="Size"
              value={logoScale}
              min={40}
              max={300}
              onChange={setLogoScale}
              ariaLabel="Logo size"
            />
            {isRepeating ? (
              <>
                <NudgeRow
                  label="Column space"
                  value={colSpace}
                  min={20}
                  max={300}
                  onChange={setColSpace}
                  ariaLabel="Column spacing"
                />
                <NudgeRow
                  label="Row space"
                  value={rowSpace}
                  min={20}
                  max={300}
                  onChange={setRowSpace}
                  ariaLabel="Row spacing"
                />
              </>
            ) : null}
          </div>
        ) : null}
      </Field>

      <Field
        n={bothSides ? 4 : 3}
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
  designStatus,
  onAdded,
  onRetry,
  preview,
  twoUp = false,
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
  designStatus: 'idle' | 'pending' | 'ready' | 'error';
  onAdded: () => void;
  onRetry: () => void;
  preview: React.ReactNode;
  twoUp?: boolean;
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
          {twoUp ? (
            <div className="shrink-0">{preview}</div>
          ) : (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10">
              {preview}
            </div>
          )}
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
          designStatus === 'pending' || designStatus === 'idle' ? (
            /* Hold checkout until the design proof is uploaded, so the order
               always carries the customer's rendered design. */
            <button
              type="button"
              disabled
              className="btn w-full min-h-11 cursor-wait bg-orange-500/60 text-white"
            >
              Preparing your design…
            </button>
          ) : designStatus === 'error' ? (
            /* Proof upload failed — never proceed silently. Retry is the primary
               action; adding to cart anyway attaches a "proof pending" flag (see
               the Design output attribute) so production chases the artwork. */
            <div className="space-y-2">
              <button
                type="button"
                onClick={onRetry}
                className="btn w-full min-h-11 bg-orange-500 text-white transition-colors hover:bg-orange-600"
              >
                Couldn&apos;t prepare your design — Retry
              </button>
              <AddToCartButton
                className="btn btn-outline w-full min-h-11"
                onClick={onAdded}
                lines={lines}
              >
                Add to cart anyway — {money(total, currencyCode)}
              </AddToCartButton>
              <p className="text-center text-xs text-muted">
                We couldn&apos;t save your proof just now. Retry, or add to cart
                and we&apos;ll email your proof before printing.
              </p>
            </div>
          ) : (
            <AddToCartButton
              className="btn w-full min-h-11 bg-orange-500 text-white transition-colors hover:bg-orange-600"
              onClick={onAdded}
              lines={lines}
            >
              Add to Cart — {money(total, currencyCode)}
            </AddToCartButton>
          )
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
