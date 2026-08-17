import {useState, type ReactNode} from 'react';
import {MIN_QTY} from '~/lib/customPrintData';

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
 * service plus a Reviews tab. Self-contained — owns its own active-tab state,
 * takes no props, and does not touch the wizard.
 */
export function CustomPrintInfo() {
  const [tab, setTab] = useState<'about' | 'reviews'>('about');

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

  // Each section carries a relevant icon (inner SVG paths — the <svg> wrapper
  // with shared stroke settings lives in the card, no background on the icon).
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

  /* -------------------------------------------------------------------------
   * MOCK REVIEW DATA — placeholder for the UI only. Do NOT ship to customers as
   * genuine reviews. Replace with a real source (reviews app / metafield) before
   * this goes live.
   * ---------------------------------------------------------------------- */
  const reviewOverall = 4.8;
  const reviewTotal = 128;
  const reviewDist = [
    {stars: 5, count: 96},
    {stars: 4, count: 22},
    {stars: 3, count: 7},
    {stars: 2, count: 2},
    {stars: 1, count: 1},
  ];
  const reviewCats = [
    {label: 'Print quality', score: 4.9},
    {label: 'Value for money', score: 4.7},
    {label: 'Delivery time', score: 4.5},
    {label: 'Customer service', score: 4.8},
  ];
  const reviews = [
    {
      name: 'Alexander R.',
      when: '2 months ago',
      score: 5,
      text: 'Easy ordering and great value — cotton bandanas came out crisp and the colours were spot on. Proof landed the next day. Perfect for our team merch.',
      photos: 3,
    },
    {
      name: 'Emma C.',
      when: '3 months ago',
      score: 4,
      text: 'Effortless process and unbeatable price. Ordered 200 for an event; the seamless print held up beautifully after washing. Would order again.',
      photos: 0,
    },
    {
      name: 'Marcus D.',
      when: '5 months ago',
      score: 5,
      text: 'Uploaded our logo, picked a base colour, done. The double-sided print looked exactly like the proof. Fast turnaround for a bulk run.',
      photos: 2,
    },
  ];
  const maxDist = Math.max(...reviewDist.map((d) => d.count));

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
              </button>
            ))}
          </div>
        </div>

        {/* Description panel — full width, equal-height cards with relevant icons */}
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
            <div className="mt-8 grid gap-4 md:grid-cols-2">
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
        ) : (
          /* Reviews panel — MOCK data (see note above). */
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
            {/* Summary */}
            <div>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-extrabold leading-none text-ink">
                  {reviewOverall.toFixed(1)}
                </span>
                <div className="pb-1">
                  <Stars value={reviewOverall} />
                  <p className="mt-1 text-xs text-muted">
                    {reviewTotal} ratings
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {reviewDist.map((d) => (
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

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {reviewCats.map((c) => (
                  <div key={c.label} className="flex items-center gap-2.5">
                    <span className="grid h-7 min-w-[2.5rem] place-items-center rounded-md bg-mint-deep px-1.5 text-xs font-bold text-brand-700">
                      {c.score.toFixed(1)}
                    </span>
                    <span className="text-sm text-ink">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review cards */}
            <div className="space-y-4">
              {reviews.map((r) => {
                const initials = r.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2);
                return (
                  <div
                    key={r.name}
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
                          <p className="text-xs text-muted">{r.when}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Stars value={r.score} className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold text-ink">
                          {r.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {r.text}
                    </p>
                    {r.photos > 0 ? (
                      <div className="mt-3 flex gap-2">
                        {Array.from({length: r.photos}).map((_, i) => (
                          <span
                            key={i}
                            className="h-14 w-14 rounded-lg bg-gradient-to-br from-mint-deep to-mint ring-1 ring-inset ring-black/5"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                Read all reviews →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
