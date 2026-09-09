import type {Route} from './+types/price-estimator';
import {PriceEstimator} from '~/components/PriceEstimator';
import {Breadcrumbs, breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {siteOrigin} from '~/lib/seo';

const CRUMBS = [{label: 'Home', href: '/'}, {label: 'Price Estimator'}];

export const meta: Route.MetaFunction = ({matches}) => {
  const origin = siteOrigin(matches);
  const url = `${origin}/price-estimator`;
  const title = 'Bandana price estimator — instant bulk & wholesale pricing';
  const description =
    'Estimate your exact per-piece price for custom-printed bandanas by size and quantity. Volume tiers drop the price as you order more — no setup, plate, or artwork fees, made to order with a free proof.';
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

export default function PriceEstimatorPage() {
  return (
    <div className="bg-paper">
      <div className="ui-container pt-6">
        <Breadcrumbs items={CRUMBS} />
      </div>

      {/* Visible header removed; h1 kept for SEO / screen readers. */}
      <h1 className="sr-only">Price estimator</h1>

      {/* Calculator */}
      <section className="bg-paper">
        <div className="ui-container pb-16 pt-6 md:pb-24 md:pt-8">
          <PriceEstimator />
        </div>
      </section>
    </div>
  );
}
