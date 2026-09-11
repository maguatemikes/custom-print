import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense, useEffect, useRef} from 'react';
import type {RecommendedProductsQuery} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {FeatureBadges} from '~/components/FeatureBadges';
import {CurveCarousel} from '~/components/CurveCarousel';
import SmokeyCursor from '~/components/lightswind/smokey-cursor';
import {PriceEstimator} from '~/components/PriceEstimator';
import {siteOrigin} from '~/lib/seo';
import howItWorksBg from '~/assets/how-it-works-bg.png';
import {customWizardPath} from '~/lib/customPrintData';

// Hero photo on the Shopify CDN (1672×941). Rendered responsively via Hydrogen
// <Image> below, and reused as the homepage social-share image (og:image).
const HERO_IMAGE =
  'https://cdn.shopify.com/s/files/1/0716/2609/6792/files/hero.png';

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Custom Bandanas — Custom Printed, Made to Order';
  const description =
    'Custom-printed bandanas, caps, and merch made to order — your design, proofed before we print, with bulk & wholesale pricing.';
  const origin = siteOrigin(matches);
  const url = `${origin}/`;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: 'Custom Bandanas'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {property: 'og:image', content: HERO_IMAGE},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: HERO_IMAGE},
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Custom Bandanas',
        url,
        description,
      },
    },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Custom Bandanas',
        url,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(HOME_COLLECTIONS_QUERY),
  ]);

  return {
    collections: collections.nodes,
    featuredCollection: collections.nodes[0],
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {recommendedProducts};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="bg-paper">
      <div className="relative overflow-hidden">
        <SmokeyCursor />
        <Hero />
        <FeatureBadges />
      </div>
      <HowItWorks />
      <BulkPricing />
      <PremadeProducts products={data.recommendedProducts} />
      <MadeToOrderProducts products={data.recommendedProducts} />
      <NewsletterBand />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared layout primitives — one consistent section rhythm everywhere         */
/* -------------------------------------------------------------------------- */
function Section({
  children,
  className = '',
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <section className={className}>
      <div className={bleed ? '' : 'ui-container py-16 md:py-24'}>
        {children}
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  cta,
  tone = 'default',
}: {
  eyebrow: string;
  title: string;
  cta?: {label: string; to: string};
  tone?: 'default' | 'invert';
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <span
          className={`eyebrow ${
            tone === 'invert' ? 'text-brand-400' : 'text-brand-700'
          }`}
        >
          {eyebrow}
        </span>
        <h2
          className={`mt-2 text-3xl font-extrabold uppercase tracking-tight md:text-4xl ${
            tone === 'invert' ? 'text-white' : 'text-ink'
          }`}
        >
          {title}
        </h2>
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:underline sm:inline"
        >
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero — centered, with a fanned product gallery (Rapt-style)                  */
/* -------------------------------------------------------------------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="ui-container flex flex-col items-center gap-6 pt-16 text-center md:pt-24">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl">
          Custom printing shouldn&apos;t be a guessing game
        </h1>
        <p className="max-w-xl text-base text-muted md:text-lg">
          We help brands, teams, schools, and events get custom-printed bandanas
          and merch they&apos;re actually proud of — a guided, made-to-order
          process from first proof to final delivery.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/collections/all"
            className="btn bg-orange-500 text-white transition-colors hover:bg-orange-600"
          >
            Shop ready-made
          </Link>
          <Link to="/collections/made-to-order-collections" className="btn btn-outline">
            Design your own
          </Link>
        </div>
      </div>

      <HeroGallery />

      <p className="pb-12 text-center text-xs font-medium tracking-wide text-muted">
        Trusted by over <span className="font-bold text-ink">100,000+</span>{' '}
        customers
      </p>
    </section>
  );
}

/* Fanned product gallery (Rapt-style) — a static arc of merch photos. Cards
   near the centre stand upright; outer cards rotate and dip, clipping softly at
   the viewport edges. Imagery from Unsplash. */
const GALLERY_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom printed tote bag',
  },
  {
    src: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom embroidered cap',
  },
  {
    src: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom water bottle',
  },
  {
    src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom printed t-shirt',
  },
  {
    src: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom backpack',
  },
  {
    src: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom sneakers',
  },
  {
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80&auto=format&fit=crop',
    alt: 'Custom red sneakers',
  },
];

/* Homepage hero gallery — the shared curve carousel filled with product shots. */
function HeroGallery() {
  return (
    <CurveCarousel
      cards={GALLERY_IMAGES.map((img) => (
        <div className="overflow-hidden rounded-[1.5rem] bg-mint shadow-lg ring-1 ring-black/10">
          <img
            src={img.src}
            alt={img.alt}
            draggable={false}
            loading="lazy"
            className="pointer-events-none aspect-[3/4] w-full object-cover"
          />
        </div>
      ))}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Product showcases — ready-made (premade) up top, made-to-order below.        */
/* Both read the same recent-products feed and split it by whether the handle   */
/* routes to a custom-print wizard (customWizardPath).                          */
/* -------------------------------------------------------------------------- */
function PremadeProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <Section className="bg-mint">
      <SectionHead
        eyebrow="In stock"
        title="Premade designs for you"
        cta={{label: 'Shop all', to: '/collections/all'}}
      />
      <Suspense fallback={<ProductGridSkeleton />}>
        <Await resolve={products}>
          {(response) => {
            const premade = (response?.products.nodes ?? []).filter(
              (p) => !customWizardPath(p.handle),
            );
            return (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                {premade.map((product, i) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    loading={i < 4 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            );
          }}
        </Await>
      </Suspense>
    </Section>
  );
}

function MadeToOrderProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <Suspense fallback={null}>
      <Await resolve={products}>
        {(response) => {
          const made = (response?.products.nodes ?? []).filter((p) =>
            customWizardPath(p.handle),
          );
          if (!made.length) return null;
          return (
            <Section className="bg-paper">
              <SectionHead
                eyebrow="Made to order"
                title="Design your own"
                cta={{
                  label: 'Start designing',
                  to: '/collections/made-to-order-collections',
                }}
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                {made.map((product) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    loading="lazy"
                  />
                ))}
              </div>
            </Section>
          );
        }}
      </Await>
    </Suspense>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {Array.from({length: 8}).map((_, i) => (
        // Fixed-length loading skeleton — index is a stable key.
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-mint-deep" />
          <div className="mt-3 h-3 w-2/3 rounded bg-mint-deep" />
          <div className="mt-2 h-3 w-1/3 rounded bg-mint-deep" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Newsletter                                                                   */
/* -------------------------------------------------------------------------- */
function NewsletterBand() {
  return (
    <section className="bg-brand-700">
      <div className="ui-container flex flex-col items-center gap-5 py-16 text-center text-white md:py-24">
        <span className="eyebrow text-white/75">Stay in the loop</span>
        <h2 className="max-w-2xl text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          First dibs on new designs &amp; drops.
        </h2>
        <p className="max-w-xl text-sm text-white/85 md:text-base">
          Join the list for early access to new prints, seasonal designs, and
          bulk &amp; wholesale offers.
        </p>
        <form
          className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            aria-label="Email address"
            className="!mt-0 !mb-0 w-full flex-1 rounded-pill !border-white/25 bg-white px-5 py-3 text-ink"
          />
          <button type="submit" className="btn btn-dark">
            Join the list
          </button>
        </form>
        <p className="text-xs text-white/80">
          By signing up you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works — the made-to-order process (a real 4-step sequence)            */
/* -------------------------------------------------------------------------- */
function HowItWorks() {
  const sw = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-6 w-6',
    'aria-hidden': true,
  };
  const steps = [
    {
      title: 'Design or upload',
      body: 'Use our simple online designer or upload your own logo, photo or artwork — no design skills needed.',
      icon: (
        <svg {...sw}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      title: 'We proof it',
      body: 'We send a proof of your exact design — placement, colours and layout — before anything goes on fabric.',
      icon: (
        <svg {...sw}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      title: 'You approve',
      body: 'Nothing is printed until you sign off on your proof. If it’s not right, we fix it — zero risk.',
      icon: (
        <svg {...sw}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      ),
    },
    {
      title: 'Printed & delivered',
      body: 'Full-colour digital print, made to order and shipped — roughly 20–30 business days after approval.',
      icon: (
        <svg {...sw}>
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
      ),
    },
  ];
  return (
    <section className="relative isolate overflow-hidden">
      {/* Workshop photo background + dark scrim for legible white text */}
      <img
        src={howItWorksBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink/70" />
      <div className="ui-container py-24 md:py-36">
        <SectionHead
          eyebrow="How it works"
          title="From idea to doorstep"
          tone="invert"
        />
        {/* Framed grid — mirrors the FeatureBadges style: icon tiles, hairline
            dividers, hover tint, index numbers — lifted over the photo. */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-black/10 shadow-2xl shadow-black/40 ring-1 ring-black/10 sm:grid-cols-2 md:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative flex flex-col gap-6 bg-paper p-7 transition-colors duration-200 hover:bg-mint md:p-9"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-ink ring-1 ring-black/5 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                {s.icon}
              </span>
              <div>
                <h3 className="text-[15px] font-bold uppercase tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
              <span className="pointer-events-none absolute right-6 top-6 text-xs font-semibold tabular-nums text-black/20">
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Bulk & wholesale pricing — a live calculator on the real tier engine         */
/* -------------------------------------------------------------------------- */
function BulkPricing() {
  return (
    <Section className="bg-paper">
      <PriceEstimator />
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                      */
/* -------------------------------------------------------------------------- */
const HOME_COLLECTIONS_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query HomeCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    vendor
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
