import {useState, type ReactNode} from 'react';
import {MIN_QTY} from '~/lib/customPrintData';
import {ReviewsPanel, useProductReviews} from '~/components/ReviewsPanel';

/**
 * Info band shown BELOW the custom-print wizard: a full Description of the
 * service plus a Reviews tab (real Judge.me data via the loader). Self-contained
 * except for the `reviews` prop; does not touch the wizard.
 */
export function CustomPrintInfo({productHandle}: {productHandle: string}) {
  const [tab, setTab] = useState<'about' | 'reviews'>('about');

  // Reviews (Judge.me) via the SHARED hook — the same one the PDP uses — so the
  // wizard and the PDP render the identical ReviewsPanel. Per product (handle).
  const {reviews, loaded} = useProductReviews(productHandle);
  const {total} = reviews;

  const tabs = [
    {id: 'about' as const, label: 'Description'},
    {id: 'reviews' as const, label: 'Reviews'},
  ];

  const specs: Array<[string, string]> = [
    ['Minimum order', `${MIN_QTY} pieces — no maximum`],
    ['Shapes', 'Square or pre-folded triangle'],
    ['Sizes', '14–27 in finished'],
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
      body: 'Choose a classic four-sided square or a pre-folded triangle, each offered in a range of finished sizes measured in inches — from compact 14-inch pieces up to roomy 27-inch ones, with matching triangle cuts. Print on soft, breathable cotton for an everyday feel, or quick-dry polyester for the most vivid colour.',
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
        ) : (
          <ReviewsPanel
            productHandle={productHandle}
            reviews={reviews}
            loaded={loaded}
          />
        )}
      </div>
    </section>
  );
}
