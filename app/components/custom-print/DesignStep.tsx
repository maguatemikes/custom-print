import {useRef} from 'react';
import type React from 'react';
import {PATTERNS, INTENTS} from '~/lib/customPrintData';
import {downscaleDataUrl} from '~/lib/customPrintProof';
import {Field, NudgeRow} from './primitives';
import {PatternThumb} from './PatternThumb';

export type LogoFile = {
  name: string;
  type: string;
  size: number;
  preview: string | null;
  dataUrl: string | null;
};

export function DesignStep({
  intent,
  setIntent,
  designNote,
  setDesignNote,
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
  designNote: string;
  setDesignNote: (v: string) => void;
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
    reader.onload = async () => {
      const dataUrl =
        typeof reader.result === 'string' ? reader.result : null;
      // Downscale ONLY the on-screen/proof preview (raster images) so the wizard
      // never renders a full-res (up to 25MB) image — that was the source of the
      // mobile lag/OOM when scaling, rotating, or tiling. The ORIGINAL `dataUrl`
      // is kept for the print upload, so print quality is unchanged. SVG stays
      // vector (renders crisp, tiny file); PDF has no on-screen preview.
      const isRaster =
        file.type === 'image/png' || file.type === 'image/jpeg';
      const preview =
        dataUrl && file.type.startsWith('image/')
          ? isRaster
            ? // ~800px is plenty for the ~400px preview + 600px proof; JPEG
              // output for photos keeps the in-memory string small.
              await downscaleDataUrl(
                dataUrl,
                800,
                file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
              )
            : dataUrl
          : null;
      setLogo({
        name: file.name,
        type: file.type,
        size: file.size,
        preview,
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
        hint={
          intent === 'help'
            ? "Optional — we'll design it for you. PNG, JPG, SVG or PDF."
            : 'Required to print — PNG, JPG, SVG or PDF. We proof it before printing.'
        }
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

      {/* Design brief — shown when the shopper wants any help. Optional, but
          prompted so our team starts with direction. Attached to the order. */}
      {intent !== 'ready' ? (
        <Field
          n={bothSides ? 5 : 4}
          title="Tell us about your design"
          hint="Your idea, colours, any text or slogan, and the occasion — the more detail, the better our team can help."
        >
          <textarea
            value={designNote}
            onChange={(e) => setDesignNote(e.target.value)}
            rows={4}
            placeholder="e.g. A vintage badge for our hiking club — forest green &amp; cream, with the text “Trailblazers · Est. 2019”. For a summer trip."
            aria-label="Design brief"
            className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm leading-relaxed focus:border-brand-500 focus:outline-none"
          />
        </Field>
      ) : null}

      {/* Conversion nudge — reassures shoppers who don't have finished artwork:
          free help, same-day start, risk-free (proof before print). */}
      <div className="rounded-2xl border border-brand-700/15 bg-mint p-5">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-brand-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12 2.5 2.5 4.5-5" />
          </svg>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink">
            Free design help — we start today
          </h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          No finished artwork? No problem. Place your order and our creative team
          gets to work the same day — we&apos;ll email a link (also shown on your
          order confirmation) to share files, talk through ideas, and book a quick
          call. Nothing is printed until you approve your proof, so there&apos;s
          zero risk.
        </p>
      </div>
    </div>
  );
}
