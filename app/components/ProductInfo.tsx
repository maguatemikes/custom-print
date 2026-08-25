import {useState} from 'react';
import {useProductReviews, ReviewsPanel} from '~/components/ReviewsPanel';

/**
 * Product info band shown BELOW the PDP — a tabbed Description / Reviews section
 * (mirrors the custom-print wizard's info block). The Description tab renders the
 * product's own HTML; the Reviews tab is the SHARED ReviewsPanel (same component
 * the wizard uses), so both stay in sync.
 */
export function ProductInfo({
  productHandle,
  descriptionHtml,
}: {
  productHandle: string;
  descriptionHtml: string;
}) {
  const [tab, setTab] = useState<'about' | 'reviews'>('about');
  const {reviews, loaded} = useProductReviews(productHandle);
  const total = reviews.total;

  const tabs = [
    {id: 'about' as const, label: 'Description'},
    {id: 'reviews' as const, label: 'Reviews'},
  ];

  return (
    <section className="bg-mint">
      <div className="ui-container py-16 md:py-24">
        {/* Header + segmented tabs (same pattern as the wizard) */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow text-brand-700">Overview</span>
            <h2 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
              Product details
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

        {tab === 'about' ? (
          descriptionHtml ? (
            <div
              className="prose mt-10 max-w-3xl text-base leading-relaxed text-ink/80 [&_a]:text-brand-700 [&_a]:underline"
              dangerouslySetInnerHTML={{__html: descriptionHtml}}
            />
          ) : (
            <p className="mt-10 max-w-3xl text-base leading-relaxed text-muted">
              No description available for this product yet.
            </p>
          )
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
