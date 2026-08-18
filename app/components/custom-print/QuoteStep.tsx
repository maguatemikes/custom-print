import type React from 'react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {money} from '~/lib/customPrintData';

export function QuoteStep({
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
              aria-busy="true"
              className="btn w-full min-h-11 cursor-wait items-center justify-center gap-2 bg-orange-500/60 text-white"
            >
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
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
