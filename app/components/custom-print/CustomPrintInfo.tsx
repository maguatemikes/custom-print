import {useEffect, useState, type ReactNode} from 'react';
import {useFetcher} from 'react-router';
import {MIN_QTY} from '~/lib/customPrintData';
import {EMPTY_REVIEWS, type JudgemeReviews} from '~/lib/judgeme';

/* On-site "Write a review" form → posts to /api/reviews (server → Judge.me). */
function WriteReview() {
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
        <p className="text-sm font-semibold text-red-600">{fetcher.data.error}</p>
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
function Stars({value, className = 'h-4 w-4'}: {value: number; className?: string}) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-hidden="true">
      {Array.from({length: 5}).map((_, i) => (
        <svg
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
 * Info band shown BELOW the custom-print wizard: a full Description of the
 * service plus a Reviews tab (real Judge.me data via the loader). Self-contained
 * except for the `reviews` prop; does not touch the wizard.
 */
export function CustomPrintInfo() {
  const [tab, setTab] = useState<'about' | 'reviews'>('about');

  // Reviews are fetched lazily (NOT in the route loader) so the two Judge.me API
  // calls never delay the wizard's initial render. Loads once on mount.
  const reviewsFetcher = useFetcher<JudgemeReviews>();
  useEffect(() => {
    reviewsFetcher.load('/api/reviews');
    // load once on mount; fetcher.load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reviewsLoaded = reviewsFetcher.data !== undefined;
  const reviews = reviewsFetcher.data ?? EMPTY_REVIEWS;

  const {overall, total, distribution, reviews: reviewList} = reviews;
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));

  const tabs = [
    {id: 'about' as const, label: 'Description'},
    {id: 'reviews' as const, label: 'Reviews'},
  ];

  const specs: Array<[string, string]> = [
    ['Minimum order', `${MIN_QTY} pieces — no maximum`],
    ['Shapes', 'Square or pre-folded triangle'],
    ['Sizes', '14–35 in finished (custom available)'],
    ['Fabric', 'Cotton or quick-dry polyester'],
    ['Printing', 'Full-colour digital — no setup fees'],
    ['Print options', 'One side, both sides, or seamless'],
    ['Artwork', 'PNG, JPG, SVG or PDF up to 25 MB'],
    ['Turnaround', '~20–30 business days after proof'],
  ];

  const sections: Array<{title: string; body: string; icon: ReactNode}> = [
    {
      title: 'Full-colour digital printing',
      body: 'We print digitally, so there are no colour limits, no screen-printing plates and no setup fees — the price is the same whether your design is one colour or a photograph. Colour is laid down edge to edge for a soft hand-feel and prints that hold up to repeated washing, with gradients, fine detail and small text all reproducing cleanly.',
      icon: (
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7Z" />
      ),
    },
    {
      title: 'Shapes, sizes and fabric',
      body: 'Choose a classic four-sided square or a pre-folded triangle, each offered in a range of finished sizes measured in inches — from compact 14-inch pieces up to oversized 35-inch ones, with matching triangle cuts. Print on soft, breathable cotton for an everyday feel, or quick-dry polyester for the most vivid colour. Need a size that isn’t listed? Enter your own custom dimensions.',
      icon: (
        <>
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <path d="M16.5 3 21 11h-9Z" />
        </>
      ),
    },
    {
      title: 'Print options and layouts',
      body: 'Print on one side, on both sides (the same design front and back, or a different design per face), or keep it a plain solid colour with no print at all. Place a single centred logo, scatter it in a repeating pattern, or run a seamless all-over print with no gaps. Rotate, resize and space your design exactly how you want it and preview it live before you order. No print-ready files? Choose “help me design it” and our creative team lays everything out for you.',
      icon: (
        <>
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </>
      ),
    },
    {
      title: 'Made to order — and proofed first',
      body: 'Because every order is made to order, nothing is printed until you’ve signed off on it. After checkout we send a proof of your exact design — artwork, placement, colours and layout — for your approval. Standard production and delivery runs roughly 20–30 business days after sign-off, with rush options available on request.',
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </>
      ),
    },
    {
      title: 'Bulk and wholesale pricing',
      body: `Orders start at a ${MIN_QTY}-piece minimum with no maximum, and the per-piece price drops automatically as your quantity climbs — the same volume tiers that power our bulk and wholesale pricing. It’s built for teams, schools, events, festivals, brands, promotions and resale, with clear pricing you can see before you buy.`,
      icon: (
        <>
          <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" />
          <path d="M7.5 7.5h.01" />
        </>
      ),
    },
  ];

  return (
    <section className="bg-mint">
      <div className="ui-container py-16 md:py-24">
        {/* Header + segmented tabs (reuses the site's tab pattern) */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow text-brand-700">Custom Printing</span>
            <h2 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
              Custom-printed bandanas, made to order
            </h2>
          </div>
          <div
            role="tablist"
            className="inline-flex shrink-0 gap-1 self-start rounded-full bg-black/[0.06] p-1"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  tab === t.id
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {t.id === 'reviews' && total > 0 ? (
                  <span className="ml-1.5 opacity-70">({total})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Description panel */}
        {tab === 'about' ? (
          <div className="mt-10">
            <p className="max-w-3xl text-lg leading-relaxed text-ink/80">
              Every bandana we make is custom-printed to order — there are no
              pre-made blanks and no minimum-run compromises. You bring the
              artwork (a logo, a full design, a photo, or just an idea) and we
              print it in full, edge-to-edge colour on your choice of fabric,
              shape and base colour. Whether you need a dozen for a small crew
              or several thousand for a national campaign, each piece is produced
              specifically for your order.
            </p>

            {/* Section cards — full width, two columns, equal height */}
            <div className="mt-8 grid items-start gap-4 sm:grid-cols-2">
              {sections.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-black/10 bg-paper p-6"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6 shrink-0 text-brand-700"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {s.icon}
                    </svg>
                    <h3 className="text-base font-bold text-ink">{s.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            {/* At a glance — full-width spec strip */}
            <div className="mt-4 rounded-2xl border border-black/10 bg-paper p-6 md:p-7">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                At a glance
              </h3>
              <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : !reviewsLoaded ? (
          /* Reviews still loading (lazy fetch) — avoids a false "No reviews yet". */
          <div className="mt-10 rounded-3xl border border-black/10 bg-paper p-10 text-center text-sm text-muted md:p-16">
            Loading reviews…
          </div>
        ) : total === 0 ? (
          /* Reviews — empty state + write-review */
          <div className="mt-10">
            <div className="rounded-3xl border border-black/10 bg-paper p-10 text-center md:p-16">
              <div className="flex justify-center">
                <Stars value={0} className="h-6 w-6 text-black/20" />
              </div>
              <p className="mt-5 text-xl font-extrabold uppercase tracking-tight text-ink">
                No reviews yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                Verified customer reviews will appear here once shoppers rate
                their order. Be the first — every custom order is proofed before
                we print.
              </p>
            </div>
            <div className="mx-auto mt-6 max-w-md">
              <WriteReview />
            </div>
          </div>
        ) : (
          /* Reviews — real Judge.me data */
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
                <WriteReview />
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
                          <p className="text-sm font-semibold text-ink">
                            {r.name}
                          </p>
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
        )}
      </div>
    </section>
  );
}
