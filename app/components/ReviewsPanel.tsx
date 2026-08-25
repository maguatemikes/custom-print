import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {EMPTY_REVIEWS, type JudgemeReviews} from '~/lib/judgeme';

/* -------------------------------------------------------------------------- */
/* Shared reviews UI — used by BOTH the custom-print wizard (CustomPrintInfo)  */
/* and the PDP (ProductInfo) so the two never drift apart.                     */
/* -------------------------------------------------------------------------- */

/**
 * Lazily fetch a product's Judge.me reviews (client-side, never blocks render).
 * Returns the reviews (EMPTY until loaded) + a loaded flag. The parent uses
 * `reviews.total` for the tab count and passes `reviews`/`loaded` to ReviewsPanel.
 */
export function useProductReviews(productHandle: string) {
  const fetcher = useFetcher<JudgemeReviews>();
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void fetcher.load(
      `/api/reviews?handle=${encodeURIComponent(productHandle)}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productHandle]);
  return {reviews: fetcher.data ?? EMPTY_REVIEWS, loaded: fetcher.data !== undefined};
}

/* On-site "Write a review" form → posts to /api/reviews (server → Judge.me).
   `productHandle` attaches the review to this product. */
export function WriteReview({productHandle}: {productHandle: string}) {
  const fetcher = useFetcher<{ok?: boolean; error?: string}>();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const submitting = fetcher.state !== 'idle';

  if (fetcher.data?.ok) {
    return (
      <div className="rounded-2xl border border-brand-700/20 bg-mint p-5 text-sm">
        <span className="font-semibold text-brand-700">
          Thanks for your review!
        </span>{' '}
        <span className="text-muted">It’ll appear here once it’s approved.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-2xl border border-black/10 bg-mint p-5">
        <h3 className="text-base font-extrabold uppercase tracking-tight text-ink">
          Share your experience
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Ordered from us? Leave a review to help other shoppers.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-dark mt-4 min-h-11 w-full"
        >
          Write a review
        </button>
      </div>
    );
  }

  const input =
    'h-11 w-full rounded-xl border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <div className="rounded-2xl border border-black/10 bg-paper p-5">
      <h3 className="mb-4 text-base font-extrabold uppercase tracking-tight text-ink">
        Write a review
      </h3>
      <fetcher.Form
        method="post"
        action="/api/reviews"
        className="space-y-3 text-left"
      >
        <input type="hidden" name="handle" value={productHandle} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Your rating</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
                className={n <= rating ? 'text-amber-400' : 'text-black/20'}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2 15 8.5 22 9.3l-5 4.6L18.5 21 12 17.5 5.5 21 7 13.9l-5-4.6 7-.8Z" />
                </svg>
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
        </div>
        <input name="name" required placeholder="Your name" className={input} />
        <input
          name="email"
          type="email"
          required
          placeholder="Your email (not published)"
          className={input}
        />
        <input name="title" placeholder="Title (optional)" className={input} />
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Tell others about your bandanas — print quality, colours, delivery…"
          className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none"
        />
        {fetcher.data?.error ? (
          <p className="text-sm font-semibold text-red-600">
            {fetcher.data.error}
          </p>
        ) : null}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || rating < 1}
            className="btn btn-dark min-h-11 flex-1 disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

/* Row of 5 stars, filled up to `value` (amber). Decorative — aria-hidden. */
export function Stars({
  value,
  className = 'h-4 w-4',
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-hidden="true">
      {Array.from({length: 5}).map((_, i) => (
        <svg
          // Fixed 5-star row — never reordered, so the index is a stable key.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          viewBox="0 0 24 24"
          className={className}
          fill={i < Math.round(value) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d="M12 2 15 8.5 22 9.3l-5 4.6L18.5 21 12 17.5 5.5 21 7 13.9l-5-4.6 7-.8Z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * The reviews content itself (drop into a tab body): loading, a two-column
 * empty state (30% write-a-review · 70% panel), or the summary + review list.
 */
export function ReviewsPanel({
  productHandle,
  reviews,
  loaded,
}: {
  productHandle: string;
  reviews: JudgemeReviews;
  loaded: boolean;
}) {
  const {overall, total, distribution, reviews: reviewList} = reviews;
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));

  if (!loaded) {
    return (
      <div className="mt-10 rounded-3xl border border-black/10 bg-paper p-10 text-center text-sm text-muted md:p-16">
        Loading reviews…
      </div>
    );
  }

  if (total === 0) {
    // Two columns: 30% write-a-review · 70% empty-state panel — equal height.
    return (
      <div className="mt-10 grid gap-6 lg:grid-cols-[3fr_7fr] lg:items-stretch lg:gap-10">
        {/* Stretch the write-review card to the column height + centre its body */}
        <div className="lg:h-full lg:[&>div]:flex lg:[&>div]:h-full lg:[&>div]:flex-col lg:[&>div]:justify-center">
          <WriteReview productHandle={productHandle} />
        </div>
        <div className="grid place-content-center rounded-3xl border border-black/10 bg-paper p-10 text-center md:p-16">
          <div className="flex justify-center">
            <Stars value={0} className="h-6 w-6 text-black/20" />
          </div>
          <p className="mt-5 text-xl font-extrabold uppercase tracking-tight text-ink">
            No reviews yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Be the first to review — verified reviews appear here once shoppers
            rate their order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start lg:gap-14">
      {/* Summary + sticky write-review */}
      <div className="lg:sticky lg:top-24">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-extrabold leading-none text-ink">
            {overall.toFixed(1)}
          </span>
          <div className="pb-1">
            <Stars value={overall} />
            <p className="mt-1 text-xs text-muted">
              {total} review{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right font-semibold text-ink">
                {d.stars}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{width: `${(d.count / maxDist) * 100}%`}}
                />
              </span>
              <span className="w-6 text-right text-muted">{d.count}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <WriteReview productHandle={productHandle} />
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {reviewList.map((r) => {
          const initials =
            r.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '★';
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-black/10 bg-paper p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint-deep text-sm font-bold text-brand-700">
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.name}</p>
                    {r.when ? (
                      <p className="text-xs text-muted">{r.when}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stars value={r.score} className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold text-ink">
                    {r.score.toFixed(1)}
                  </span>
                </div>
              </div>
              {r.body ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {r.body}
                </p>
              ) : null}
              {r.photos.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-inset ring-black/5"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
