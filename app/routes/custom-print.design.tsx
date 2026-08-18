import {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/custom-print.design';
import {siteOrigin} from '~/lib/seo';
import {useAside} from '~/components/Aside';
import {
  SIZES,
  DEFAULT_SIZE,
  MIN_QTY,
  LIST_PRICE,
  INTENTS,
  STEPS,
  patternsFor,
  unitPriceFor,
  nextTier,
  money,
  STORAGE_KEY,
  EMAIL_RE,
} from '~/lib/customPrintData';
import {svgToPng, uploadImage} from '~/lib/customPrintProof';
import {
  ProgressBar,
  BlankDesignNotice,
} from '~/components/custom-print/primitives';
import {BandanaPreview} from '~/components/custom-print/BandanaPreview';
import {BandanaStep} from '~/components/custom-print/BandanaStep';
import {DesignStep} from '~/components/custom-print/DesignStep';
import {QuantityStep} from '~/components/custom-print/QuantityStep';
import {QuoteStep} from '~/components/custom-print/QuoteStep';
import {CustomPrintInfo} from '~/components/custom-print/CustomPrintInfo';

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
  // Reviews load lazily (client-side, via the /api/reviews resource route) so the
  // two Judge.me API calls never block the wizard render — see CustomPrintInfo.
  return {variants, currencyCode, productTitle, productHandle};
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
  const [designNote, setDesignNote] = useState('');
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
  // Gate localStorage writes until saved state is read, so the first render's
  // defaults can't clobber a saved session (also fixes React 18 StrictMode's
  // double-invoke, where persist would otherwise overwrite before restore reruns).
  const [hydrated, setHydrated] = useState(false);
  // True when a reload landed the shopper past the (non-persisted) artwork step
  // and we sent them back to re-upload — tailors the artwork-gate hint copy.
  const [reuploadNotice, setReuploadNotice] = useState(false);

  // Restore saved progress on mount ("your selections are saved as you go").
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
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
        designNote: string;
        pattern: string;
        logoRotate: number;
        logoScale: number;
        colSpace: number;
        rowSpace: number;
      }>;
      if (typeof s.step === 'number') {
        // Artwork (logo/backLogo) isn't persisted, so it's gone after a reload.
        // If the saved step is PAST the Design/upload step while artwork is
        // required (printing, and not the "design-for-me" path), send the shopper
        // back to re-upload — otherwise they'd land on Quote with no design, where
        // checkout is enabled and a placeholder proof would upload. Everything else
        // (size, colour, qty, note…) is still restored.
        const artRequired = s.printSides !== 'blank' && s.intent !== 'help';
        if (artRequired && s.step > 1) {
          setStep(1);
          setReuploadNotice(true);
        } else {
          setStep(s.step);
        }
      }
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
      if (typeof s.designNote === 'string') setDesignNote(s.designNote);
      if (s.pattern) setPattern(s.pattern);
      if (typeof s.logoRotate === 'number') setLogoRotate(s.logoRotate);
      if (typeof s.logoScale === 'number') setLogoScale(s.logoScale);
      if (typeof s.colSpace === 'number') setColSpace(s.colSpace);
      if (typeof s.rowSpace === 'number') setRowSpace(s.rowSpace);
      }
    } catch {
      /* ignore corrupt state */
    }
    setHydrated(true);
  }, []);

  // Persist progress (only after hydration, so defaults never clobber a save).
  useEffect(() => {
    if (!hydrated) return;
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
          designNote,
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
    hydrated,
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
    designNote,
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

  // Artwork upload is DEFERRED to the Quote step (see the proof effect below), so
  // tests / tweaks / abandoned designs on the Design step never touch the CDN —
  // only a shopper who reaches Quote uploads. Here we just keep the hosted URL in
  // sync with the LOCAL file: whenever the artwork changes or is removed, drop any
  // previously-hosted URL — the Quote step re-hosts the current file (deduped by
  // proofSignature so back-and-forth navigation never re-uploads).
  useEffect(() => {
    setLogoUrl(null);
  }, [logo?.dataUrl, logo?.name]);
  useEffect(() => {
    setBackLogoUrl(null);
  }, [backLogo?.dataUrl, backLogo?.name]);

  // A signature of everything that changes the rendered proof. When it's
  // unchanged on re-entering the Quote step (back-and-forth navigation) we reuse
  // the already-hosted proof instead of rasterizing + re-uploading it.
  const proofSignature = useMemo(() => {
    const id = (f: typeof logo) => (f ? `${f.name}:${f.size}` : 'none');
    return JSON.stringify({
      shape,
      baseHex,
      isBlank,
      isDiff,
      logo: id(logo),
      pattern,
      logoRotate,
      logoScale,
      colSpace,
      rowSpace,
      ...(isDiff
        ? {
            backLogo: id(backLogo),
            backPattern,
            backLogoRotate,
            backLogoScale,
            backColSpace,
            backRowSpace,
          }
        : {}),
    });
  }, [
    shape,
    baseHex,
    isBlank,
    isDiff,
    logo,
    pattern,
    logoRotate,
    logoScale,
    colSpace,
    rowSpace,
    backLogo,
    backPattern,
    backLogoRotate,
    backLogoScale,
    backColSpace,
    backRowSpace,
  ]);
  // The last successfully-hosted proof (its signature + CDN URLs). An unchanged
  // design is served from here — never re-uploaded.
  const lastProof = useRef<{
    sig: string;
    front: string | null;
    back: string | null;
    art: string | null;
    backArt: string | null;
  } | null>(null);

  // On the Quote step, rasterize the preview → composite PNG → host it as the
  // "Design output" (the whole rendered bandana). Uploaded ahead of add-to-cart.
  useEffect(() => {
    if (step !== 3) return;
    // A blank (solid-colour) bandana has no artwork to proof.
    if (isBlank) {
      setDesignStatus('ready');
      setDesignOutput(null);
      setBackDesignOutput(null);
      setLogoUrl(null);
      setBackLogoUrl(null);
      return;
    }
    // Design unchanged since the last successful proof → reuse the hosted URLs
    // (no rasterize, no re-upload) so back-and-forth navigation is instant.
    if (lastProof.current && lastProof.current.sig === proofSignature) {
      setDesignOutput(lastProof.current.front);
      setBackDesignOutput(lastProof.current.back);
      setLogoUrl(lastProof.current.art);
      setBackLogoUrl(lastProof.current.backArt);
      setDesignStatus('ready');
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

    // Host the customer's ORIGINAL artwork — deferred from pick-time to now, with
    // the same twice-try retry policy as the proof.
    const uploadArtwork = async (dataUrl: string, name: string) => {
      for (let attempt = 0; attempt < 2 && !cancelled; attempt++) {
        const url = await uploadImage(dataUrl, name);
        if (url) return url;
      }
      return null;
    };

    (async () => {
      // Front + back proofs AND the original artwork upload concurrently.
      const [frontUrl, backUrl, artUrl, backArtUrl] = await Promise.all([
        rasterizeAndUpload('front-proof', 'design-front.png'),
        isDiff
          ? rasterizeAndUpload('back-proof', 'design-back.png')
          : Promise.resolve<string | null>(null),
        logo?.dataUrl
          ? uploadArtwork(logo.dataUrl, logo.name)
          : Promise.resolve<string | null>(null),
        isDiff && backLogo?.dataUrl
          ? uploadArtwork(backLogo.dataUrl, backLogo.name)
          : Promise.resolve<string | null>(null),
      ]);
      if (cancelled) return;
      if (frontUrl) setDesignOutput(frontUrl);
      if (isDiff && backUrl) setBackDesignOutput(backUrl);
      setLogoUrl(artUrl);
      setBackLogoUrl(backArtUrl);
      const backOk = isDiff ? Boolean(backUrl) : true;
      // If a logo exists, its hosted URL must succeed — otherwise the order would
      // carry only a filename. Gate readiness on it (also closes the old race).
      const artOk = logo ? Boolean(artUrl) : true;
      const backArtOk = isDiff && backLogo ? Boolean(backArtUrl) : true;
      const ok = Boolean(frontUrl) && backOk && artOk && backArtOk;
      // Cache this design so an unchanged one won't re-upload (proof OR artwork).
      if (ok) {
        lastProof.current = {
          sig: proofSignature,
          front: frontUrl,
          back: isDiff ? backUrl : null,
          art: artUrl,
          backArt: isDiff ? backArtUrl : null,
        };
      }
      setDesignStatus(ok ? 'ready' : 'error');
    })();
    return () => {
      cancelled = true;
    };
    // Regenerate only when the design actually changes (proofSignature), on
    // Retry, or on entering the Quote step — NOT on mere back-and-forth.
  }, [step, proofSignature, retryNonce, isBlank, isDiff]);

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
  const unit = unitPriceFor(qty, shape);
  const total = unit * qty;
  // "You save vs" anchor = the uniform $25 list, matching the Shopify discount
  // (which reduces from $25), so the storefront and checkout tell the same story.
  const list = LIST_PRICE;
  const saved = (list - unit) * qty;
  const nt = nextTier(qty, shape);
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
  // Deferred layout for the VISIBLE preview only. Tapping a layout thumbnail
  // updates `pattern` (urgent) so the button's active state flips instantly;
  // the heavier preview re-render — which re-decodes the logo image into the new
  // positions and briefly shows the placeholder — runs a beat later off this
  // deferred value instead of blocking the tap's paint. The hidden proof
  // canvases keep the immediate values so proofs stay exact.
  const dvPattern = useDeferredValue(dPattern);
  const dvActivePattern =
    activePatterns.find((p) => p.value === dvPattern) ?? activePatterns[0];
  const pvMarks = dvActivePattern.marks;
  const pvFull = Boolean(dvActivePattern.full);
  const pvSeamless = Boolean(dvActivePattern.seamless);

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

  // Printing requires artwork before checkout — otherwise the order carries a
  // placeholder proof. Waived only when the shopper asked us to design it for
  // them ('help'). Two-sided "different" needs artwork on BOTH faces.
  const needsArt = !isBlank && intent !== 'help';
  const artProvided = Boolean(logo) && (!isDiff || Boolean(backLogo));

  const stepValid = [
    Boolean(shape && sizeReady && material), // Bandana
    isBlank || !needsArt || artProvided, // Design — require artwork when printing
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
    ...(isBlank ? [] : [{key: 'Design layout', value: patternLabel}]),
    ...(!isBlank && logo ? [{key: 'Design', value: logoUrl ?? logo.name}] : []),
    ...(!isBlank && logo
      ? [{key: 'Design adjust', value: `${logoRotate}° · ${logoScale}%`}]
      : []),
    ...(!isBlank && logo && marks.length > 1
      ? [{key: 'Design spacing', value: `col ${colSpace}% · row ${rowSpace}%`}]
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
    // Two-sided "different design" carries a second (back) artwork + proof,
    // plus its own layout / rotate / spacing so production gets the full back
    // spec (mirrors the front attributes above and the Quote review).
    ...(isDiff && backLogo
      ? [
          {key: 'Back design', value: backLogoUrl ?? backLogo.name},
          {key: 'Back layout', value: backActivePattern.label},
          {key: 'Back adjust', value: `${backLogoRotate}° · ${backLogoScale}%`},
          ...(backMarks.length > 1
            ? [
                {
                  key: 'Back spacing',
                  value: `col ${backColSpace}% · row ${backRowSpace}%`,
                },
              ]
            : []),
        ]
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
    ...(designNote.trim()
      ? [{key: 'Design brief', value: designNote.trim()}]
      : []),
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
    <>
    <div className="bg-paper">
      <div className="ui-container py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          {/* Left — live preview (same footprint as the PDP gallery) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <BandanaPreview
              shape={shape}
              baseColor={baseColor}
              logoPreview={dLogo?.preview ?? null}
              marks={pvMarks}
              fullDesign={pvFull}
              seamless={pvSeamless}
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
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-2xl font-extrabold leading-none text-ink">
                {sizeReady ? money(total, currencyCode) : '—'}
              </span>
              {sizeReady ? (
                <span className="text-sm leading-none text-muted">
                  {money(unit, currencyCode)}/pc · {qty} pcs
                </span>
              ) : (
                <span className="text-sm leading-none text-muted">
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
                  designNote={designNote}
                  setDesignNote={setDesignNote}
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
                  shape={shape}
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
                            // Two-sided "different" — full front + back breakdown
                            // so every per-side adjustment is on the quote.
                            {label: 'Sides', value: 'Different front & back'},
                            {
                              label: 'Front — design',
                              value: logo ? logo.name : 'None',
                            },
                            {label: 'Front — layout', value: patternLabel},
                            ...(logo
                              ? [
                                  {
                                    label: 'Front — rotate / size',
                                    value: `${logoRotate}° · ${logoScale}%`,
                                  },
                                  ...(marks.length > 1
                                    ? [
                                        {
                                          label: 'Front — spacing',
                                          value: `col ${colSpace}% · row ${rowSpace}%`,
                                        },
                                      ]
                                    : []),
                                ]
                              : []),
                            {
                              label: 'Back — design',
                              value: backLogo ? backLogo.name : 'None',
                            },
                            {label: 'Back — layout', value: backActivePattern.label},
                            ...(backLogo
                              ? [
                                  {
                                    label: 'Back — rotate / size',
                                    value: `${backLogoRotate}° · ${backLogoScale}%`,
                                  },
                                  ...(backMarks.length > 1
                                    ? [
                                        {
                                          label: 'Back — spacing',
                                          value: `col ${backColSpace}% · row ${backRowSpace}%`,
                                        },
                                      ]
                                    : []),
                                ]
                              : []),
                            {label: 'Design help', value: intentLabel},
                          ]
                        : [
                            {label: 'Design layout', value: patternLabel},
                            ...(logo
                              ? [
                                  {label: 'Design', value: logo.name},
                                  {
                                    label: 'Rotate / size',
                                    value: `${logoRotate}° · ${logoScale}%`,
                                  },
                                  ...(marks.length > 1
                                    ? [
                                        {
                                          label: 'Spacing',
                                          value: `col ${colSpace}% · row ${rowSpace}%`,
                                        },
                                      ]
                                    : []),
                                ]
                              : [{label: 'Design', value: 'None'}]),
                            {label: 'Design help', value: intentLabel},
                          ]),
                  ]}
                />
              ) : null}
            </div>

            {/* Artwork gate — explains the disabled "Next" when printing without
                a design (so it never reads as a dead button). */}
            {step === 1 && needsArt && !artProvided ? (
              <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-orange-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
                {reuploadNotice
                  ? 'Your design isn’t saved when the page reloads — please re-upload it to continue.'
                  : isDiff
                    ? 'Upload artwork for the front and back to continue.'
                    : 'Upload your artwork to continue.'}
              </p>
            ) : null}

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
      <CustomPrintInfo />
    </>
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
