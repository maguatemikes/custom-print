import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {SelectMenu} from '~/components/SelectMenu';
import {
  tiersFor,
  DEFAULT_SIZE,
  sizesFor,
  MIN_QTY,
  money,
  normalizeSize,
} from '~/lib/customPrintData';

/**
 * Live bulk-pricing calculator on the real tier engine (customPrintData). Shared
 * by the homepage "Bulk & wholesale" band and the standalone /bulk-pricing page —
 * one copy so the numbers can never drift. Renders the grid only (pitch +
 * calculator card); the caller wraps it in its own section/background.
 */
export function PriceEstimator({
  syncUrl = false,
  showHeading = false,
}: {syncUrl?: boolean; showHeading?: boolean} = {}) {
  const [shape, setShape] = useState<'Square' | 'Triangle'>('Square');
  const [size, setSize] = useState(DEFAULT_SIZE.Square);
  // Printed (defaults to single-side print in the wizard) vs No print (solid
  // colour). Feeds the shareable URL and the "Start your order" hand-off.
  const [printed, setPrinted] = useState(true);
  // Quantity is the single source of truth — the stepper/field AND the ladder both
  // write it, and the active tier is derived from it (so the two always agree).
  const [qtyInput, setQtyInput] = useState(String(MIN_QTY));
  const [searchParams, setSearchParams] = useSearchParams();
  const cc = 'USD';

  const sizes = sizesFor(shape);
  const tiers = tiersFor(size, shape);
  const base = tiers[0].each; // 1–11 compare-at (not sold; MOQ is 12)
  const sellable = tiers.slice(1); // 12+ … the real order tiers
  const discFor = (each: number) =>
    base > 0 ? Math.round(((base - each) / base) * 100) : 0;

  const qty = Math.max(MIN_QTY, Math.floor(Number(qtyInput) || 0) || MIN_QTY);
  const active =
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1];
  const unit = active.each;
  const total = unit * qty;
  const saved = (base - unit) * qty;
  const pct = discFor(unit);

  const setQty = (n: number) => setQtyInput(String(Math.max(MIN_QTY, n)));

  // Flip to a valid size for the new shape when the shape toggles.
  function pickShape(next: 'Square' | 'Triangle') {
    setShape(next);
    setSize(DEFAULT_SIZE[next]);
  }

  // --- Shareable estimate (standalone /bandana-calculator page only) ---
  // When `syncUrl` is on, bind shape/size/quantity to the URL so any estimate is
  // a shareable link. Read once on mount so a shared link reproduces the numbers;
  // these are the same params the wizard reads on "Start your order".
  useEffect(() => {
    if (!syncUrl) return;
    const shapeParam = searchParams.get('shape');
    const sizeParam = searchParams.get('size');
    const qtyParam = searchParams.get('qty');
    const nextShape: 'Square' | 'Triangle' =
      shapeParam === 'triangle' ? 'Triangle' : 'Square';
    if (shapeParam === 'square' || shapeParam === 'triangle') {
      setShape(nextShape);
    }
    if (sizeParam) {
      const match = sizesFor(nextShape).find(
        (s) => normalizeSize(s.name) === normalizeSize(sizeParam),
      );
      setSize(match ? match.name : DEFAULT_SIZE[nextShape]);
    } else if (shapeParam) {
      // Shape given without a size → the shape's default size.
      setSize(DEFAULT_SIZE[nextShape]);
    }
    if (qtyParam) {
      const n = Math.floor(Number(qtyParam));
      if (Number.isFinite(n) && n >= MIN_QTY) setQtyInput(String(n));
    }
    const printParam = searchParams.get('print');
    if (printParam === 'solid' || printParam === 'none') setPrinted(false);
    else if (printParam) setPrinted(true); // single / double / printed → printed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the current estimate into the URL (replace, no scroll reset), so the
  // page is always a shareable link. Debounced so typing a quantity doesn't spam
  // history; size is written cleanly (22x22, not 22+x+22).
  useEffect(() => {
    if (!syncUrl) return;
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          prev.set('shape', shape.toLowerCase());
          prev.set('size', size.replace(/\s+/g, ''));
          prev.set('qty', String(qty));
          // Printed maps to the wizard's single-side default; No print → solid.
          prev.set('print', printed ? 'single' : 'solid');
          return prev;
        },
        {replace: true, preventScrollReset: true},
      );
    }, 200);
    return () => clearTimeout(t);
  }, [syncUrl, shape, size, qty, printed, setSearchParams]);

  const perks = [
    'No setup, plate, or artwork fees',
    'Free digital proof before we print',
    'Made to order — your design, your sizes',
  ];

  return (
    <div
      className={
        showHeading
          ? 'mx-auto w-full max-w-xl'
          : 'grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16'
      }
    >
      {/* Pitch — homepage bulk band only; hidden on the standalone calculator
          page, where the card is centred on its own. */}
      {!showHeading ? (
        <div className="max-w-lg">
        <span className="eyebrow text-brand-700">Bulk &amp; wholesale</span>
        <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
          Buy more, save more
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          The per-piece price drops automatically as your quantity climbs — the
          same volume tiers behind our bulk and wholesale pricing. Built for
          teams, schools, events, festivals, and resellers.
        </p>
        <ul className="mt-7 space-y-3">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-brand-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-sm font-medium text-ink">{p}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3">
          <p className="text-sm leading-relaxed text-muted">
            <span className="font-semibold text-ink">
              Want a more complex layout?
            </span>{' '}
            Our design team can build it for you — available for an additional
            fee.
          </p>
        </div>
      </div>
      ) : null}

      {/* Calculator card */}
      <div className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)] md:p-8">
        {showHeading ? (
          // Real page h1 + a dynamic h2 that names the exact product the shopper
          // is pricing (shape + size + the default 100% cotton material). Good
          // for SEO and orientation; only on the standalone calculator page.
          <div className="mb-5">
            <h1 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink md:text-3xl">
              Custom Print Bandanas
            </h1>
            <h2 className="mt-0.5 text-base font-semibold text-brand-700 md:text-lg">
              Solid {shape} Bandana · {size} in · 100% Cotton · Price Estimator
            </h2>
          </div>
        ) : (
          <p className="text-lg font-extrabold uppercase tracking-tight text-ink">
            Instant price estimate
          </p>
        )}

        {/* Shape | Print — two columns */}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Shape
            </span>
            <SelectMenu
              ariaLabel="Shape"
              value={shape}
              onChange={(v) => {
                if (v === 'Square' || v === 'Triangle') pickShape(v);
              }}
              options={[
                {value: 'Square', label: 'Square solid color bandana'},
                {value: 'Triangle', label: 'Triangle solid color bandana'},
                {
                  value: 'Rectangle',
                  label: 'Rectangle solid color bandana',
                  meta: 'Coming soon',
                  disabled: true,
                },
                {
                  value: 'Fabric roll',
                  label: 'Fabric roll',
                  meta: 'Coming soon',
                  disabled: true,
                },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Print
            </span>
            <SelectMenu
              ariaLabel="Print option"
              value={printed ? 'printed' : 'none'}
              onChange={(v) => setPrinted(v !== 'none')}
              options={[
                {value: 'printed', label: 'Printed — your design'},
                {value: 'none', label: 'No print — solid colour'},
              ]}
            />
          </div>
        </div>

        {/* Size | Quantity — two columns */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Size (inches)
            </span>
            <SelectMenu
              ariaLabel="Size (inches)"
              value={size}
              onChange={setSize}
              options={sizes.map((s) => ({value: s.name, label: s.name}))}
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Quantity
            </span>
            <div className="flex h-11 items-center gap-1 rounded-lg border border-black/15 px-1.5 focus-within:border-brand-500">
              <button
                type="button"
                onClick={() => setQty(qty - 1)}
                disabled={qty <= MIN_QTY}
                aria-label="Decrease quantity"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_QTY}
                step={1}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={() => setQtyInput(String(qty))}
                aria-label="Quantity"
                className="m-0 h-full w-full min-w-0 border-0 bg-transparent px-2 py-0 text-center text-sm font-semibold leading-none text-ink tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                aria-label="Increase quantity"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </label>
        </div>

        {/* Volume tiers — full width; click a break to jump */}
        <div className="mt-4" role="radiogroup" aria-label="Quantity tier">
          <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <span>Volume</span>
            <span>Price / piece</span>
          </div>
          <div className="max-h-56 divide-y divide-black/5 overflow-y-auto rounded-lg border border-black/10">
            {sellable.map((t) => {
              const on = t.min === active.min;
              const d = discFor(t.each);
              return (
                <button
                  key={t.min}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setQty(t.min)}
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
                          on
                            ? 'bg-red-600 text-white'
                            : 'bg-red-600/10 text-red-600'
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

        {/* Price — full width */}
        <div className="mt-5 rounded-xl bg-mint px-5 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-brand-700">Your price</p>
              <p className="mt-1 text-5xl font-extrabold leading-none tracking-tight text-ink tabular-nums">
                {money(unit, cc)}
                <span className="ml-1 text-lg font-semibold text-muted">
                  /pc
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {qty.toLocaleString()} pcs total
              </p>
              <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
                {money(total, cc)}
              </p>
            </div>
          </div>
          {pct > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-3 text-sm">
              <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                Save {pct}%
              </span>
              <span className="text-muted">
                vs {money(base, cc)}/pc ·{' '}
                <span className="font-semibold text-red-600">
                  {money(saved, cc)} off
                </span>
              </span>
            </div>
          ) : null}
        </div>

        <Link
          to={`/custom-print/${shape.toLowerCase()}?size=${encodeURIComponent(
            size.replace(/\s+/g, ''),
          )}&qty=${qty}&print=${printed ? 'single' : 'solid'}&start=1`}
          className="btn mt-5 w-full bg-orange-500 text-white transition-colors hover:bg-orange-600"
        >
          Start your order
        </Link>
      </div>
    </div>
  );
}
