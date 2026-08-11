import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense, useEffect, useRef} from 'react';
import type {RecommendedProductsQuery} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {FeatureBadges} from '~/components/FeatureBadges';
import SmokeyCursor from '~/components/lightswind/smokey-cursor';
import {siteOrigin} from '~/lib/seo';

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
      <TrendingProducts products={data.recommendedProducts} />
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
          <Link to="/custom-print/design" className="btn btn-outline">
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

/* Full-width infinite-loop carousel — EQUAL-size cards that auto-scroll forever
   and wrap seamlessly (the list is tripled so there's always content to loop
   into). Drag/swipe to move, hover to pause. No arrows. */
function HeroGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const st = useRef({
    offset: 0,
    setW: 0,
    paused: false,
    dragging: false,
    startX: 0,
    startOffset: 0,
  });
  const items = [...GALLERY_IMAGES, ...GALLERY_IMAGES, ...GALLERY_IMAGES];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      st.current.setW = track.scrollWidth / 3; // width of ONE set of images
    };
    measure();
    window.addEventListener('resize', measure);
    let raf = 0;
    const speed = 0.5; // px per frame
    const tick = () => {
      const s = st.current;
      if (!s.paused && !s.dragging) s.offset += speed;
      if (s.setW) {
        if (s.offset >= s.setW) s.offset -= s.setW; // seamless wrap forward
        else if (s.offset < 0) s.offset += s.setW; // and backward (drag)
      }
      track.style.transform = `translate3d(${-s.offset}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startOffset = s.offset;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.dragging) return;
    s.offset = s.startOffset - (e.clientX - s.startX);
  };
  const endDrag = () => {
    st.current.dragging = false;
  };

  return (
    <div className="relative mt-4 overflow-hidden md:mt-8">
      <div
        className="overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onMouseEnter={() => (st.current.paused = true)}
        onMouseLeave={() => (st.current.paused = false)}
      >
        <div
          ref={trackRef}
          className="flex w-max cursor-grab select-none gap-5 py-5 will-change-transform active:cursor-grabbing"
        >
          {items.map((img, i) => (
            <div key={i} className="w-56 shrink-0 md:w-[300px]">
              <div className="overflow-hidden rounded-[1.5rem] bg-mint shadow-lg ring-1 ring-black/10">
                <img
                  src={img.src}
                  alt={img.alt}
                  draggable={false}
                  loading="lazy"
                  className="pointer-events-none aspect-[3/4] w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Oblong top & bottom — wide, page-coloured ovals crop the strip along an
          arc, so the flat row reads as if it curves on a cylinder. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[65%] w-[150%] -translate-x-1/2 -translate-y-[76%] rounded-[50%] bg-paper"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-[65%] w-[150%] -translate-x-1/2 translate-y-[76%] rounded-[50%] bg-paper"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Trending products                                                           */
/* -------------------------------------------------------------------------- */
function TrendingProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <Section className="bg-mint">
      <SectionHead
        eyebrow="Trending now"
        title="Fresh on the shelf"
        cta={{label: 'Shop all', to: '/collections/all'}}
      />
      <Suspense fallback={<ProductGridSkeleton />}>
        <Await resolve={products}>
          {(response) => (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {response
                ? response.products.nodes.map((product, i) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      loading={i < 4 ? 'eager' : 'lazy'}
                    />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
    </Section>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {Array.from({length: 8}).map((_, i) => (
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
