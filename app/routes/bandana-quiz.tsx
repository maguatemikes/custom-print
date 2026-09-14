import {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {Link, useSearchParams} from 'react-router';
import type {Route} from './+types/bandana-quiz';
import {BandanaPreview} from '~/components/custom-print/BandanaPreview';
import {DesignHerePlaceholder} from '~/components/custom-print/DesignHerePlaceholder';
import {TriangleDesignHere} from '~/components/custom-print/TriangleDesignHere';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {downscaleDataUrl} from '~/lib/customPrintProof';
import {Breadcrumbs, breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {siteOrigin} from '~/lib/seo';
import {
  DEFAULT_SIZE,
  sizesFor,
  normalizeSize,
  MIN_QTY,
  EMAIL_RE,
  patternsFor,
  unitPriceFor,
  nextTier,
  tiersFor,
  money,
} from '~/lib/customPrintData';

const CRUMBS = [{label: 'Home', href: '/'}, {label: 'Bandana Quiz'}];

type Shape = 'Square' | 'Triangle';
type Print = 'single' | 'double' | 'solid';

// Use-case-led first question. Each case pre-selects a realistic quantity so the
// quantity step lands somewhere sensible for that buyer.
const USE_CASES: Array<{value: string; label: string; note: string; qty: number}> =
  [
    {value: 'team', label: 'Team / Club', note: 'Matching kit for a squad', qty: 48},
    {value: 'event', label: 'Event / Festival', note: 'Crowd giveaways', qty: 300},
    {value: 'business', label: 'Business / Promo', note: 'Branded merch', qty: 144},
    {value: 'wedding', label: 'Wedding', note: 'Favours for guests', qty: 72},
    {value: 'personal', label: 'Personal', note: 'Just for me / a few', qty: 12},
    {value: 'reseller', label: 'Reseller / Bulk', note: 'Stock to resell', qty: 600},
  ];

// Real lifestyle photos shown in the live preview + result, keyed by use-case,
// so the preview reads as a product in context. Hosted on Shopify's CDN (allowed
// by the CSP img-src). Any use-case without an entry falls back to the recoloured
// bandana preview.
const CDN = 'https://cdn.shopify.com/s/files/1/1002/9485/2906/files';
const USE_CASE_IMAGE: Record<string, string> = {
  team: `${CDN}/sports-team-members-wearing-matching-custom-bandanas.jpg?v=1789209942`,
  event: `${CDN}/images_7.jpg?v=1789209942`,
  business: `${CDN}/Consultation-for-Custom-B2B-Bandana-Prints.webp?v=1789209942`,
  wedding: `${CDN}/letter_to_my_mom_on_my_wedding_day_handkerchief_bandana-r_vsvs8f_644.webp?v=1789210521`,
  personal: `${CDN}/Bandana_bedrucken_als_Haarband_jpg.webp?v=1789209942`,
  reseller: `${CDN}/images_8.jpg?v=1789209942`,
};

// Solid bandana colours (name + exact hex) from the WFE "Solid Color Bandana"
// product — the real in-stock options, shown as explicit swatches on step 3.
const COLORS: Array<{name: string; hex: string}> = [
  {name: 'Black', hex: '#000000'},
  {name: 'Burgundy / Wine', hex: '#672146'},
  {name: 'Dark Brown', hex: '#623b2a'},
  {name: 'Dark Grey', hex: '#5b6770'},
  {name: 'Gold', hex: '#ffa300'},
  {name: 'Grape', hex: '#9b26b6'},
  {name: 'Hot Pink', hex: '#e31c79'},
  {name: 'Hunter Green', hex: '#006341'},
  {name: 'Kelly Green', hex: '#00b140'},
  {name: 'Light Blue', hex: '#92c1e9'},
  {name: 'Light Pink', hex: '#f5b6cd'},
  {name: 'Light Yellow', hex: '#f6eb61'},
  {name: 'Lilac', hex: '#caa2dd'},
  {name: 'Lime Green', hex: '#97d700'},
  {name: 'Mint Green', hex: '#8fe2b0'},
  {name: 'Mirage Blue', hex: '#307fe2'},
  {name: 'Natural', hex: '#efdbb2'},
  {name: 'Navy Blue', hex: '#001e60'},
  {name: 'Neon Green', hex: '#44d62c'},
  {name: 'Neon Hot Pink', hex: '#ff13f0'},
  {name: 'Neon Orange', hex: '#ff8f6c'},
  {name: 'Neon Yellow', hex: '#ffe900'},
  {name: 'Olive Green', hex: '#949300'},
  {name: 'Orange', hex: '#ff671f'},
  {name: 'Peach', hex: '#ffa38b'},
  {name: 'Purple', hex: '#5f259f'},
  {name: 'Red', hex: '#d50032'},
  {name: 'Royal Blue', hex: '#003da5'},
  {name: 'Teal', hex: '#00a499'},
  {name: 'Turquoise', hex: '#00aec7'},
  {name: 'White', hex: '#ffffff'},
  {name: 'Yellow', hex: '#ffd100'},
];

// Real design photos for the intro slider (a taste of what we make).
const INTRO_SLIDES = [
  {src: USE_CASE_IMAGE.team, alt: 'Custom team bandanas'},
  {src: USE_CASE_IMAGE.event, alt: 'Event & festival bandanas'},
  {src: USE_CASE_IMAGE.wedding, alt: 'Wedding favour bandanas'},
  {src: USE_CASE_IMAGE.business, alt: 'Branded business bandanas'},
  {src: USE_CASE_IMAGE.personal, alt: 'Personal custom bandana'},
  {src: USE_CASE_IMAGE.reseller, alt: 'Wholesale bandanas'},
];

const PRINT_OPTIONS: Array<{value: Print; label: string; note: string}> = [
  {value: 'single', label: 'Single side print', note: 'Your design, one side'},
  {value: 'double', label: 'Double-sided', note: 'Print both sides'},
  {value: 'solid', label: 'Solid colour', note: 'No print — colour only'},
];

// Design status → wizard intent (values match the wizard's INTENTS: ready/layout/help).
// Each choice drives a different downstream pathway (see questionSteps):
//   ready  → confirm design → layout → email        (full design; NO colour step)
//   layout → colour → layout → email                (has a logo to place)
//   help   → idea center → colour → layout → email  (no design yet)
const DESIGN_INTENTS: Array<{value: string; label: string; note?: string}> = [
  {value: 'ready', label: "My artwork's ready to upload", note: 'Upload a print-ready file'},
  {value: 'layout', label: 'I have a logo — I need to place it', note: "We'll help you position it"},
  {
    value: 'help',
    label: "I don't have a design — walk me through it",
    note: 'Browse ideas · our design team can help',
  },
];

// Placeholder "Idea Center" gallery — starter directions for shoppers with no
// artwork ("walk me through it"). TODO: replace `src` with the curated / AI-
// generated design library; these are stand-in thumbnails for now.
// Real design proofs on the Shopify CDN, keyed by category. Add more categories
// (Emblem, Sports, Floral…) here as their files are uploaded.
const IDEA_FILES: Record<string, string[]> = {
  Paisley: [
    'I-Heart-Country-Natural-Proof.jpg',
    '30003400-Dr-Pepper-Wine-Proof.jpg',
    'Coke-Studio-Bandanna-ver-3-jpg.webp',
    'Caretta-CP-Proof-Lime.jpg',
    'Big-Head-Corps-Proof-2.jpg',
    '3A-1.jpg',
    'Amazon-Peccy-Eyes-up.jpg',
    '20855639-Malibu-custom-paisley-bandanna-Copy.jpg',
    'Florida-man-CP-proof-3-2.jpg',
    'Caretta-CP-Proof-Lt-Blue.jpg',
    'Tractor-Supply-bandanna-ver-1.jpg',
    'Coke-Studio-Bandanna-ver-3.jpg',
    'YL-Bandanna-ver-1-Hot-Pink-1.jpg',
    'custom_paisley_-_ups_bandanna.jpg',
  ],
  Awareness: [
    'hot-pink-1-1.jpg',
    'b22nov-000230_pink_ribbon_survivor-1.jpg',
    'Lyft-Bandanna-flat-300x300.webp',
    '2356_Pink-Tea-2016-Scarf_PRINT.jpg',
    '967535.WO-21329753-colored.jpg',
    'b22nov-000231_pink_ribbons_black-1.jpg',
    'purple-fundraiser-bandanna.jpg',
    '23547069-1-Pink-300x300.webp',
    '22471161-Miscreants-pink-300x300.webp',
    'black.jpg',
    'charities_-_habitat_housing.jpg',
    'Walk-for-Life-blue.jpg',
    'PO-P7180698C-Team-Green-Goes-Pink-proof.webp',
    'walks__marathons_-_heart_walk.jpg',
  ],
};
const IDEAS: Array<{value: string; label: string; category: string; src: string}> =
  Object.entries(IDEA_FILES).flatMap(([category, files]) =>
    files.map((f) => {
      const base = f.replace(/\.[^.]+$/, '');
      return {
        value: base.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: base.replace(/[-_]+/g, ' ').trim(),
        category,
        src: `${CDN}/${f}`,
      };
    }),
  );

// Distinct categories for the Idea Center filter dropdown ("All" + each category).
const IDEA_CATEGORIES = [
  'All',
  ...Array.from(new Set(IDEAS.map((i) => i.category))),
];

// localStorage key for resuming an in-progress quiz (URL is the primary source).
const QUIZ_STORAGE_KEY = 'cb:quiz:v1';

export const meta: Route.MetaFunction = ({matches}) => {
  const origin = siteOrigin(matches);
  const url = `${origin}/bandana-quiz`;
  const title = 'Custom bandana quiz — find your perfect bandana in 60 seconds';
  const description =
    'Answer a few quick questions and get a tailored custom-bandana recommendation, then jump straight into designing yours — no setup or artwork fees, free proof.';
  return [
    {title: `${title} | Custom Bandanas`},
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
    {'script:ld+json': breadcrumbJsonLd(CRUMBS, origin)},
  ];
};

export default function BandanaQuizPage() {
  // 0 = intro · 1..7 = questions · 8 = result
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState('team'); // Team / Club preselected
  const [useCaseOther, setUseCaseOther] = useState(''); // free text for "Other"
  // True once the shopper tries to continue with an empty "Other" — drives the
  // red validation border (so it isn't red before they've attempted anything).
  const [otherAttempted, setOtherAttempted] = useState(false);
  const [shape, setShape] = useState<Shape>('Square');
  const [layout, setLayout] = useState('full'); // design layout (pattern) value
  const [color, setColor] = useState('#d50032'); // Red — in the swatch palette
  const [size, setSize] = useState(DEFAULT_SIZE.Square);
  const [qty, setQty] = useState(MIN_QTY);
  const [qtyInput, setQtyInput] = useState(String(MIN_QTY));
  const [print, setPrint] = useState<Print>('single');
  const [intent, setIntent] = useState('ready'); // design status → wizard intent
  const [idea, setIdea] = useState(''); // Idea Center pick (help pathway only)
  const [ideaFilter, setIdeaFilter] = useState('All'); // Idea Center category filter
  const ideaScrollRef = useRef<HTMLDivElement>(null); // Idea Center carousel scroller
  const scrollIdeas = (dir: 1 | -1) =>
    ideaScrollRef.current?.scrollBy({left: dir * 288, behavior: 'smooth'});
  // Pointer/touch drag-to-scroll for the idea carousel (same as the tier table):
  // press and drag to slide. `moved` suppresses the click-select after a drag.
  const ideaDrag = useRef({down: false, moved: false, startX: 0, scrollLeft: 0});
  const onIdeaDown = (e: React.PointerEvent) => {
    const el = ideaScrollRef.current;
    if (!el) return;
    // Touch already pans natively (overflow-x); only drive mouse/pen drag here so
    // pointer-capture never fights the native touch scroll. Clear the drag flag so
    // a tap always selects (never blocked by a stale drag from earlier).
    if (e.pointerType === 'touch') {
      ideaDrag.current.moved = false;
      return;
    }
    ideaDrag.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
    // Free-scroll while dragging — mandatory snap makes the drag jerk toward each
    // card; we restore the snap on release so it settles on the nearest one.
    // NB: no setPointerCapture — capturing on the scroller retargets the click to
    // it, so a card's onClick would never fire (selection would silently fail).
    el.style.scrollSnapType = 'none';
  };
  const onIdeaMove = (e: React.PointerEvent) => {
    const el = ideaScrollRef.current;
    const d = ideaDrag.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    if (d.moved) e.preventDefault();
    el.scrollLeft = d.scrollLeft - dx;
  };
  const onIdeaUp = () => {
    ideaDrag.current.down = false;
    // Restore CSS snap so the carousel settles on the nearest card.
    if (ideaScrollRef.current) ideaScrollRef.current.style.scrollSnapType = '';
  };
  const [artOk, setArtOk] = useState(false); // "Is this your artwork?" confirm
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  // Floating full-spectrum picker — the escape hatch when the shopper's colour
  // isn't in the swatch grid.
  const [spectrumOpen, setSpectrumOpen] = useState(false);

  // Artwork on the design step. IMPORTANT: we do NOT upload to the CDN here —
  // that would litter it with files from abandoned quizzes and every "Replace".
  // The file is captured LOCALLY (a downscaled preview) and stashed in
  // sessionStorage; the wizard hosts it at its Quote step (its existing deferred,
  // deduped upload), so the CDN only ever gets art from shoppers who check out.
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [logoStatus, setLogoStatus] = useState<'idle' | 'ready' | 'error'>(
    'idle',
  );
  const [logoError, setLogoError] = useState('');
  // Set true when the shopper hits Continue on the design-status step without an
  // upload (for the "ready"/"layout" choices) — turns the uploader border red
  // instead of showing a text hint. Clears once a file is added.
  const [logoAttempted, setLogoAttempted] = useState(false);

  const onLogoFile = (file: File) => {
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!okTypes.includes(file.type)) {
      setLogoError('Use a PNG, JPG, WEBP or GIF.');
      setLogoStatus('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('That file is over 10MB — try a smaller one.');
      setLogoStatus('error');
      return;
    }
    setLogoError('');
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      const small = await downscaleDataUrl(
        dataUrl,
        1000,
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      );
      setLogoPreview(small);
      setLogoStatus('ready');
      setLogoAttempted(false);
      // Local hand-off only — no CDN write. The wizard hosts it at Quote.
      try {
        sessionStorage.setItem(
          'cb:quiz:logo',
          JSON.stringify({name: file.name, preview: small}),
        );
      } catch {
        /* storage blocked — the preview still works this session */
      }
    };
    reader.readAsDataURL(file);
  };

  const onLogoRemove = () => {
    setLogoPreview(null);
    setLogoName('');
    setLogoStatus('idle');
    setLogoError('');
    try {
      sessionStorage.removeItem('cb:quiz:logo');
    } catch {
      /* ignore */
    }
  };

  // --- Resume: read answers from the URL (shareable) or, if none, from
  // localStorage (survives a refresh / accidental back). Runs once on mount. ---
  const [searchParams, setSearchParams] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const keys = ['step', 'useCase', 'shape', 'color', 'size', 'qty', 'print', 'layout', 'intent', 'idea'];
    const hasUrl = keys.some((k) => searchParams.has(k));
    let saved: Record<string, string> | null = null;
    if (!hasUrl) {
      try {
        const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
        if (raw) saved = JSON.parse(raw) as Record<string, string>;
      } catch {
        saved = null;
      }
    }
    const get = (k: string) =>
      hasUrl ? searchParams.get(k) : (saved?.[k] ?? null);

    const uc = get('useCase');
    if (uc && (uc === 'other' || USE_CASES.some((u) => u.value === uc)))
      setUseCase(uc);
    const uo = get('useOther');
    if (uo) setUseCaseOther(uo);

    const sh = get('shape');
    const nextShape: Shape | null =
      sh === 'triangle' ? 'Triangle' : sh === 'square' ? 'Square' : null;
    if (nextShape) setShape(nextShape);

    const co = get('color');
    if (co && /^[0-9a-fA-F]{6}$/.test(co)) setColor(`#${co.toLowerCase()}`);

    const sz = get('size');
    if (sz) {
      const match = sizesFor(nextShape ?? shape).find(
        (s) => normalizeSize(s.name) === normalizeSize(sz),
      );
      if (match) setSize(match.name);
    }

    const q = get('qty');
    if (q) {
      const n = Math.floor(Number(q));
      if (Number.isFinite(n) && n >= MIN_QTY) {
        setQty(n);
        setQtyInput(String(n));
      }
    }

    const pr = get('print');
    if (pr === 'single' || pr === 'double' || pr === 'solid') setPrint(pr);

    const lo = get('layout');
    if (lo && patternsFor(nextShape ?? shape).some((p) => p.value === lo))
      setLayout(lo);

    const it = get('intent');
    if (it && DESIGN_INTENTS.some((x) => x.value === it)) setIntent(it);

    const id2 = get('idea');
    if (id2 && IDEAS.some((x) => x.value === id2)) setIdea(id2);

    const st = get('step');
    if (st != null) {
      const n = Math.floor(Number(st));
      // A shared URL may deep-link to any step (incl. the result). A localStorage
      // resume only re-enters an in-progress question (never the result step 10).
      if (
        Number.isFinite(n) &&
        (hasUrl ? n >= 0 && n <= 12 : n >= 1 && n <= 12 && n !== 10)
      ) {
        setStep(n);
      }
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Persist: mirror answers to the URL (shareable/deep-linkable) and
  // localStorage (resume), debounced. Gated on `hydrated` so it can't clobber
  // the URL before the read above runs. ---
  useEffect(() => {
    if (!hydrated) return;
    const snapshot = {
      step: String(step),
      useCase,
      useOther: useCaseOther,
      shape: shape.toLowerCase(),
      color: color.replace('#', ''),
      size: size.replace(/\s+/g, ''),
      qty: String(qty),
      print,
      layout,
      intent,
      idea,
    };
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          Object.entries(snapshot).forEach(([k, v]) => prev.set(k, v));
          return prev;
        },
        {replace: true, preventScrollReset: true},
      );
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        /* storage unavailable — URL still persists */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [
    hydrated,
    step,
    useCase,
    useCaseOther,
    shape,
    color,
    size,
    qty,
    print,
    layout,
    intent,
    idea,
    setSearchParams,
  ]);

  const sizes = sizesFor(shape);
  const printLabel =
    PRINT_OPTIONS.find((p) => p.value === print)?.label ?? 'Single side print';

  // --- Intro: auto-advance the design slider (paused for reduced-motion).
  // Pure eye-candy, resets when the quiz starts. ---
  const [introIdx, setIntroIdx] = useState(0);
  useEffect(() => {
    if (step !== 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setIntroIdx((i) => (i + 1) % INTRO_SLIDES.length),
      3200,
    );
    return () => clearInterval(id);
  }, [step]);

  const cleanSize = size.replace(/\s+/g, '');
  const cleanColor = color.replace('#', '');
  const designHref = `/custom-print/${shape.toLowerCase()}?size=${encodeURIComponent(
    cleanSize,
  )}&color=${cleanColor}&qty=${qty}&print=${print}&layout=${layout}&intent=${intent}&start=1`;
  const calcHref = `/bandana-calculator?shape=${shape.toLowerCase()}&size=${cleanSize}&qty=${qty}&print=${print}`;

  // Smooth crossfade between steps / preview images via the View Transitions API
  // (feature-detected; falls back to an instant update; respects reduced motion).
  const runVT = (update: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => {finished?: Promise<void>};
    };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // View transitions need a visible document; when hidden they abort, so fall
    // back to an instant update and swallow any abort rejection.
    if (typeof doc.startViewTransition === 'function' && !document.hidden && !reduce) {
      try {
        const vt = doc.startViewTransition(() => flushSync(update));
        vt?.finished?.catch(() => {});
      } catch {
        update();
      }
    } else {
      update();
    }
  };

  function pickShape(nextShape: Shape) {
    runVT(() => {
      setShape(nextShape);
      setSize(DEFAULT_SIZE[nextShape]);
      // Layouts differ per shape (square vs triangle) — reset to the new shape's
      // default so a square-only value can't carry into a triangle.
      setLayout(patternsFor(nextShape)[0].value);
    });
  }

  // Step IDs (fixed): 1 use-case · 2 shape · 3 colour · 4 size · 5 quantity ·
  // 6 print · 7 design-status · 8 layout · 9 email · 11 idea-center · 10 result.
  // The VISUAL ORDER is defined here (array-driven), and branches on print +
  // design intent:
  //   solid  → use→qty→shape→size→print→colour→email   (no design/layout)
  //   ready  → …→print→design→layout→email             (full design, NO colour)
  //   layout → …→print→design→colour→layout→email
  //   help   → …→print→design→idea→colour→layout→email
  const IDEA_STEP = 11;
  const CONFIRM_STEP = 12;
  const questionSteps = (() => {
    const lead = [1, 5, 2, 4, 6]; // use-case → qty → shape → size → print
    if (print === 'solid') return [...lead, 3, 9]; // + colour → email
    const withDesign = [...lead, 7]; // + design-status (the branch point)
    // Ready = a finished full design → confirm the artwork → email (no colour/layout).
    if (intent === 'ready') return [...withDesign, CONFIRM_STEP, 9];
    if (intent === 'layout') return [...withDesign, 3, 8, 9]; // colour → layout → email
    return [...withDesign, IDEA_STEP, 3, 8, 9]; // help: idea → colour → layout → email
  })();
  const RESULT_STEP = 10;
  const qTotal = questionSteps.length;
  const qPos = Math.max(1, questionSteps.indexOf(step) + 1);
  const next = () =>
    runVT(() =>
      setStep((s) => {
        if (s === 0) return questionSteps[0];
        const i = questionSteps.indexOf(s);
        return i === -1 || i === questionSteps.length - 1
          ? RESULT_STEP
          : questionSteps[i + 1];
      }),
    );
  const back = () =>
    runVT(() =>
      setStep((s) => {
        if (s === RESULT_STEP) return questionSteps[questionSteps.length - 1];
        const i = questionSteps.indexOf(s);
        return i <= 0 ? 0 : questionSteps[i - 1];
      }),
    );

  // The final result (instant quote) is gated behind an email. If a shared link
  // or restored progress lands on the result without a valid email, send the
  // shopper to the email step (9) first so we always capture it. Runs only after
  // hydration so the URL/localStorage restore has settled.
  useEffect(() => {
    if (!hydrated) return;
    if (step === RESULT_STEP && !EMAIL_RE.test(email.trim())) {
      setStep(9);
    }
  }, [hydrated, step, email]);

  function submitEmail() {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email so we can send your recommendation.');
      return;
    }
    setEmailError('');
    // TODO(email-wiring): capture `email` to Shopify (customer / newsletter
    // opt-in) via a route action once the API path is confirmed. Collect-only
    // for now — the value stays in state and drives the result copy below.
    next();
  }

  return (
    <div className="bg-paper">
      <style>{`
        @keyframes qzIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes qzPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
        @keyframes qzFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .qz-step{animation:qzIn .34s ease both}
        .qz-pop{animation:qzPop .42s cubic-bezier(.2,.75,.2,1) both}
        .qz-float{animation:qzFloat 4s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){
          .qz-step,.qz-pop,.qz-float{animation:none}
        }
      `}</style>

      <div className="ui-container pt-6">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <section className="bg-paper">
        <div className="ui-container flex justify-center pb-16 pt-3 md:pb-24 md:pt-5">
          {/* Intro + result are centred and narrow; the question steps use the
              wide single-card configurator (question left, live preview right). */}
          {step === 0 || step === RESULT_STEP ? (
            <div className="w-full max-w-xl">
              {step === 0 ? (
                <div className="qz-step rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)] md:p-8">
                  <span className="eyebrow text-brand-700">
                    60-second quiz · a few quick questions
                  </span>
                  <h1 className="mt-3 text-3xl font-extrabold uppercase leading-[1.03] tracking-tight text-ink md:text-5xl">
                    Find Your Perfect
                    <br />
                    Custom Bandana
                  </h1>
                  <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">
                    A few quick taps and we&apos;ll reveal the bandana we&apos;d
                    make just for you — built for teams, events, brands and
                    resellers.
                  </p>

                  {/* Design slider — a taste of what we make. Cross-fades and
                      auto-advances; the dots also let the shopper browse. */}
                  <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-mint">
                    {INTRO_SLIDES.map((s, i) => (
                      <img
                        key={s.src}
                        src={s.src}
                        alt={s.alt}
                        draggable={false}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                          i === introIdx ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                      {INTRO_SLIDES.map((s, i) => (
                        <button
                          key={s.src}
                          type="button"
                          aria-label={`Show ${s.alt}`}
                          aria-pressed={i === introIdx}
                          onClick={() => setIntroIdx(i)}
                          className={`h-1.5 rounded-full shadow-sm transition-all ${
                            i === introIdx
                              ? 'w-5 bg-white'
                              : 'w-1.5 bg-white/60 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={next}
                    className="btn btn-dark mt-6 w-full text-base sm:w-auto sm:px-12"
                  >
                    Take the quiz
                  </button>
                  <p className="mt-4 text-xs font-medium text-muted">
                    Trusted by 100,000+ · No setup or artwork fees
                  </p>
                </div>
              ) : (
                <ResultCard
                  useCase={useCase}
                  useCaseOther={useCaseOther}
                  intent={intent}
                  idea={idea}
                  shape={shape}
                  color={color}
                  size={size}
                  qty={qty}
                  onQty={(n) => {
                    setQty(n);
                    setQtyInput(String(n));
                  }}
                  print={print}
                  printLabel={printLabel}
                  layout={layout}
                  email={email}
                  designHref={designHref}
                  calcHref={calcHref}
                  logoPreview={logoPreview}
                  logoName={logoName}
                  onRestart={() => {
                    setStep(1);
                    setUseCase('team');
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl">
              {/* Progress */}
              <div className="mb-5">
                <div className="mb-2 flex justify-end">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700 tabular-nums">
                    {qPos} / {qTotal}
                  </span>
                </div>
                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuenow={qPos}
                  aria-valuemin={0}
                  aria-valuemax={qTotal}
                  aria-label="Quiz progress"
                >
                  {Array.from({length: qTotal}).map((_, i) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i < qPos ? 'bg-brand-500' : 'bg-mint-deep'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* One card — question (left) and the live preview (right half).
                  Stacks on mobile with the preview on top so it stays visible. */}
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)]">
                {/* Fixed height on desktop → the card never changes height
                    between questions (tallest step is the colour spectrum). */}
                <div
                  className={`grid md:grid-cols-2 ${
                    step === IDEA_STEP ? '' : 'md:h-[600px]'
                  }`}
                >
                  {/* Question (left on desktop, below preview on mobile) — a
                      square; content at top, Continue pinned bottom-left. */}
                  <div
                    className={`order-2 flex min-h-0 flex-col p-6 md:order-1 md:p-8 ${
                      step === IDEA_STEP ? 'md:col-span-2' : 'overflow-y-auto'
                    }`}
                  >
                    <div key={step} className="qz-step flex flex-1 flex-col">
                      {/* 1 — Use case */}
                      {step === 1 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="Who are these for?"
                            sub="Tap the closest fit — we'll tailor the rest."
                          />
                          {useCase !== 'other' ? (
                            <div className="grid grid-cols-2 gap-3">
                              {USE_CASES.map((u) => (
                                <OptionCard
                                  key={u.value}
                                  selected={useCase === u.value}
                                  title={u.label}
                                  note={u.note}
                                  onClick={() => runVT(() => setUseCase(u.value))}
                                />
                              ))}
                              {/* Escape hatch — dashed full-width button, the
                                  same repeated pattern as the colour / size
                                  escape hatches. */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOtherAttempted(false);
                                  runVT(() => setUseCase('other'));
                                }}
                                className="col-span-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm font-semibold text-muted transition hover:border-brand-500 hover:text-ink"
                              >
                                Other — tell us what they&apos;re for
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-ink">
                                  Tell us what they&apos;re for
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runVT(() => {
                                      setUseCase('');
                                      setUseCaseOther('');
                                    })
                                  }
                                  className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="m15 18-6-6 6-6" />
                                  </svg>
                                  All options
                                </button>
                              </div>
                              <input
                                type="text"
                                value={useCaseOther}
                                onChange={(e) => setUseCaseOther(e.target.value)}
                                autoFocus
                                maxLength={60}
                                placeholder="e.g. Church group, birthday, brand launch…"
                                className={`h-12 w-full rounded-xl border bg-white px-3 text-base font-semibold text-ink focus:outline-none ${
                                  otherAttempted && !useCaseOther.trim()
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-black/15 focus:border-brand-500'
                                }`}
                              />
                              <p className="mt-1.5 text-xs text-muted">
                                We&apos;ll tailor the rest around this.
                              </p>
                            </>
                          )}
                          <StepFooter
                            onBack={back}
                            onContinue={() => {
                              // Empty "Other" → flag it (red border) instead of
                              // advancing; otherwise continue as normal.
                              if (useCase === 'other' && !useCaseOther.trim()) {
                                setOtherAttempted(true);
                                return;
                              }
                              next();
                            }}
                            disabled={useCase === 'other' ? false : !useCase}
                          />
                        </>
                      ) : null}

                      {/* 2 — Shape */}
                      {step === 2 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="Square or triangle?"
                            sub="The classic square, or a corner-fold triangle."
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {(['Square', 'Triangle'] as Shape[]).map((sh) => (
                              <OptionCard
                                key={sh}
                                selected={shape === sh}
                                title={sh}
                                onClick={() => pickShape(sh)}
                              />
                            ))}
                            <OptionCard
                              selected={false}
                              title="Rectangle"
                              note="Coming soon"
                              disabled
                              onClick={() => {}}
                            />
                            <OptionCard
                              selected={false}
                              title="Fabric roll"
                              note="Coming soon"
                              disabled
                              onClick={() => {}}
                            />
                          </div>
                          <StepFooter onBack={back} onContinue={next} />
                        </>
                      ) : null}

                      {/* 3 — Colour (explicit swatches from the WFE palette) */}
                      {step === 3
                        ? (() => {
                            const match = COLORS.find(
                              (c) => c.hex.toLowerCase() === color.toLowerCase(),
                            );
                            const isCustom = !match;
                            return (
                              <>
                                <QuestionHead
                                  step={qPos}
                                  title="What's your background colour?"
                                  sub="Pick your fabric colour — the preview updates instantly."
                                />

                                {/* Selected colour name — kept ON TOP so it's
                                    always visible. In the picker view the
                                    "Back to swatches" link sits inline on the
                                    right of this same row. (No swatch dot — the
                                    live preview already shows the colour.) */}
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-ink">
                                    {match?.name ?? 'Custom colour'}
                                    {isCustom ? (
                                      <span className="ml-1.5 font-normal uppercase tabular-nums text-muted">
                                        {color}
                                      </span>
                                    ) : null}
                                  </p>
                                  {spectrumOpen ? (
                                    <button
                                      type="button"
                                      onClick={() => setSpectrumOpen(false)}
                                      className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="m15 18-6-6 6-6" />
                                      </svg>
                                      All colours
                                    </button>
                                  ) : null}
                                </div>

                                {/* Two toggled views in the SAME footprint —
                                    swatches OR the spectrum — so opening the
                                    picker replaces the grid instead of stacking
                                    below it (no scrolling, button never moves). */}
                                {!spectrumOpen ? (
                                  <>
                                    <div className="grid grid-cols-6 gap-3.5 sm:grid-cols-8">
                                      {COLORS.map((c) => {
                                        const on =
                                          color.toLowerCase() ===
                                          c.hex.toLowerCase();
                                        return (
                                          <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() =>
                                              runVT(() => setColor(c.hex))
                                            }
                                            aria-pressed={on}
                                            aria-label={c.name}
                                            title={c.name}
                                            className={`aspect-square w-full rounded-full border transition ${
                                              on
                                                ? 'ring-2 ring-brand-500 ring-offset-2'
                                                : 'border-black/15 hover:scale-110'
                                            }`}
                                            style={{backgroundColor: c.hex}}
                                          />
                                        );
                                      })}
                                    </div>

                                    {/* Escape hatch — swaps to the spectrum. */}
                                    <button
                                      type="button"
                                      onClick={() => setSpectrumOpen(true)}
                                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm font-semibold transition ${
                                        isCustom
                                          ? 'border-brand-500 text-ink'
                                          : 'border-black/20 text-muted hover:border-brand-500 hover:text-ink'
                                      }`}
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <circle cx="13.5" cy="6.5" r="2.5" />
                                        <circle cx="17.5" cy="10.5" r="2.5" />
                                        <circle cx="8.5" cy="7.5" r="2.5" />
                                        <circle cx="6.5" cy="12.5" r="2.5" />
                                        <path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.7-.3-1.3-.7-1.8-.4-.5-.7-1-.7-1.7A2.5 2.5 0 0 1 15.5 13H17a5 5 0 0 0 5-5c0-4.4-4.5-6-10-6Z" />
                                      </svg>
                                      {isCustom
                                        ? 'Adjust your custom colour'
                                        : 'Can’t find it? Pick a custom colour'}
                                    </button>
                                  </>
                                ) : (
                                  <ColorSpectrum
                                    value={color}
                                    onChange={setColor}
                                    compact
                                  />
                                )}

                                <StepFooter onBack={back} onContinue={next} />
                              </>
                            );
                          })()
                        : null}

                      {/* 4 — Size */}
                      {step === 4 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="What size?"
                            sub="Finished dimensions in inches."
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {sizes.map((s) => (
                              <OptionCard
                                key={s.name}
                                selected={size === s.name}
                                title={`${s.name} in`}
                                onClick={() => setSize(s.name)}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSize(DEFAULT_SIZE[shape]);
                              next();
                            }}
                            className="mt-3 w-full rounded-xl border border-dashed border-black/20 px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-brand-500 hover:text-ink"
                          >
                            Not sure — pick the popular size for me
                          </button>
                          <StepFooter onBack={back} onContinue={next} />
                        </>
                      ) : null}

                      {/* 5 — Quantity (free input, no prices) */}
                      {step === 5 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="How many do you need?"
                            sub="Enter a rough quantity — you can fine-tune it later."
                          />
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                              Quantity (pieces)
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={MIN_QTY}
                              step={1}
                              value={qtyInput}
                              onChange={(e) => {
                                const v = e.target.value;
                                setQtyInput(v);
                                const n = Math.floor(Number(v));
                                if (Number.isFinite(n) && n >= MIN_QTY) setQty(n);
                              }}
                              onBlur={() => {
                                const n = Math.max(
                                  MIN_QTY,
                                  Math.floor(Number(qtyInput) || MIN_QTY),
                                );
                                setQty(n);
                                setQtyInput(String(n));
                              }}
                              placeholder="e.g. 100"
                              className="h-12 w-full rounded-xl border border-black/15 bg-white px-3 text-lg font-semibold text-ink tabular-nums [appearance:textfield] focus:border-brand-500 focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="mt-1.5 block text-xs text-muted">
                              Minimum order is {MIN_QTY} pieces.
                            </span>
                          </label>
                          <StepFooter onBack={back} onContinue={next} />
                        </>
                      ) : null}

                      {/* 6 — Print style */}
                      {step === 6 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="How should it print?"
                            sub="You can fine-tune everything in the designer next."
                          />
                          <div className="grid grid-cols-1 gap-3">
                            {PRINT_OPTIONS.map((p) => (
                              <OptionCard
                                key={p.value}
                                selected={print === p.value}
                                title={p.label}
                                note={p.note}
                                onClick={() => runVT(() => setPrint(p.value))}
                                row
                              />
                            ))}
                          </div>
                          <StepFooter onBack={back} onContinue={next} />
                        </>
                      ) : null}

                      {/* 8 — Design layout (maps to the wizard's ?layout=) */}
                      {step === 8 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="How should the design sit?"
                            sub="Pick a layout — fine-tune it in the designer next."
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {patternsFor(shape).map((p) => (
                              <OptionCard
                                key={p.value}
                                selected={layout === p.value}
                                title={p.label}
                                onClick={() => runVT(() => setLayout(p.value))}
                              />
                            ))}
                          </div>
                          <StepFooter
                            onBack={back}
                            onContinue={next}
                            label="Almost there"
                          />
                        </>
                      ) : null}

                      {/* 7 — Design status + upload (before the layout step) */}
                      {step === 7 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="Where are you with your design?"
                          />
                          <div className="grid grid-cols-1 gap-3">
                            {DESIGN_INTENTS.map((it) => (
                              <OptionCard
                                key={it.value}
                                selected={intent === it.value}
                                title={it.label}
                                note={it.note}
                                onClick={() =>
                                  runVT(() => {
                                    setIntent(it.value);
                                    // "No design yet" → drop any prior upload so it
                                    // can't carry into the preview / quote / wizard.
                                    if (it.value === 'help') onLogoRemove();
                                  })
                                }
                                row
                              />
                            ))}
                          </div>
                          <StepFooter
                            onBack={back}
                            // Both "ready to upload" AND "I have a logo — place it"
                            // require the file first (they both say they have art);
                            // only "walk me through it" (help) needs no upload. On a
                            // Continue without art, flag it so the uploader border
                            // turns red (no text hint) instead of advancing.
                            onContinue={() => {
                              if (intent !== 'help' && !logoPreview) {
                                setLogoAttempted(true);
                                return;
                              }
                              next();
                            }}
                          />
                        </>
                      ) : null}

                      {/* 12 — Confirm artwork (ready pathway: full-size review) */}
                      {step === CONFIRM_STEP ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="Is this your artwork?"
                            sub="Check it looks right — you'll fine-tune size & placement in the designer next."
                          />
                          {/* Yes/No as radio buttons; No returns to upload. */}
                          <div className="flex flex-col gap-3">
                            <label
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                                artOk
                                  ? 'border-brand-500 bg-brand-50'
                                  : 'border-black/12 hover:border-black/25'
                              }`}
                            >
                              <input
                                type="radio"
                                name="artConfirm"
                                checked={artOk}
                                onChange={() => setArtOk(true)}
                                className="h-4 w-4 shrink-0 accent-brand-500"
                              />
                              <span className="text-sm font-bold text-ink">
                                Yes, that&apos;s my artwork
                              </span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/12 px-4 py-3 transition hover:border-black/25">
                              <input
                                type="radio"
                                name="artConfirm"
                                checked={false}
                                onChange={() => {
                                  setArtOk(false);
                                  back();
                                }}
                                className="h-4 w-4 shrink-0 accent-brand-500"
                              />
                              <span className="text-sm font-bold text-ink">
                                No — replace it
                              </span>
                            </label>
                          </div>
                          <StepFooter
                            onBack={back}
                            onContinue={next}
                            disabled={!artOk}
                            hint={
                              !artOk ? 'Confirm your artwork to continue' : undefined
                            }
                          />
                        </>
                      ) : null}

                      {/* 11 — Idea Center (help pathway: browse starter ideas) */}
                      {step === IDEA_STEP ? (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <QuestionHead
                              step={qPos}
                              title="Pick a design idea"
                              sub="Swipe through design directions and pick one to start."
                            />
                            {/* Category filter — custom dropdown (not native). */}
                            <div className="flex shrink-0 items-center gap-2 pt-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                                Filter
                              </span>
                              <div className="w-44">
                                <SelectMenu
                                  value={ideaFilter}
                                  onChange={setIdeaFilter}
                                  options={IDEA_CATEGORIES.map((c) => ({
                                    value: c,
                                    label: c,
                                  }))}
                                  ariaLabel="Filter design ideas by category"
                                />
                              </div>
                            </div>
                          </div>
                          {/* Divider line under the title */}
                          <div className="mb-4 border-t border-black/10" />
                          {/* Full-width carousel — native touch/trackpad swipe on
                              the scroller, plus prev/next buttons. Sharp images. */}
                          <div className="relative">
                            <div
                              ref={ideaScrollRef}
                              onPointerDown={onIdeaDown}
                              onPointerMove={onIdeaMove}
                              onPointerUp={onIdeaUp}
                              onPointerCancel={onIdeaUp}
                              onDragStart={(e) => e.preventDefault()}
                              style={{touchAction: 'pan-x'}}
                              className="no-scrollbar flex cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto pb-2 active:cursor-grabbing"
                            >
                            {IDEAS.filter(
                              (it) =>
                                ideaFilter === 'All' ||
                                it.category === ideaFilter,
                            ).map((it) => {
                              const on = idea === it.value;
                              return (
                                <button
                                  key={it.value}
                                  type="button"
                                  onClick={() => {
                                    // Ignore the click that ends a drag-scroll.
                                    if (ideaDrag.current.moved) return;
                                    runVT(() => {
                                      setIdea(it.value);
                                      // Carry the picked design into the layout
                                      // step (Q9), the quote, and the wizard.
                                      setLogoPreview(it.src);
                                      setLogoName(it.label);
                                      setLogoStatus('ready');
                                      try {
                                        sessionStorage.setItem(
                                          'cb:quiz:logo',
                                          JSON.stringify({
                                            name: it.label,
                                            preview: it.src,
                                          }),
                                        );
                                      } catch {
                                        /* storage blocked — preview still works */
                                      }
                                    });
                                  }}
                                  aria-pressed={on}
                                  aria-label={it.label}
                                  className={`group relative aspect-square w-64 shrink-0 snap-start overflow-hidden bg-mint outline-none transition duration-150 focus:outline-none ${
                                    on
                                      ? 'ring-2 ring-inset ring-brand-500'
                                      : 'hover:ring-1 hover:ring-inset hover:ring-black/15'
                                  }`}
                                >
                                  <img
                                    src={it.src}
                                    alt={it.label}
                                    loading="lazy"
                                    draggable={false}
                                    referrerPolicy="no-referrer"
                                    className="pointer-events-none h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                  />
                                  {/* Selected: a small, quiet check in the corner. */}
                                  {on ? (
                                    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white shadow-sm">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                            </div>
                            {/* Prev / next carousel controls */}
                            <button
                              type="button"
                              aria-label="Previous ideas"
                              onClick={() => scrollIdeas(-1)}
                              className="absolute left-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-ink shadow-md transition hover:bg-white"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m15 18-6-6 6-6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label="More ideas"
                              onClick={() => scrollIdeas(1)}
                              className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-ink shadow-md transition hover:bg-white"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m9 18 6-6-6-6" />
                              </svg>
                            </button>
                          </div>
                          <p className="mt-3 text-xs text-muted">
                            Just a starting direction — you&apos;ll refine it in
                            the designer. (Placeholder gallery — real design ideas
                            coming soon.)
                          </p>
                          <StepFooter onBack={back} onContinue={next} />
                        </>
                      ) : null}

                      {/* 9 — Email (collect-only, keeps its button) */}
                      {step === 9 ? (
                        <>
                          <QuestionHead
                            step={qPos}
                            title="Where should we send it?"
                            sub="We'll send your recommendation and a design link straight to you."
                          />
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                              Email
                            </span>
                            <input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitEmail();
                              }}
                              placeholder="name@company.com"
                              aria-invalid={Boolean(emailError)}
                              className="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-ink transition focus:border-brand-500 focus:outline-none"
                            />
                            {emailError ? (
                              <span className="mt-1.5 block text-sm text-red-600">
                                {emailError}
                              </span>
                            ) : null}
                          </label>
                          <div className="mt-5 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={back}
                              className="btn btn-outline px-6"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={submitEmail}
                              className="btn btn-dark px-8 text-base"
                            >
                              Reveal my match
                            </button>
                          </div>
                          <p className="mt-3 text-center text-xs text-muted">
                            No spam — just your recommendation. Unsubscribe
                            anytime.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Live preview (right on desktop, top on mobile). Hidden on the
                      Idea Center step, which spans the full width instead. */}
                  {step !== IDEA_STEP ? (
                  <div
                    className={`order-1 flex justify-center md:order-2 ${
                      step === CONFIRM_STEP
                        ? 'items-stretch'
                        : 'items-start p-6 md:p-8'
                    }`}
                  >
                    {step === 7 && intent !== 'help' ? (
                      // Design-status upload — only for "ready"/"layout" (they have
                      // a file). "help" has no design yet → show the preview.
                      <QuizUpload
                        preview={logoPreview}
                        name={logoName}
                        status={logoStatus}
                        error={logoError}
                        invalid={logoAttempted && !logoPreview}
                        onFile={onLogoFile}
                        onRemove={onLogoRemove}
                      />
                    ) : step === CONFIRM_STEP ? (
                      // Artwork review — the WHOLE design, centred (no crop).
                      <div className="flex h-full min-h-[380px] w-full items-center justify-center bg-mint p-6">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt={logoName || 'Your artwork'}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : null}
                      </div>
                    ) : (
                      <PreviewPanel
                        shape={shape}
                        color={color}
                        size={size}
                        print={print}
                        printLabel={printLabel}
                        sample={USE_CASE_IMAGE[useCase]}
                        showSample={
                          step !== 2 && step !== 3 && step !== IDEA_STEP
                        }
                        sizeVisual={step === 4}
                        printVisual={step === 6}
                        // Show the composed design (bandana + layout + artwork) on
                        // the layout step AND the final email step, so every path
                        // ends on a preview of what they'll get. Solid has no design
                        // → it keeps the plain blank preview.
                        layoutVisual={
                          step === 8 || (step === 9 && print !== 'solid')
                        }
                        layout={layout}
                        logoPreview={logoPreview}
                      />
                    )}
                  </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live preview panel — real sample photo (or recoloured preview)             */
/* -------------------------------------------------------------------------- */

function PreviewPanel({
  shape,
  color,
  size,
  print,
  printLabel,
  sample,
  showSample,
  sizeVisual,
  printVisual,
  layoutVisual,
  layout,
  logoPreview,
}: {
  shape: Shape;
  color: string;
  size: string;
  print: Print;
  printLabel: string;
  sample?: string;
  // Show the real sample photo when we have one — except on the shape/colour
  // steps, where the recoloured preview must reflect the live choice.
  showSample: boolean;
  // On the size step, show the dimensioned SVG (to-scale shape + inch labels).
  sizeVisual: boolean;
  // On the print step, show the schematic SVG for the chosen print option
  // (single side / double-sided / solid colour).
  printVisual: boolean;
  // On the layout step, render the bandana with the chosen pattern so the
  // arrangement is visible (using the uploaded logo, or a placeholder).
  layoutVisual: boolean;
  layout: string;
  logoPreview: string | null;
}) {
  const pattern = patternsFor(shape).find((p) => p.value === layout);
  // Which face the print-step preview is showing. Double-sided lets the shopper
  // toggle Front/Back right inside the image (the back is the design mirrored),
  // mirroring the wizard's in-preview flip control. Reset to front when the
  // print option changes so single-side never lands on a hidden "back".
  const [face, setFace] = useState<'front' | 'back'>('front');
  useEffect(() => {
    setFace('front');
  }, [print]);
  return (
    <div className="relative aspect-square w-full">
      {sizeVisual ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <SizeGlyph
            shape={shape}
            size={size}
            color={color}
            className="h-full w-full"
          />
        </div>
      ) : printVisual ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {print !== 'solid' ? (
            // Single / double print → the "your design here" mock (square or
            // triangle template). Double-sided adds an in-image Front/Back toggle
            // (like the wizard); the back is the same design mirrored.
            <div className="relative aspect-square h-full">
              {print === 'double' ? (
                <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-white/90 p-0.5 shadow">
                  {(['front', 'back'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={face === s}
                      onClick={() => setFace(s)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
                        face === s ? 'bg-ink text-white' : 'text-ink/70'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              {shape === 'Triangle' ? (
                <TriangleDesignHere
                  color={color}
                  className={`h-full w-full ${
                    print === 'double' && face === 'back' ? '-scale-x-100' : ''
                  }`}
                />
              ) : (
                <DesignHerePlaceholder
                  color={color}
                  size={size}
                  className={`h-full w-full ${
                    print === 'double' && face === 'back' ? '-scale-x-100' : ''
                  }`}
                />
              )}
            </div>
          ) : (
            <PrintGlyph
              shape={shape}
              color={color}
              print={print}
              className="h-full w-full"
            />
          )}
        </div>
      ) : layoutVisual ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="aspect-square h-full">
            <BandanaPreview
              shape={shape}
              baseColor={color}
              logoPreview={logoPreview}
              marks={pattern?.marks ?? []}
              fullDesign={!!pattern?.full}
              seamless={!!pattern?.seamless}
              logoRotate={0}
              logoScale={100}
              compact
            />
          </div>
        </div>
      ) : sample && showSample ? (
        <img
          src={sample}
          alt={`Sample ${shape.toLowerCase()} bandana`}
          draggable={false}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="aspect-square h-full">
            <BandanaPreview
              shape={shape}
              baseColor={color}
              logoPreview={null}
              marks={[]}
              fullDesign={false}
              logoRotate={0}
              logoScale={100}
              blank={print === 'solid'}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Result reveal — the product recommendation (no price)                      */
/* -------------------------------------------------------------------------- */

function ResultCard({
  useCase,
  useCaseOther,
  intent,
  idea,
  shape,
  color,
  size,
  qty,
  onQty,
  print,
  printLabel,
  layout,
  email,
  designHref,
  calcHref,
  logoPreview,
  logoName,
  onRestart,
}: {
  useCase: string;
  useCaseOther: string;
  intent: string;
  idea: string;
  shape: Shape;
  color: string;
  size: string;
  qty: number;
  onQty: (n: number) => void;
  print: Print;
  printLabel: string;
  layout: string;
  email: string;
  designHref: string;
  calcHref: string;
  logoPreview: string | null;
  logoName: string;
  onRestart: () => void;
}) {
  const colorName =
    COLORS.find((c) => c.hex.toLowerCase() === color.toLowerCase())?.name ??
    'Custom colour';
  const useCaseLabel =
    useCase === 'other'
      ? useCaseOther.trim() || 'Other'
      : (USE_CASES.find((u) => u.value === useCase)?.label ?? 'Custom');
  const intentLabel =
    DESIGN_INTENTS.find((i) => i.value === intent)?.label ?? '';

  // Estimated pricing — same engine/tiers as the calculator (USD).
  const cc = 'USD';
  const unit = unitPriceFor(qty, size, shape);
  const total = unit * qty;
  const next = nextTier(qty, size, shape);

  // Volume ladder (same source as the calculator/estimator) so a shopper can
  // change their mind on quantity right here — tapping a tier updates the quote.
  const tiers = tiersFor(size, shape);
  const base = tiers[0]?.each ?? 0; // 1–11 compare-at (not sold; MOQ is 12)
  const sellable = tiers.filter((t) => t.min >= MIN_QTY); // 12+ order tiers
  const activeTier =
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1];
  const discFor = (each: number) =>
    base > 0 ? Math.round(((base - each) / base) * 100) : 0;

  // Itemized spec — the quote's line items (every answer from the quiz).
  const rows = [
    {label: 'For', value: useCaseLabel},
    {label: 'Style', value: `${shape} bandana`},
    // Colour is skipped on the full-design ("ready") pathway — the artwork
    // covers the whole bandana, so no fabric colour is chosen.
    ...(intent === 'ready' && print !== 'solid'
      ? []
      : [
          {
            label: 'Colour',
            value: (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{backgroundColor: color}}
                />
                {colorName}
              </span>
            ),
          },
        ]),
    {label: 'Size', value: `${size} in`},
    {label: 'Print', value: printLabel},
    // Layout is only chosen on the layout/help pathways (not ready, not solid).
    ...(print !== 'solid' && intent !== 'ready'
      ? [
          {
            label: 'Layout',
            value:
              patternsFor(shape).find((p) => p.value === layout)?.label ??
              layout,
          },
        ]
      : []),
    {label: 'Quantity', value: `${qty.toLocaleString()} pcs`},
    // Design status (artwork ready / needs help) — only when there's a print.
    ...(print !== 'solid' && intentLabel
      ? [{label: 'Design status', value: intentLabel}]
      : []),
    // Idea Center pick (help pathway, when they haven't uploaded their own).
    ...(idea && !logoPreview
      ? [
          {
            label: 'Design idea',
            value: IDEAS.find((i) => i.value === idea)?.label ?? idea,
          },
        ]
      : []),
    ...(logoPreview
      ? [
          {
            label: 'Design',
            value: (
              <span className="inline-flex items-center gap-2">
                <img
                  src={logoPreview}
                  alt={logoName || 'Your design'}
                  className="h-8 w-8 shrink-0 rounded border border-black/10 bg-mint object-contain"
                />
                <span className="max-w-[10rem] truncate">
                  {logoName || 'Uploaded'}
                </span>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="qz-pop overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)]">
      {/* Quote header */}
      <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-mint/60 px-6 py-5 md:px-8">
        <div>
          <span className="eyebrow text-brand-700">Your instant quote</span>
          <h2 className="mt-1 text-xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-2xl">
            {shape} Bandana
          </h2>
        </div>
        <div className="w-16 shrink-0 md:w-20">
          <BandanaPreview
            shape={shape}
            baseColor={color}
            logoPreview={null}
            marks={[]}
            fullDesign={false}
            logoRotate={0}
            logoScale={100}
            blank={print === 'solid'}
            compact
          />
        </div>
      </div>

      <div className="px-6 py-5 md:px-8">
        {/* Line items */}
        <dl className="divide-y divide-black/[0.06]">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <dt className="text-sm text-muted">{r.label}</dt>
              <dd className="text-right text-sm font-semibold text-ink">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Change your mind on quantity? Tap a tier — buy more, save more. Same
            volume ladder as the calculator; updates the quote live. Shown ABOVE
            the total so the shopper picks a tier, then sees the resulting price. */}
        <div className="mt-5" role="radiogroup" aria-label="Change quantity tier">
          <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <span>Volume</span>
            <span>Price / piece</span>
          </div>
          <div className="max-h-56 divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/10">
            {sellable.map((t) => {
              const on = t === activeTier;
              const d = discFor(t.each);
              return (
                <button
                  key={t.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onQty(Math.max(MIN_QTY, t.min))}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                    on
                      ? 'bg-mint font-bold text-ink ring-1 ring-inset ring-brand-500'
                      : 'bg-white text-ink hover:bg-black/[0.03]'
                  }`}
                >
                  <span className="tabular-nums">{t.label}</span>
                  <span className="flex items-center gap-2.5">
                    {d > 0 ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          on ? 'bg-red-600 text-white' : 'bg-red-600/10 text-red-600'
                        }`}
                      >
                        −{d}%
                      </span>
                    ) : null}
                    <span className="w-16 text-right font-bold tabular-nums">
                      {money(t.each, cc)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimated pricing — reflects the selected tier above. */}
        <div className="mt-5 rounded-2xl bg-mint/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Unit price</span>
            <span className="font-semibold tabular-nums text-ink">
              {money(unit, cc)}
              <span className="font-normal text-muted">/pc</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-muted">Quantity</span>
            <span className="font-semibold tabular-nums text-ink">
              × {qty.toLocaleString('en-US')}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
            <span className="text-sm font-bold uppercase tracking-wide text-ink">
              Estimated total
            </span>
            <span className="text-2xl font-extrabold tabular-nums text-ink">
              {money(total, cc)}
            </span>
          </div>
          {next ? (
            <p className="mt-1 text-right text-xs text-muted">
              Order {next.min.toLocaleString('en-US')}+ to drop to{' '}
              {money(next.each, cc)}/pc
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          Estimate only · no setup or artwork fees · final price confirmed at
          checkout.
        </p>

        <Link to={designHref} className="btn btn-dark mt-4 w-full text-base">
          Refine your layout and complete order
        </Link>

        {email ? (
          <p className="mt-4 text-center text-xs text-muted">
            We&apos;ll send this quote to{' '}
            <span className="font-semibold text-ink">{email}</span>.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onRestart}
          className="mx-auto mt-4 block text-sm font-semibold text-muted transition hover:text-ink"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Size glyph — the bandana in its colour with a technical inch-dimension look */
/* -------------------------------------------------------------------------- */

function SizeGlyph({
  shape,
  size,
  color,
  className = 'h-full w-full',
}: {
  shape: Shape;
  size: string;
  color: string;
  className?: string;
}) {
  const nums = size.split(/x/i).map((t) => parseInt(t.trim(), 10));
  const isTri = shape === 'Triangle';
  // Inner safe-area dashes sit on the fabric colour, so contrast with it.
  const hex = color.replace('#', '');
  const rr = parseInt(hex.slice(0, 2), 16) || 0;
  const gg = parseInt(hex.slice(2, 4), 16) || 0;
  const bb = parseInt(hex.slice(4, 6), 16) || 0;
  const darkFill = (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255 < 0.62;
  const INSET = darkFill ? 'rgba(255,255,255,0.5)' : 'rgba(16,20,16,0.28)';
  const GUIDE = 'rgba(16,20,16,0.55)'; // dimension lines/arrows (on white)
  const EDGE = 'rgba(16,20,16,0.22)'; // fabric edge
  const dim = {
    fontSize: 6,
    fontWeight: 700,
    fill: '#101410',
    fontFamily: 'inherit',
  } as const;

  // The square is scaled by the real size (14" small … 27" large) so a bigger
  // bandana visibly draws bigger. Centred, with room for dims on left + bottom.
  const scaleLeg = Math.min(Math.max(nums[0], 14), 27);
  // Proportional to the real side length so 14" draws visibly smaller than 27"
  // (14 → ~20, 18 → ~26, 22 → ~32, 27 → ~39). Leaves room for the triangle's
  // third (hypotenuse) dimension line.
  const targetHalf = scaleLeg * 1.44;
  // Smoothly tween the drawing between sizes when the shopper switches.
  const [half, setHalf] = useState(targetHalf);
  const halfRef = useRef(targetHalf);
  useEffect(() => {
    halfRef.current = half;
  });
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setHalf(targetHalf);
      return;
    }
    let raf = 0;
    const from = halfRef.current;
    const start = performance.now();
    const dur = 280;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setHalf(from + (targetHalf - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetHalf]);
  const cx = 52;
  const cy = 48;
  const L = cx - half;
  const R = cx + half;
  const T = cy - half;
  const B = cy + half;
  const Xd = L - 5; // left dimension line — close to the edge
  const Yd = B + 5; // bottom dimension line — close to the edge
  const cxm = cx;
  const cym = cy;
  const EXT = {
    stroke: GUIDE,
    strokeWidth: 0.5,
    strokeDasharray: '0.4 1.8',
    strokeLinecap: 'round',
  } as const;
  const DOT = {
    stroke: GUIDE,
    strokeWidth: 0.8,
    strokeDasharray: '0.4 1.9',
    strokeLinecap: 'round',
  } as const;

  // Vertical dimension on the left; the number sits inline, breaking the line.
  const leftDim = (label: string) => {
    const gap = label.length * 1.9;
    return (
      <>
        <line x1={L - 1.5} y1={T} x2={Xd - 3} y2={T} {...EXT} />
        <line x1={L - 1.5} y1={B} x2={Xd - 3} y2={B} {...EXT} />
        <line x1={Xd} y1={T} x2={Xd} y2={cym - gap} {...DOT} />
        <line x1={Xd} y1={cym + gap} x2={Xd} y2={B} {...DOT} />
        <polygon points={`${Xd},${T} ${Xd - 1.7},${T + 3.4} ${Xd + 1.7},${T + 3.4}`} fill={GUIDE} />
        <polygon points={`${Xd},${B} ${Xd - 1.7},${B - 3.4} ${Xd + 1.7},${B - 3.4}`} fill={GUIDE} />
        <text
          x={Xd}
          y={cym}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90 ${Xd} ${cym})`}
          {...dim}
        >
          {label}
        </text>
      </>
    );
  };
  // Horizontal dimension on the bottom; the number sits inline on the line.
  const bottomDim = (label: string) => {
    const gap = label.length * 1.9;
    return (
      <>
        <line x1={L} y1={B + 1.5} x2={L} y2={Yd + 3} {...EXT} />
        <line x1={R} y1={B + 1.5} x2={R} y2={Yd + 3} {...EXT} />
        <line x1={L} y1={Yd} x2={cxm - gap} y2={Yd} {...DOT} />
        <line x1={cxm + gap} y1={Yd} x2={R} y2={Yd} {...DOT} />
        <polygon points={`${L},${Yd} ${L + 3.4},${Yd - 1.7} ${L + 3.4},${Yd + 1.7}`} fill={GUIDE} />
        <polygon points={`${R},${Yd} ${R - 3.4},${Yd - 1.7} ${R - 3.4},${Yd + 1.7}`} fill={GUIDE} />
        <text x={cxm} y={Yd} textAnchor="middle" dominantBaseline="central" {...dim}>
          {label}
        </text>
      </>
    );
  };
  // Hypotenuse dimension — the SAME element (extension lines, dotted line,
  // arrowheads, inline label) as the legs, but parallel to the slope.
  const hypDim = (label: string) => {
    const s = Math.SQRT1_2; // 45° unit component
    const off = s * 7; // dim line offset out from the hyp
    const e0 = s * 1.5;
    const e1 = s * 9; // extension line start/end
    const Ax = R;
    const Ay = B; // bottom-right hyp end
    const Bx = L;
    const By = T; // top-left hyp end
    const dA = [Ax + off, Ay - off];
    const dB = [Bx + off, By - off];
    const mx = (dA[0] + dB[0]) / 2;
    const my = (dA[1] + dB[1]) / 2;
    const g = s * (label.length * 1.9); // label gap along the line
    const aL = s * 3.4;
    const aW = s * 1.7;
    return (
      <>
        <line x1={Ax + e0} y1={Ay - e0} x2={Ax + e1} y2={Ay - e1} {...EXT} />
        <line x1={Bx + e0} y1={By - e0} x2={Bx + e1} y2={By - e1} {...EXT} />
        <line x1={dA[0]} y1={dA[1]} x2={mx + g} y2={my + g} {...DOT} />
        <line x1={mx - g} y1={my - g} x2={dB[0]} y2={dB[1]} {...DOT} />
        <polygon
          points={`${dA[0]},${dA[1]} ${dA[0] - aL + aW},${dA[1] - aL - aW} ${dA[0] - aL - aW},${dA[1] - aL + aW}`}
          fill={GUIDE}
        />
        <polygon
          points={`${dB[0]},${dB[1]} ${dB[0] + aL + aW},${dB[1] + aL - aW} ${dB[0] + aL - aW},${dB[1] + aL + aW}`}
          fill={GUIDE}
        />
        <text
          x={mx}
          y={my}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(45 ${mx} ${my})`}
          {...dim}
        >
          {label}
        </text>
      </>
    );
  };

  if (isTri) {
    const leg = nums[0];
    const hyp = nums[1];
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className={className}
        role="img"
        aria-label={`${size} inches`}
      >
        <polygon
          points={`${L},${B} ${R},${B} ${L},${T}`}
          fill={color}
          stroke={EDGE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {leftDim(`${leg} in`)}
        {bottomDim(`${leg} in`)}
        {hypDim(`${hyp} in`)}
      </svg>
    );
  }

  const w = nums[0];
  const h = nums[1] ?? nums[0];
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`${size} inches`}
    >
      <rect x={L} y={T} width={R - L} height={B - T} fill={color} stroke={EDGE} strokeWidth="1" />
      <rect
        x={L + 4}
        y={T + 4}
        width={R - L - 8}
        height={B - T - 8}
        fill="none"
        stroke={INSET}
        strokeWidth="0.6"
        strokeDasharray="2.5 2"
      />
      {leftDim(`${h} in`)}
      {bottomDim(`${w} in`)}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Artwork uploader — replaces the preview on the design step. Captures a file, */
/* shows a thumbnail, hosts it on the CDN, and reports status up.               */
/* -------------------------------------------------------------------------- */

function QuizUpload({
  preview,
  name,
  status,
  error,
  invalid = false,
  onFile,
  onRemove,
}: {
  preview: string | null;
  name: string;
  status: 'idle' | 'ready' | 'error';
  error: string;
  // Failed a Continue without an upload → paint the dashed border red.
  invalid?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const pick = () => inputRef.current?.click();

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />

      {preview ? (
        <div className="w-full rounded-2xl border border-black/10 bg-paper p-4">
          <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-mint">
            <img
              src={preview}
              alt={name || 'Your artwork'}
              className="max-h-full max-w-full object-contain"
            />
            {/* Controls reveal on hover / keyboard focus, centred on the image. */}
            <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-ink/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={pick}
                className="rounded-full bg-white px-5 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-white/90"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove artwork"
                title="Remove"
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-sm transition hover:bg-white/90 hover:text-red-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {name}
            </span>
            {status === 'ready' ? (
              <span className="shrink-0 text-xs font-semibold text-brand-700">
                Added ✓
              </span>
            ) : null}
          </div>
          {status === 'error' ? (
            <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
          ) : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={pick}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={`flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              drag
                ? 'border-brand-500 bg-mint'
                : invalid
                  ? 'border-red-500 hover:border-red-500 hover:bg-red-50/40'
                  : 'border-black/15 hover:border-brand-500 hover:bg-mint/40'
            }`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-brand-700">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </span>
            <span className="text-base font-bold text-ink">
              Upload your logo or design
            </span>
            <span className="text-sm text-muted">
              Click to browse or drag &amp; drop
            </span>
            <span className="text-xs text-muted">
              PNG, JPG, WEBP or GIF · up to 10MB
            </span>
          </button>
          {status === 'error' ? (
            <p className="mt-2 text-center text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Print-option glyph — a schematic SVG that previews the chosen print style:  */
/* single side (one face printed), double-sided (front + back), solid colour   */
/* (fabric only, no print). Same visual language as SizeGlyph.                 */
/* -------------------------------------------------------------------------- */

function PrintGlyph({
  shape,
  color,
  print,
  className = 'h-full w-full',
}: {
  shape: Shape;
  color: string;
  print: Print;
  className?: string;
}) {
  const isTri = shape === 'Triangle';

  // Contrast for the dotted print grid + crease: ink on a light fabric, white on
  // a dark one (relative-luminance test).
  const hex = color.replace('#', '');
  const rr = parseInt(hex.slice(0, 2), 16) || 0;
  const gg = parseInt(hex.slice(2, 4), 16) || 0;
  const bb = parseInt(hex.slice(4, 6), 16) || 0;
  const dark = (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255 < 0.6;
  // The dotted SQUARE grid IS the print — a faint graph-paper lattice of dotted
  // lines shown on the fabric for single/double, and carried onto the folded
  // reverse face for double-sided. Hidden for solid (no print).
  const GRID = dark ? 'rgba(255,255,255,0.5)' : 'rgba(16,20,16,0.32)';
  const CREASE = dark ? 'rgba(255,255,255,0.55)' : 'rgba(16,20,16,0.4)';

  // Geometry — one large centred bandana (fills most of the frame).
  const s = 76;
  const cx = 50;
  const cy = 50;
  const half = s / 2;
  const L = cx - half;
  const R = cx + half;
  const T = cy - half;
  const B = cy + half;
  const isDouble = print === 'double';
  const isSolid = print === 'solid';
  const hasPrint = print !== 'solid';
  // Solid gets just a TINY turned-up corner; double-sided folds a bigger ear to
  // reveal the printed back. Single side stays flat (no fold).
  const hasFold = isDouble || isSolid;
  const foldFrac = isSolid ? 0.24 : 0.44;

  type Pt = {x: number; y: number};
  const toStr = (pts: Pt[]) =>
    pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  // Fabric corners (clockwise) + the corner we fold (bottom-right for both).
  const poly: Pt[] = isTri
    ? [
        {x: L, y: B},
        {x: R, y: B},
        {x: L, y: T},
      ]
    : [
        {x: L, y: T},
        {x: R, y: T},
        {x: R, y: B},
        {x: L, y: B},
      ];
  const foldIdx = isTri ? 1 : 2;

  // Build the dog-ear: cut the corner off the front, draw that corner triangle
  // as the reverse face. `along` walks `d` from the corner toward a neighbour.
  const along = (a: Pt, b: Pt, d: number): Pt => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return {x: a.x + (dx / len) * d, y: a.y + (dy / len) * d};
  };
  const n = poly.length;
  const C = poly[foldIdx];
  const P1 = along(C, poly[(foldIdx - 1 + n) % n], s * foldFrac);
  const P2 = along(C, poly[(foldIdx + 1) % n], s * foldFrac);
  const frontPts = [...poly.slice(0, foldIdx), P1, P2, ...poly.slice(foldIdx + 1)];
  // Reflect the corner across the crease so the flap folds INWARD — a turned-up
  // puppy ear. Its lighter tone reads as the fabric's reverse (not a shadow).
  const reflect = (q: Pt, a: Pt, b: Pt): Pt => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy);
    return {x: 2 * (a.x + t * dx) - q.x, y: 2 * (a.y + t * dy) - q.y};
  };
  const Cr = reflect(C, P1, P2);
  // The revealed reverse face is shown in RED so it clearly reads as the back.
  const back = '#d50032';
  // Solid fold: the turned-up corner shows the fabric's reverse — the SAME base
  // colour lifted toward white ("a little snow") so it reads as a fold, not print.
  const mix = (c: number, t: number) => Math.round(c + (255 - c) * t);
  const snow = `rgb(${mix(rr, 0.22)}, ${mix(gg, 0.22)}, ${mix(bb, 0.22)})`;

  // The front face, filled with the fabric colour. A folded corner (solid or
  // double) cuts the corner off; single side stays a full square.
  const frontShape = (fill: string) =>
    !hasFold && !isTri ? (
      <rect x={L} y={T} width={s} height={s} fill={fill} />
    ) : (
      <polygon points={toStr(hasFold ? frontPts : poly)} fill={fill} />
    );

  // A faint dotted SQUARE grid across the fabric's bounding box (the print).
  // Drawn once and clipped to whichever face it sits on; the shared coordinates
  // keep the grid continuous between the front and the folded reverse.
  const gridLines = () => {
    const cells = 8;
    const step = (R - L) / cells;
    const lines: JSX.Element[] = [];
    for (let i = 0; i <= cells; i++) {
      const x = L + i * step;
      const y = T + i * step;
      lines.push(<line key={`v${i}`} x1={x} y1={T} x2={x} y2={B} />);
      lines.push(<line key={`h${i}`} x1={L} y1={y} x2={R} y2={y} />);
    }
    return lines;
  };
  const gridProps = {
    stroke: GRID,
    strokeWidth: 0.4,
    strokeDasharray: '0.5 1.6',
    strokeLinecap: 'round',
  } as const;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={
        print === 'single'
          ? 'Single side print preview'
          : print === 'double'
            ? 'Double-sided print preview'
            : 'Solid colour, no print'
      }
    >
      <defs>
        <clipPath id="cbFront">{frontShape('#000')}</clipPath>
        {isDouble ? (
          <clipPath id="cbFold">
            <polygon points={toStr([P1, Cr, P2])} />
          </clipPath>
        ) : null}
      </defs>

      {/* front fabric + the dotted square grid clipped to it */}
      {frontShape(color)}
      {hasPrint ? (
        <g clipPath="url(#cbFront)" {...gridProps}>
          {gridLines()}
        </g>
      ) : null}

      {/* double-sided: the corner folds over into a puppy ear — the revealed
          reverse face (lighter) also carries the dotted print grid. */}
      {isDouble ? (
        <g>
          <polygon points={toStr([P1, Cr, P2])} fill={back} />
          <g clipPath="url(#cbFold)" {...gridProps} stroke="rgba(255,255,255,0.6)">
            {gridLines()}
          </g>
          <line x1={P1.x} y1={P1.y} x2={P2.x} y2={P2.y} stroke={CREASE} strokeWidth="0.9" />
        </g>
      ) : null}

      {/* solid: a tiny turned-up puppy ear in a slightly lighter ("snow") shade
          of the same fabric colour — dimension without any print. */}
      {isSolid ? (
        <g>
          <polygon points={toStr([P1, Cr, P2])} fill={snow} />
          <line x1={P1.x} y1={P1.y} x2={P2.x} y2={P2.y} stroke={CREASE} strokeWidth="0.7" />
        </g>
      ) : null}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Small building blocks (local to the quiz)                                  */
/* -------------------------------------------------------------------------- */

function QuestionHead({
  step,
  title,
}: {
  step: number;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5">
      <span className="eyebrow text-brand-700">Question {step}</span>
      <h1 className="mt-1.5 text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-3xl">
        {title}
      </h1>
    </div>
  );
}

function OptionCard({
  selected,
  title,
  note,
  onClick,
  row = false,
  disabled = false,
  className = '',
}: {
  selected: boolean;
  title: string;
  note?: string;
  onClick: () => void;
  row?: boolean;
  // Coming-soon options: shown but not selectable (dimmed, "Soon" pill).
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-2xl border px-4 py-3 text-left transition ${className} ${
        row || disabled ? 'flex items-center justify-between gap-3' : ''
      } ${
        disabled
          ? 'cursor-not-allowed border-black/10 bg-black/[0.02] opacity-60'
          : selected
            ? 'border-brand-500 bg-brand-500'
            : 'border-black/12 hover:-translate-y-0.5 hover:border-black/25'
      }`}
    >
      <span>
        <span
          className={`block text-sm font-bold ${
            selected && !disabled ? 'text-white' : 'text-ink'
          }`}
        >
          {title}
        </span>
        {note ? (
          <span
            className={`mt-0.5 block text-xs ${
              selected && !disabled ? 'text-white/85' : 'text-muted'
            }`}
          >
            {note}
          </span>
        ) : null}
      </span>
      {disabled ? (
        <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Soon
        </span>
      ) : null}
    </button>
  );
}

function StepFooter({
  onBack,
  onContinue,
  disabled = false,
  hint,
  label = 'Continue',
}: {
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
  hint?: string;
  label?: string;
}) {
  return (
    <div className="mt-auto pt-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn btn-outline px-6">
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={disabled}
          className="btn btn-dark px-8 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {label}
        </button>
      </div>
      {hint ? (
        <p className="mt-2 text-center text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
