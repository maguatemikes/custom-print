import {useEffect, useRef, useState} from 'react';
import {
  useLocation,
  useNavigate,
  useNavigation,
  useSearchParams,
} from 'react-router';

/** A facet returned by the Storefront API (`productFilters` / `filters`). */
export type Facet = {
  id: string;
  label: string;
  type: string; // 'LIST' | 'PRICE_RANGE' | 'BOOLEAN'
  values: Array<{
    id: string;
    label: string;
    count: number;
    input: string; // JSON string, e.g. {"available":true}
  }>;
};

/**
 * True while a filter/sort/pagination change on the SAME collection page is
 * loading — use it to show a pending state on the product grid. Native React
 * Router (`useNavigation`), no deps.
 */
export function useFilterPending() {
  const navigation = useNavigation();
  const location = useLocation();
  return (
    navigation.state === 'loading' &&
    navigation.location?.pathname === location.pathname
  );
}

/** Shared helpers for reading/writing filter state in the URL. */
function useFilterState() {
  const [committed] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();

  // Optimistic: while a same-page navigation is in flight (a filter/sort click),
  // reflect its PENDING url so checkboxes, sort and chips update the instant
  // they're clicked — instead of waiting for the products to finish loading.
  const pending =
    navigation.location &&
    navigation.location.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : null;
  const searchParams = pending ?? committed;

  const activeInputs = searchParams.getAll('filter');

  function commit(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(searchParams);
    mutate(p);
    // reset pagination whenever filters/sort change
    ['cursor', 'startCursor', 'endCursor', 'direction'].forEach((k) =>
      p.delete(k),
    );
    // Keep our own scroll position (preventScrollReset), then bring the product
    // grid up to the top so the refreshed results are what you land on. Only
    // filter/sort/chip changes go through commit() — pagination doesn't, so
    // "Load more/previous" is left untouched. Smoothness comes from the explicit
    // `behavior: 'smooth'` below (not global CSS); `scroll-mt-*` clears the header.
    navigate(`?${p.toString()}`, {preventScrollReset: true});
    if (typeof document !== 'undefined') {
      document
        .getElementById('collection-results')
        ?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }

  return {searchParams, activeInputs, commit};
}

/* -------------------------------------------------------------------------- */
/* Filter panel (sidebar or drawer body)                                       */
/* -------------------------------------------------------------------------- */
export function CollectionFilters({facets}: {facets: Facet[]}) {
  const {searchParams, activeInputs, commit} = useFilterState();

  const toggle = (input: string) =>
    commit((p) => {
      const current = p.getAll('filter');
      p.delete('filter');
      const next = current.includes(input)
        ? current.filter((c) => c !== input)
        : [...current, input];
      next.forEach((v) => p.append('filter', v));
    });

  const setPrice = (min: string, max: string) =>
    commit((p) => {
      min ? p.set('minPrice', min) : p.delete('minPrice');
      max ? p.set('maxPrice', max) : p.delete('maxPrice');
    });

  return (
    <div className="border-t border-black/10">
      {facets.map((facet) => {
        if (facet.type === 'PRICE_RANGE') {
          const {floor, ceil} = priceBounds(facet);
          return (
            <FilterSection key={facet.id} label="Price">
              <PriceBody
                min={searchParams.get('minPrice') ?? ''}
                max={searchParams.get('maxPrice') ?? ''}
                floor={floor}
                ceil={ceil}
                onApply={setPrice}
              />
            </FilterSection>
          );
        }
        const values = facet.values.filter(
          (v) => v.count > 0 || activeInputs.includes(v.input),
        );
        if (!values.length) return null;
        return (
          <FilterSection key={facet.id} label={facet.label}>
            <FacetValues
              values={values}
              activeInputs={activeInputs}
              onToggle={toggle}
            />
          </FilterSection>
        );
      })}
    </div>
  );
}

// Values shown per facet before the "Show all" toggle. Change this one number
// to tune (or delete FacetValues + revert to a plain list to remove entirely).
const VISIBLE_VALUES = 6;

/**
 * Renders a facet's checkbox values, capped at VISIBLE_VALUES with a
 * "Show all (N)" toggle so long lists (e.g. colours) don't run down the page.
 * Active selections still show above the grid as chips, so nothing hidden here
 * is "lost."
 */
function FacetValues({
  values,
  activeInputs,
  onToggle,
}: {
  values: Facet['values'];
  activeInputs: string[];
  onToggle: (input: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? values : values.slice(0, VISIBLE_VALUES);

  return (
    <div className="space-y-2">
      {shown.map((v) => (
        <label
          key={v.id}
          className="flex cursor-pointer items-center gap-2.5 text-sm"
        >
          <input
            type="checkbox"
            checked={activeInputs.includes(v.input)}
            onChange={() => onToggle(v.input)}
            className="!m-0 h-4 w-4 shrink-0 rounded !border-black/25 accent-brand-600"
          />
          <span className="flex-1 text-ink">{v.label}</span>
          <span className="text-xs text-muted">{v.count}</span>
        </label>
      ))}
      {values.length > VISIBLE_VALUES && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="pt-0.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          {expanded ? 'Show less' : `Show all ${values.length}`}
        </button>
      )}
    </div>
  );
}

/** Collapsible filter group with a +/− toggle (Macy's-style). */
function FilterSection({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group border-b border-black/10"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm font-bold uppercase tracking-wide text-ink">
        {label}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

/** Read the collection's price range (floor/ceil) from the PRICE_RANGE facet's
 *  input JSON, e.g. {"price":{"min":0,"max":250}}. Falls back to a safe range. */
function priceBounds(facet: Facet): {floor: number; ceil: number} {
  try {
    const parsed = JSON.parse(facet.values[0]?.input ?? '{}') as {
      price?: {min?: number; max?: number};
    };
    const p = parsed.price ?? {};
    const floor = Math.max(0, Math.floor(Number(p.min ?? 0)));
    const ceil = Math.ceil(Number(p.max ?? 0));
    return {floor, ceil: ceil > floor ? ceil : floor + 100};
  } catch {
    return {floor: 0, ceil: 100};
  }
}

const clampN = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(Number.isFinite(n) ? n : lo, lo), hi);

// Both handles share these classes: the input itself is a thin, transparent,
// full-width overlay with pointer-events off so only the *thumbs* are grabbable
// (that's what lets two range inputs stack without blocking each other).
const RANGE_THUMB =
  'pointer-events-none absolute inset-x-0 top-1/2 m-0 h-4 w-full -translate-y-1/2 cursor-pointer appearance-none border-0 bg-transparent focus:outline-none ' +
  '[&::-webkit-slider-runnable-track]:border-0 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-brand-200 ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-brand-200';

/**
 * Draggable dual-handle price slider. Purely local while dragging; commits the
 * selection to the URL (via `onApply`) on release — same min/max params the old
 * number inputs used. Dropping a handle to the floor/ceil clears that bound.
 */
function PriceBody({
  min,
  max,
  floor: rawFloor,
  ceil: rawCeil,
  onApply,
}: {
  min: string;
  max: string;
  floor: number;
  ceil: number;
  onApply: (min: string, max: string) => void;
}) {
  // Shopify re-reports the PRICE_RANGE facet as the *currently filtered* range,
  // so applying a price filter shrinks it to the selection — which would rescale
  // the track and snap the handle to the edge ("rubber-band"). Freeze the scale:
  // trust the facet's range only when no price filter is active (that's the true
  // full range, and still updates on collection / other-facet changes); while a
  // price filter is active, keep the last full range.
  const priceActive = Boolean(min || max);
  const boundsRef = useRef({floor: rawFloor, ceil: rawCeil});
  if (!priceActive) boundsRef.current = {floor: rawFloor, ceil: rawCeil};
  const {floor, ceil} = boundsRef.current;

  const [lo, setLo] = useState(() => (min ? clampN(Number(min), floor, ceil) : floor));
  const [hi, setHi] = useState(() => (max ? clampN(Number(max), floor, ceil) : ceil));

  // Re-sync when the URL price changes from outside (e.g. cleared via a chip or
  // "Clear all"), or when the (frozen) bounds change.
  useEffect(() => {
    setLo(min ? clampN(Number(min), floor, ceil) : floor);
    setHi(max ? clampN(Number(max), floor, ceil) : ceil);
  }, [min, max, floor, ceil]);

  const span = Math.max(1, ceil - floor);
  const pctLo = ((lo - floor) / span) * 100;
  const pctHi = ((hi - floor) / span) * 100;

  // A handle sitting on the floor/ceil means "no bound", so we drop that param —
  // keeps the full range equal to no price filter at all.
  const commit = (l: number, h: number) =>
    onApply(l > floor ? String(l) : '', h < ceil ? String(h) : '');

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink tabular-nums">
        <span>${Math.round(lo)}</span>
        <span>
          ${Math.round(hi)}
          {hi >= ceil ? '+' : ''}
        </span>
      </div>

      <div className="relative h-4">
        {/* rail */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/10" />
        {/* selected range fill */}
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          style={{left: `${pctLo}%`, right: `${100 - pctHi}%`}}
        />
        {/* min handle */}
        <input
          type="range"
          min={floor}
          max={ceil}
          value={lo}
          aria-label="Minimum price"
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
          onPointerUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className={`${RANGE_THUMB} z-20`}
        />
        {/* max handle */}
        <input
          type="range"
          min={floor}
          max={ceil}
          value={hi}
          aria-label="Maximum price"
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
          onPointerUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
          className={`${RANGE_THUMB} z-10`}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted tabular-nums">
        <span>${floor}</span>
        <span>${ceil}+</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sort menu                                                                   */
/* -------------------------------------------------------------------------- */
export const SORT_OPTIONS = [
  {value: '', label: 'Featured'},
  {value: 'price-asc', label: 'Price: Low to High'},
  {value: 'price-desc', label: 'Price: High to Low'},
];

export function SortMenu() {
  const {searchParams, commit} = useFilterState();
  const value = searchParams.get('sort') ?? '';
  const current =
    SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2 text-sm">
      <span className="text-muted">Sort</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white py-2 pl-4 pr-3 font-semibold text-ink transition-colors hover:border-black/30 focus:border-brand-500 focus:outline-none"
      >
        <span>{current.label}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort by"
          className="absolute right-0 top-full z-20 mt-2 min-w-[13rem] overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-lg"
        >
          {SORT_OPTIONS.map((o) => {
            const active = o.value === current.value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    commit((p) =>
                      o.value ? p.set('sort', o.value) : p.delete('sort'),
                    );
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    active
                      ? 'bg-mint font-semibold text-ink'
                      : 'text-ink hover:bg-mint'
                  }`}
                >
                  {o.label}
                  {active && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-brand-700"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 13 4 4L19 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Active filter chips + clear all                                             */
/* -------------------------------------------------------------------------- */
export function ActiveFilterChips({facets}: {facets: Facet[]}) {
  const {searchParams, activeInputs, commit} = useFilterState();

  // input JSON string -> human label
  const labelFor = (input: string) => {
    for (const f of facets) {
      const v = f.values.find((val) => val.input === input);
      if (v) return v.label;
    }
    return 'Filter';
  };

  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const hasPrice = !!(minPrice || maxPrice);
  const hasAny = activeInputs.length > 0 || hasPrice;
  if (!hasAny) return null;

  const removeInput = (input: string) =>
    commit((p) => {
      const rest = p.getAll('filter').filter((c) => c !== input);
      p.delete('filter');
      rest.forEach((v) => p.append('filter', v));
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeInputs.map((input) => (
        <Chip key={input} onRemove={() => removeInput(input)}>
          {labelFor(input)}
        </Chip>
      ))}
      {hasPrice && (
        <Chip
          onRemove={() =>
            commit((p) => {
              p.delete('minPrice');
              p.delete('maxPrice');
            })
          }
        >
          {minPrice || '0'} – {maxPrice || '∞'}
        </Chip>
      )}
      <button
        type="button"
        onClick={() =>
          commit((p) => {
            p.delete('filter');
            p.delete('minPrice');
            p.delete('maxPrice');
          })
        }
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-sm font-medium text-ink">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-muted hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}
