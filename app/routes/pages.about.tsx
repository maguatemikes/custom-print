import {Link} from 'react-router';
import type {Route} from './+types/pages.about';
import {siteOrigin} from '~/lib/seo';

/**
 * About Us — a designed, static brand page (not a Shopify CMS page). Lives at
 * /pages/about, which takes precedence over the generic pages.$handle route.
 * Leads with the new & curated side, then pre-loved / consignment, then values.
 */
export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'About Us — Berlin Houseware';
  const description =
    'Berlin Houseware is a curated marketplace for new and verified pre-loved homeware — listed side by side. Meet the people bringing quality kitchen, dining, décor, and lighting to more homes, with less waste.';
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
        publisher: {'@type': 'Organization', name: 'Berlin Houseware'},
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
          Homeware worth <span className="text-brand-400">keeping.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          Berlin Houseware is a curated marketplace for new and verified
          pre-loved homeware — listed side by side. Great new pieces and quality
          second-hand finds, in one place, for people who care how their home
          looks and where their things come from.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/collections/all" className="btn btn-brand">
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
            New and pre-loved, side by side
          </h2>
        </div>
        <div className="space-y-4 text-muted">
          <p>
            We started Berlin Houseware on a simple idea: a beautiful home
            shouldn&apos;t mean buying everything brand new — and buying
            second-hand shouldn&apos;t feel like a compromise. So we built one
            store for both.
          </p>
          <p>
            Our new collection is <strong className="text-ink">curated</strong>,
            not endless — kitchen and dining, décor, lighting, and the small
            things that make a space feel finished. Alongside it, every
            pre-loved piece is inspected and verified by our team, then listed
            right next to the new arrivals. Same quality bar, same care, one
            checkout.
          </p>
          <p>
            The result is a place where you can furnish a shelf, a table, or a
            whole room — mixing new and pre-loved freely — and know that every
            piece earned its spot.
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
      t: 'Curated, not endless',
      d: 'We choose a tight edit of new homeware worth owning — quality and design over sheer volume.',
    },
    {
      n: '02',
      t: 'Verified pre-loved',
      d: 'Every second-hand piece is inspected and authenticated before it goes live beside our new goods.',
    },
    {
      n: '03',
      t: 'Fair for sellers',
      d: 'Consignors keep up to 80% of the sale, with no listing fees — we handle photos, pricing, and shipping.',
    },
    {
      n: '04',
      t: 'Less waste',
      d: 'Giving great pieces a second life keeps them out of landfill and in homes where they belong.',
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
              Good for your home, and the planet
            </h2>
          </div>
          <div className="space-y-4 text-white/80">
            <p>
              Homeware has a long life in it — a well-made pot, lamp, or vase
              can serve one home, then another, for decades. Every pre-loved
              piece that sells here is one less thing manufactured, shipped, and
              eventually thrown away.
            </p>
            <p>
              We ship carbon-neutral, keep packaging minimal, and give
              consignors the option to donate unsold items to our sustainability
              partners rather than send them to landfill. Small choices, made at
              scale.
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
        <span className="eyebrow text-brand-700">Join us</span>
        <h2 className="max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-5xl">
          Start your project
        </h2>
        <p className="max-w-xl text-muted">
          Browse the catalog and bring your design — custom printed, made to
          order, proofed before we print.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/collections/all" className="btn btn-dark">
            Shop the collection
          </Link>
        </div>
      </div>
    </section>
  );
}
