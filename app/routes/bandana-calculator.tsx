import type {Route} from './+types/bandana-calculator';
import {PriceEstimator} from '~/components/PriceEstimator';
import {CurveCarousel} from '~/components/CurveCarousel';
import {BandanaPreview} from '~/components/custom-print/BandanaPreview';
import {patternsFor} from '~/lib/customPrintData';
import {Breadcrumbs, breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {siteOrigin} from '~/lib/seo';

const CRUMBS = [{label: 'Home', href: '/'}, {label: 'Bandana Calculator'}];

// Sample bandanas for the showcase carousel — one per layout, on varied colours
// and both shapes, rendered with the REAL wizard preview (BandanaPreview) so the
// layouts are shown exactly as they print. Placeholder artwork ("your design")
// is the product's own layout guide — swap in real design images when supplied.
const LAYOUT_SAMPLES: Array<{
  shape: 'Square' | 'Triangle';
  base: string;
  layout: string;
  label: string;
  image?: string; // real hosted proof — shown as-is instead of the preview
}> = [
  {
    shape: 'Square',
    base: '#e23b3b',
    layout: 'full',
    label: 'Full print',
    image:
      'https://media.wholesaleforeveryone.com/design-front-903af529-70b.png',
  },
  {
    shape: 'Square',
    base: '#1e90ff',
    layout: 'seamless',
    label: 'Seamless',
    image:
      'https://media.wholesaleforeveryone.com/design-front-4598946a-e12.png',
  },
  {shape: 'Triangle', base: '#101418', layout: 'tri-corners', label: 'Corners'},
  {shape: 'Square', base: '#37ad57', layout: 'four', label: 'Repeat'},
  {shape: 'Triangle', base: '#7c3aed', layout: 'tri-full', label: 'Full print'},
  {shape: 'Square', base: '#ff8800', layout: 'diagonal', label: 'Diagonal'},
  {shape: 'Triangle', base: '#14b8a6', layout: 'tri-seamless', label: 'Seamless'},
  {shape: 'Square', base: '#ec4899', layout: 'five', label: 'Repeat'},
];

const LAYOUT_CARDS = LAYOUT_SAMPLES.map((s) => {
  const patterns = patternsFor(s.shape);
  const p = patterns.find((x) => x.value === s.layout) ?? patterns[0];
  return (
    <div className="relative overflow-hidden bg-mint shadow-lg ring-1 ring-black/10">
      {s.image ? (
        <img
          src={s.image}
          alt={`${s.shape} bandana — ${s.label}`}
          draggable={false}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="pointer-events-none aspect-square w-full object-cover"
        />
      ) : (
        <BandanaPreview
          shape={s.shape}
          baseColor={s.base}
          logoPreview={null}
          marks={p.marks}
          fullDesign={Boolean(p.full)}
          seamless={Boolean(p.seamless)}
          logoRotate={0}
          logoScale={100}
          posX={50}
          posY={50}
          colSpace={100}
          rowSpace={100}
          compact
        />
      )}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
        {s.shape} · {s.label}
      </span>
    </div>
  );
});

export const meta: Route.MetaFunction = ({matches}) => {
  const origin = siteOrigin(matches);
  const url = `${origin}/bandana-calculator`;
  const title = 'Bandana calculator — instant bulk & wholesale pricing';
  const description =
    'Calculate your exact per-piece price for custom-printed bandanas by size and quantity. Volume tiers drop the price as you order more — no setup, plate, or artwork fees, made to order with a free proof.';
  return [
    {title: `${title} | Custom Bandanas`},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: 'Custom Bandanas'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {'script:ld+json': breadcrumbJsonLd(CRUMBS, origin)},
  ];
};

export default function BandanaCalculatorPage() {
  return (
    <div className="bg-paper">
      <div className="ui-container pt-6">
        <Breadcrumbs items={CRUMBS} />
      </div>

      {/* Calculator — renders its own visible h1 + dynamic h2 (shape/size). */}
      <section className="bg-paper">
        <div className="ui-container pb-16 pt-6 md:pb-24 md:pt-8">
          <PriceEstimator syncUrl showHeading />
        </div>
      </section>

      {/* Design showcase — reuses the homepage curve carousel. Placeholder tiles
          for now; swap PLACEHOLDERS for real product/design images when ready. */}
      <section className="bg-paper pb-16 md:pb-24">
        <div className="ui-container">
          <div className="max-w-2xl">
            <span className="eyebrow text-brand-700">Layouts &amp; shapes</span>
            <h2 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
              Every layout, your way
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Full-bleed prints, seamless all-over patterns, repeating logos and
              corner accents — on square or triangle, in any colour.
            </p>
          </div>
        </div>

        {/* Full-bleed like the homepage carousel (outside the container). */}
        <CurveCarousel
          cards={LAYOUT_CARDS}
          itemClassName="w-80 shrink-0 md:w-[460px]"
          curve={false}
        />
      </section>
    </div>
  );
}
