import {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {Link, useSearchParams} from 'react-router';
import type {Route} from './+types/bandana-quiz';
import {BandanaPreview} from '~/components/custom-print/BandanaPreview';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {Breadcrumbs, breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {siteOrigin} from '~/lib/seo';
import {
  DEFAULT_SIZE,
  sizesFor,
  normalizeSize,
  MIN_QTY,
  EMAIL_RE,
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

// Palette used ONLY for the intro's cycling hero bandana. The real colour choice
// on step 3 is the full ColorSpectrum picker (any hex).
const INTRO_COLORS = [
  '#e23b3b',
  '#1e6fe0',
  '#37ad57',
  '#7c3aed',
  '#ff8800',
  '#14b8a6',
  '#ec4899',
];

const PRINT_OPTIONS: Array<{value: Print; label: string; note: string}> = [
  {value: 'single', label: 'Full print', note: 'Your design, one side'},
  {value: 'double', label: 'Double-sided', note: 'Print both sides'},
  {value: 'solid', label: 'Solid colour', note: 'No print — colour only'},
];

// Questions shown in the progress bar (intro + result are not counted).
const TOTAL_STEPS = 7;

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
  const [shape, setShape] = useState<Shape>('Square');
  const [color, setColor] = useState('#e23b3b');
  const [size, setSize] = useState(DEFAULT_SIZE.Square);
  const [qty, setQty] = useState(48);
  const [qtyInput, setQtyInput] = useState('48');
  const [print, setPrint] = useState<Print>('single');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // --- Resume: read answers from the URL (shareable) or, if none, from
  // localStorage (survives a refresh / accidental back). Runs once on mount. ---
  const [searchParams, setSearchParams] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const keys = ['step', 'useCase', 'shape', 'color', 'size', 'qty', 'print'];
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
    if (uc && USE_CASES.some((u) => u.value === uc)) setUseCase(uc);

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

    const st = get('step');
    if (st != null) {
      const n = Math.floor(Number(st));
      // A shared URL may deep-link to any step (incl. the result). A localStorage
      // resume only re-enters an in-progress question (1–7) — a finished/at-intro
      // session starts fresh at the intro, with answers still pre-filled.
      if (Number.isFinite(n) && (hasUrl ? n >= 0 && n <= 8 : n >= 1 && n <= 7)) {
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
      shape: shape.toLowerCase(),
      color: color.replace('#', ''),
      size: size.replace(/\s+/g, ''),
      qty: String(qty),
      print,
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
  }, [hydrated, step, useCase, shape, color, size, qty, print, setSearchParams]);

  const sizes = sizesFor(shape);
  const printLabel =
    PRINT_OPTIONS.find((p) => p.value === print)?.label ?? 'Full print';

  // --- Intro: gently cycle the hero bandana through the palette (paused for
  // reduced-motion). Pure eye-candy, resets when the quiz starts. ---
  const [introIdx, setIntroIdx] = useState(0);
  useEffect(() => {
    if (step !== 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setIntroIdx((i) => (i + 1) % INTRO_COLORS.length),
      1400,
    );
    return () => clearInterval(id);
  }, [step]);

  const cleanSize = size.replace(/\s+/g, '');
  const cleanColor = color.replace('#', '');
  const designHref = `/custom-print/${shape.toLowerCase()}?size=${encodeURIComponent(
    cleanSize,
  )}&color=${cleanColor}&qty=${qty}&print=${print}&start=1`;
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
    });
  }

  const back = () => runVT(() => setStep((s) => Math.max(0, s - 1)));
  const next = () => runVT(() => setStep((s) => s + 1));

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
        <div className="ui-container flex justify-center pb-16 pt-6 md:pb-24 md:pt-8">
          {/* Intro + result are centred and narrow; the question steps use the
              wide single-card configurator (question left, live preview right). */}
          {step === 0 || step === 8 ? (
            <div className="w-full max-w-xl">
              {step === 0 ? (
                <div className="qz-step rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)] md:p-8">
                  <div className="qz-float mx-auto mb-5 w-40 md:w-48">
                    <BandanaPreview
                      shape="Square"
                      baseColor={INTRO_COLORS[introIdx]}
                      logoPreview={null}
                      marks={[]}
                      fullDesign={false}
                      logoRotate={0}
                      logoScale={100}
                      blank
                      compact
                    />
                  </div>
                  <span className="eyebrow text-brand-700">
                    60-second quiz · 7 questions
                  </span>
                  <h1 className="mt-3 text-3xl font-extrabold uppercase leading-[1.03] tracking-tight text-ink md:text-5xl">
                    Find your perfect
                    <br />
                    bandana
                  </h1>
                  <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">
                    A few quick taps and we&apos;ll reveal the bandana we&apos;d
                    make just for you — built for teams, events, brands and
                    resellers.
                  </p>
                  <button
                    type="button"
                    onClick={next}
                    className="btn btn-dark mt-7 w-full text-base sm:w-auto sm:px-12"
                  >
                    Take the quiz →
                  </button>
                  <p className="mt-4 text-xs font-medium text-muted">
                    Trusted by 100,000+ · No setup or artwork fees
                  </p>
                </div>
              ) : (
                <ResultCard
                  shape={shape}
                  color={color}
                  size={size}
                  qty={qty}
                  print={print}
                  printLabel={printLabel}
                  email={email}
                  designHref={designHref}
                  calcHref={calcHref}
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
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={back}
                    className="text-sm font-semibold text-muted transition hover:text-ink"
                  >
                    Back
                  </button>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700 tabular-nums">
                    {step} / {TOTAL_STEPS}
                  </span>
                </div>
                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuenow={step}
                  aria-valuemin={0}
                  aria-valuemax={TOTAL_STEPS}
                  aria-label="Quiz progress"
                >
                  {Array.from({length: TOTAL_STEPS}).map((_, i) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i < step ? 'bg-brand-500' : 'bg-mint-deep'
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
                <div className="grid md:h-[600px] md:grid-cols-2">
                  {/* Question (left on desktop, below preview on mobile) — a
                      square; content at top, Continue pinned bottom-left. */}
                  <div className="order-2 flex flex-col p-6 md:order-1 md:p-8">
                    <div key={step} className="qz-step flex flex-1 flex-col">
                      {/* 1 — Use case */}
                      {step === 1 ? (
                        <>
                          <QuestionHead
                            step={1}
                            title="Who are these for?"
                            sub="Tap the closest fit — we'll tailor the rest."
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {USE_CASES.map((u) => (
                              <OptionCard
                                key={u.value}
                                selected={useCase === u.value}
                                title={u.label}
                                note={u.note}
                                onClick={() =>
                                  runVT(() => {
                                    setUseCase(u.value);
                                    setQty(u.qty);
                                    setQtyInput(String(u.qty));
                                  })
                                }
                              />
                            ))}
                          </div>
                          <StepFooter
                            onContinue={next}
                            disabled={!useCase}
                            hint={!useCase ? 'Pick one to continue' : undefined}
                          />
                        </>
                      ) : null}

                      {/* 2 — Shape */}
                      {step === 2 ? (
                        <>
                          <QuestionHead
                            step={2}
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
                          </div>
                          <StepFooter onContinue={next} />
                        </>
                      ) : null}

                      {/* 3 — Colour (full spectrum, so it keeps a Continue) */}
                      {step === 3 ? (
                        <>
                          <QuestionHead
                            step={3}
                            title="What's your colour?"
                            sub="Any colour you like — the preview updates as you pick."
                          />
                          <ColorSpectrum value={color} onChange={setColor} />
                          <StepFooter onContinue={next} />
                        </>
                      ) : null}

                      {/* 4 — Size */}
                      {step === 4 ? (
                        <>
                          <QuestionHead
                            step={4}
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
                          <StepFooter onContinue={next} />
                        </>
                      ) : null}

                      {/* 5 — Quantity (free input, no prices) */}
                      {step === 5 ? (
                        <>
                          <QuestionHead
                            step={5}
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
                          <StepFooter onContinue={next} />
                        </>
                      ) : null}

                      {/* 6 — Print style */}
                      {step === 6 ? (
                        <>
                          <QuestionHead
                            step={6}
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
                          <StepFooter onContinue={next} label="Almost there" />
                        </>
                      ) : null}

                      {/* 7 — Email (collect-only, keeps its button) */}
                      {step === 7 ? (
                        <>
                          <QuestionHead
                            step={7}
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
                          <button
                            type="button"
                            onClick={submitEmail}
                            className="btn btn-dark mt-5 w-full text-base"
                          >
                            Reveal my match →
                          </button>
                          <p className="mt-3 text-center text-xs text-muted">
                            No spam — just your recommendation. Unsubscribe
                            anytime.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Live preview (right on desktop, top on mobile) — a 1:1
                      square, centred, with the indicators floating inside it.
                      Same background as the question side, no divider — clean. */}
                  <div className="order-1 flex items-start justify-center p-6 md:order-2 md:p-8">
                    <PreviewPanel
                      shape={shape}
                      color={color}
                      size={size}
                      print={print}
                      printLabel={printLabel}
                      sample={USE_CASE_IMAGE[useCase]}
                      showSample={step !== 2 && step !== 3}
                      sizeVisual={step === 4}
                    />
                  </div>
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
}) {
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
  shape,
  color,
  size,
  qty,
  print,
  printLabel,
  email,
  designHref,
  calcHref,
  onRestart,
}: {
  shape: Shape;
  color: string;
  size: string;
  qty: number;
  print: Print;
  printLabel: string;
  email: string;
  designHref: string;
  calcHref: string;
  onRestart: () => void;
}) {
  return (
    <div className="qz-pop rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)] md:p-8">
      <span className="eyebrow text-brand-700">Your perfect match</span>
      <h2 className="mt-2 text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-3xl">
        Your {shape} Bandana
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Based on your answers, here&apos;s the bandana we&apos;d make for you.
      </p>

      <div className="mx-auto mt-5 w-44">
        <div className="qz-float">
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

      {/* Spec chips — the recommendation, no price numbers. */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-sm font-bold text-brand-700">
          <span
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{backgroundColor: color}}
          />
          Colour
        </span>
        {[`${shape}`, `${size} in`, printLabel, `${qty.toLocaleString()} pcs`].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full bg-mint px-3.5 py-1.5 text-sm font-bold text-brand-700"
            >
              {chip}
            </span>
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {['Free digital proof', 'No setup fees', 'Made to order'].map((b) => (
          <span
            key={b}
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-muted"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-2.5">
        <Link to={designHref} className="btn btn-dark w-full text-base">
          Design yours now →
        </Link>
        <Link to={calcHref} className="btn btn-outline w-full">
          See my price →
        </Link>
      </div>

      {email ? (
        <p className="mt-4 text-xs text-muted">
          We&apos;ll send it to{' '}
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
  const targetHalf = 40 + ((scaleLeg - 14) / 13) * 3; // 40 … 43 (scales by size)
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
  const cy = 46;
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
        <text x={64} y={36} textAnchor="middle" transform="rotate(-45 64 36)" {...dim}>
          {`${hyp} in`}
        </text>
        {leftDim(`${leg} in`)}
        {bottomDim(`${leg} in`)}
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
/* Small building blocks (local to the quiz)                                  */
/* -------------------------------------------------------------------------- */

function QuestionHead({
  step,
  title,
  sub,
}: {
  step: number;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-5">
      <span className="eyebrow text-brand-700">Question {step}</span>
      <h1 className="mt-1.5 text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

function OptionCard({
  selected,
  title,
  note,
  onClick,
  row = false,
}: {
  selected: boolean;
  title: string;
  note?: string;
  onClick: () => void;
  row?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border p-4 text-left transition ${
        row ? 'flex items-center justify-between gap-3' : ''
      } ${
        selected
          ? 'border-brand-500 bg-mint ring-2 ring-brand-500'
          : 'border-black/12 hover:-translate-y-0.5 hover:border-black/25'
      }`}
    >
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        {note ? (
          <span className="mt-0.5 block text-xs text-muted">{note}</span>
        ) : null}
      </span>
    </button>
  );
}

function StepFooter({
  onContinue,
  disabled = false,
  hint,
  label = 'Continue',
}: {
  onContinue: () => void;
  disabled?: boolean;
  hint?: string;
  label?: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-start gap-3 pt-6">
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="btn btn-dark px-8 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label} →
      </button>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}
