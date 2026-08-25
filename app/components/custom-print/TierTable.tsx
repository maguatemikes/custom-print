import {useRef} from 'react';
import type React from 'react';
import {tiersFor, MIN_QTY, money} from '~/lib/customPrintData';

/**
 * "Buy more, save more" tier table — row labels (Qty / Discount / Price-each)
 * + horizontally drag-scrollable tier columns. The band containing the current
 * quantity is highlighted; tapping a band sets the quantity to its start. The
 * price sheet is shape-specific (square vs triangle).
 */
export function TierTable({
  qty,
  setQty,
  currencyCode,
  shape,
  size,
}: {
  qty: number;
  setQty: (v: number) => void;
  currencyCode: string;
  shape: string;
  size: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({down: false, moved: false, startX: 0, scrollLeft: 0});
  const tiers = tiersFor(size, shape);
  // Discounts are shown off the 1–11 base (tiers[0]); that band is hidden below
  // by the `min >= MIN_QTY` filter, so it never appears as a buyable tier.
  const anchor = tiers[0]?.each ?? 0;
  // The band the current quantity falls into — found within THIS same `tiers`
  // array so the reference-equality highlight below matches (tierFor() would
  // return an element of a freshly-generated array and never be ===).
  const active =
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1];

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
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-black/10">
      {/* Main header — shape-specific price sheet. Real text (not CSS content)
          so "Square/Triangle Bandana" is crawlable for SEO. */}
      <div className="flex items-center justify-center gap-1.5 border-b border-black/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink">
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="currentColor"
          aria-hidden="true"
        >
          {shape === 'Triangle' ? (
            <path d="M12 4 20 20 4 20Z" />
          ) : (
            <rect x="4" y="4" width="16" height="16" rx="2" />
          )}
        </svg>
        {shape} Bandana tiered price
      </div>
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
          {tiers.filter((t) => t.min >= MIN_QTY).map((t) => {
            const isActive = t === active;
            // Discount off the 12-qty (top-of-sheet) price.
            const pct = anchor > t.each ? Math.round((1 - t.each / anchor) * 100) : 0;
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
                    isActive ? 'text-white/80' : 'text-red-600'
                  }`}
                >
                  {pct > 0 ? `${pct}%` : '—'}
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
    </div>
  );
}
