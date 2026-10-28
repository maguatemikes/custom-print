import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {urlWithTrackingParams, type PredictiveSearchReturn} from '~/lib/search';

type Items = PredictiveSearchReturn['result']['items'];

/**
 * Branded predictive-search flyout content. Purely presentational — the caller
 * (the header `SearchPill`) owns the fetcher, the panel wrapper, and visibility.
 *
 * Mutually-exclusive nav paths: a product/collection row links STRAIGHT to the
 * item; suggestion rows + the "View all" CTA go to /search via `onSelectQuery`.
 * Suggestion/CTA buttons use `onMouseDown` preventDefault so the click lands
 * before the input blurs and closes the flyout.
 */
export function PredictiveResults({
  items,
  total,
  term,
  loading,
  onClose,
  onSelectQuery,
}: {
  items: Items;
  total: number;
  term: string;
  loading: boolean;
  onClose: () => void;
  onSelectQuery: (text: string) => void;
}) {
  const queries = items.queries.slice(0, 5);
  const products = items.products.slice(0, 5);
  const collections = items.collections.slice(0, 3);

  if (total === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted">
        {loading ? 'Searching…' : `No results for “${term}”`}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {queries.length > 0 ? (
        <Section label="Suggestions">
          <ul>
            {queries.map((q) => (
              <li key={q.text}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectQuery(q.text)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-mint"
                >
                  <Glyph />
                  <span className="truncate">{q.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {products.length > 0 ? (
        <Section label="Products">
          <ul className="space-y-0.5">
            {products.map((p) => {
              const v = p.selectedOrFirstAvailableVariant;
              const url = urlWithTrackingParams({
                baseUrl: `/products/${p.handle}`,
                trackingParams: p.trackingParameters,
                term,
              });
              return (
                <li key={p.id}>
                  <Link
                    to={url}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-mint"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-mint">
                      {v?.image ? (
                        <Image
                          data={v.image}
                          aspectRatio="1/1"
                          sizes="44px"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {p.title}
                    </span>
                    {v?.price ? (
                      <Money
                        data={v.price}
                        className="shrink-0 text-sm font-semibold text-brand-700"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {collections.length > 0 ? (
        <Section label="Collections">
          <ul className="space-y-0.5">
            {collections.map((c) => {
              const url = urlWithTrackingParams({
                baseUrl: `/collections/${c.handle}`,
                trackingParams: c.trackingParameters,
                term,
              });
              return (
                <li key={c.id}>
                  <Link
                    to={url}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-mint"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-mint">
                      {c.image ? (
                        <Image
                          data={c.image}
                          aspectRatio="1/1"
                          sizes="36px"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="truncate text-sm text-ink">{c.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <div className="border-t border-black/5 p-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelectQuery(term)}
          className="btn btn-dark w-full justify-center text-sm"
        >
          View all results for “{term}”
        </button>
      </div>
    </div>
  );
}

function Section({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="p-2">
      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Glyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
