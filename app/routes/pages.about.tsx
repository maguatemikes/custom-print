import {Link} from 'react-router';
import type {Route} from './+types/pages.about';
import {siteOrigin} from '~/lib/seo';

/**
 * About Us — a designed, static brand page (not a Shopify CMS page). Lives at
 * /pages/about, which takes precedence over the generic pages.$handle route.
 * Tells the custom-printing story: made-to-order, proof-before-print, bulk.
 */
export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'About Us — Custom Bandanas';
  const description =
    'Custom Bandanas is the made-to-order custom printing shop from Wholesale For Everyone — full-color digital-printed bandanas and merch, proofed before we print, with bulk and wholesale pricing.';
  const url = `${siteOrigin(matches)}/pages/about`;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: title,
        description,
        url,
        publisher: {'@type': 'Organization', name: 'Custom Bandanas'},
      },
    },
  ];
};

export default function About() {
  return (
    <div className="bg-paper">
      <AboutHero />
      <Intro />
      <Values />
      <Sustainability />
      <AboutCta />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="ui-container relative py-20 md:py-28">
        <span className="eyebrow text-brand-400">Our story</span>
        <h1 className="mt-4 max-w-3xl text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl">
          Custom printing, <span className="text-brand-400">made simple.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          Custom Bandanas is the made-to-order print shop from Wholesale For
          Everyone. Upload your design, pick your shape and colors, and we print
          full-color bandanas and merch — proofed before anything goes on
          fabric, with bulk and wholesale pricing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/collections/made-to-order-collections" className="btn btn-brand">
            Design your bandana
          </Link>
          <Link to="/collections/all" className="btn btn-ghost">
            Shop the collection
          </Link>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="bg-paper">
      <div className="ui-container grid gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="eyebrow text-brand-700">What we&apos;re about</span>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
            Your design, digitally printed
          </h2>
        </div>
        <div className="space-y-4 text-muted">
          <p>
            We started Custom Bandanas on a simple idea: getting your own design
            printed shouldn&apos;t take a sales rep, a minimum-order headache, or
            a two-week wait. So we built a store where you design online and we
            print to order.
          </p>
          <p>
            Everything is{' '}
            <strong className="text-ink">full-color digital printing</strong> —
            gradients, photos, and fine logo detail land exactly as designed, with
            no screen-count limits. Choose your shape, base color, and layout,
            approve the proof, and we print only what you order.
          </p>
          <p>
            Because we&apos;re backed by Wholesale For Everyone, per-piece
            pricing drops as your quantity climbs — whether you need a dozen for a
            team or thousands for a brand launch.
          </p>
        </div>
      </div>
    </section>
  );
}

function Values() {
  const values = [
    {
      n: '01',
      t: 'Proof before print',
      d: 'We send a digital proof of your artwork on the product — nothing goes on fabric until you approve it.',
    },
    {
      n: '02',
      t: 'Full-color digital printing',
      d: 'Digital printing captures every color and fine detail — gradients, photos, and logos — with no screen limits.',
    },
    {
      n: '03',
      t: 'Bulk & wholesale pricing',
      d: 'Per-piece pricing drops as you order more — from a dozen to thousands — backed by Wholesale For Everyone.',
    },
    {
      n: '04',
      t: 'Made to order',
      d: 'Every piece is printed when you order it, so there is no deadstock and no overproduction.',
    },
  ];
  return (
    <section className="bg-mint">
      <div className="ui-container py-16 md:py-24">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow text-brand-700">What we stand for</span>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
            The way we do things
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.n}
              className="rounded-3xl bg-paper p-6 transition-colors hover:bg-white"
            >
              <span className="text-3xl font-extrabold text-brand-600">
                {v.n}
              </span>
              <h3 className="mt-3 text-xl font-bold uppercase leading-tight">
                {v.t}
              </h3>
              <p className="mt-2 text-sm text-muted">{v.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sustainability() {
  return (
    <section className="bg-paper">
      <div className="ui-container py-16 md:py-24">
        <div className="grid gap-10 rounded-3xl bg-brand-700 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <span className="eyebrow text-brand-400">Better by design</span>
            <h2 className="mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
              Printed on demand, not overproduced
            </h2>
          </div>
          <div className="space-y-4 text-white/80">
            <p>
              Made-to-order printing means we only make what you order — no
              warehouses of unsold stock, no deadstock headed to landfill. You
              get exactly the run you need, and nothing extra gets made.
            </p>
            <p>
              We ship carbon-neutral and keep packaging minimal. Small choices,
              made at scale.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutCta() {
  return (
    <section className="bg-mint">
      <div className="ui-container flex flex-col items-center gap-6 py-16 text-center md:py-24">
        <span className="eyebrow text-brand-700">Start your project</span>
        <h2 className="max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-5xl">
          Bring your design
        </h2>
        <p className="max-w-xl text-muted">
          Custom printed, made to order, proofed before we print — with bulk and
          wholesale pricing.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/collections/made-to-order-collections" className="btn btn-dark">
            Design your bandana
          </Link>
        </div>
      </div>
    </section>
  );
}
