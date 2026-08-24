import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense, useEffect, useRef, useState} from 'react';
import type {RecommendedProductsQuery} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {FeatureBadges} from '~/components/FeatureBadges';
import SmokeyCursor from '~/components/lightswind/smokey-cursor';
import {SelectMenu} from '~/components/SelectMenu';
import {siteOrigin} from '~/lib/seo';
import howItWorksBg from '~/assets/how-it-works-bg.png';
import {
  sizesFor,
  tiersFor,
  money,
  MIN_QTY,
  DEFAULT_SIZE,
  customWizardPath,
} from '~/lib/customPrintData';

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
            // Static marquee, never reordered — index is a stable key.
            // eslint-disable-next-line react/no-array-index-key
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
  const [shape, setShape] = useState<'Square' | 'Triangle'>('Square');
  const [size, setSize] = useState(DEFAULT_SIZE.Square);
  // Quantity is the single source of truth — the stepper/field AND the ladder both
  // write it, and the active tier is derived from it (so the two always agree).
  const [qtyInput, setQtyInput] = useState('72');
  const cc = 'USD';

  const sizes = sizesFor(shape);
  const tiers = tiersFor(size, shape);
  const base = tiers[0].each; // 1–11 compare-at (not sold; MOQ is 12)
  const sellable = tiers.slice(1); // 12+ … the real order tiers
  const discFor = (each: number) =>
    base > 0 ? Math.round(((base - each) / base) * 100) : 0;

  const qty = Math.max(MIN_QTY, Math.floor(Number(qtyInput) || 0) || MIN_QTY);
  const active =
    tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) ??
    tiers[tiers.length - 1];
  const unit = active.each;
  const total = unit * qty;
  const saved = (base - unit) * qty;
  const pct = discFor(unit);

  const setQty = (n: number) => setQtyInput(String(Math.max(MIN_QTY, n)));

  // Flip to a valid size for the new shape when the shape toggles.
  function pickShape(next: 'Square' | 'Triangle') {
    setShape(next);
    setSize(DEFAULT_SIZE[next]);
  }

  const perks = [
    'No setup, plate, or artwork fees',
    'Free digital proof before we print',
    'Made to order — your design, your sizes',
  ];

  return (
    <Section className="bg-paper">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* Pitch */}
        <div className="max-w-lg">
          <span className="eyebrow text-brand-700">Bulk &amp; wholesale</span>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
            Buy more, save more
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            The per-piece price drops automatically as your quantity climbs — the
            same volume tiers behind our bulk and wholesale pricing. Built for
            teams, schools, events, festivals, and resellers.
          </p>
          <ul className="mt-7 space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-sm font-medium text-ink">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-semibold text-ink">
                Want a more complex layout?
              </span>{' '}
              Our design team can build it for you — available for an additional
              fee.
            </p>
          </div>
        </div>

        {/* Calculator card */}
        <div className="w-full rounded-3xl border border-black/10 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(16,20,16,0.35)] md:p-8">
          <p className="text-lg font-extrabold uppercase tracking-tight text-ink">
            Instant price estimate
          </p>

          {/* Shape — full width on top */}
          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Shape
            </span>
            <SelectMenu
              ariaLabel="Shape"
              value={shape}
              onChange={(v) => {
                if (v === 'Square' || v === 'Triangle') pickShape(v);
              }}
              options={[
                {value: 'Square', label: 'Square solid color bandana'},
                {value: 'Triangle', label: 'Triangle solid color bandana'},
                {
                  value: 'Rectangle',
                  label: 'Rectangle solid color bandana',
                  meta: 'Coming soon',
                  disabled: true,
                },
                {
                  value: 'Fabric roll',
                  label: 'Fabric roll',
                  meta: 'Coming soon',
                  disabled: true,
                },
              ]}
            />
          </div>

          {/* Size | Quantity — two columns */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Size (inches)
              </span>
              <SelectMenu
                ariaLabel="Size (inches)"
                value={size}
                onChange={setSize}
                options={sizes.map((s) => ({value: s.name, label: s.name}))}
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Quantity
              </span>
              <div className="flex h-11 items-center gap-1 rounded-xl border border-black/15 px-1.5 focus-within:border-brand-500">
                <button
                  type="button"
                  onClick={() => setQty(qty - 1)}
                  disabled={qty <= MIN_QTY}
                  aria-label="Decrease quantity"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_QTY}
                  step={1}
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  onBlur={() => setQtyInput(String(qty))}
                  aria-label="Quantity"
                  className="m-0 h-full w-full min-w-0 border-0 bg-transparent px-2 py-0 text-center text-sm font-semibold leading-none text-ink tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  aria-label="Increase quantity"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </label>
          </div>

          {/* Volume tiers — full width; click a break to jump */}
          <div className="mt-4" role="radiogroup" aria-label="Quantity tier">
            <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              <span>Volume</span>
              <span>Price / piece</span>
            </div>
            <div className="max-h-56 divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/10">
              {sellable.map((t) => {
                const on = t.min === active.min;
                const d = discFor(t.each);
                return (
                  <button
                    key={t.min}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setQty(t.min)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                      on
                        ? 'bg-mint font-bold text-ink ring-1 ring-inset ring-brand-500'
                        : 'bg-white text-ink hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className="tabular-nums">{t.label}</span>
                    <span className="flex items-center gap-2.5">
                      {d > 0 ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            on
                              ? 'bg-red-600 text-white'
                              : 'bg-red-600/10 text-red-600'
                          }`}
                        >
                          −{d}%
                        </span>
                      ) : null}
                      <span className="w-16 text-right font-bold tabular-nums">
                        {money(t.each, cc)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price — full width */}
          <div className="mt-5 rounded-2xl bg-mint px-5 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-brand-700">Your price</p>
                <p className="mt-1 text-5xl font-extrabold leading-none tracking-tight text-ink tabular-nums">
                  {money(unit, cc)}
                  <span className="ml-1 text-lg font-semibold text-muted">
                    /pc
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {qty.toLocaleString()} pcs total
                </p>
                <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
                  {money(total, cc)}
                </p>
              </div>
            </div>
            {pct > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-3 text-sm">
                <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  Save {pct}%
                </span>
                <span className="text-muted">
                  vs {money(base, cc)}/pc ·{' '}
                  <span className="font-semibold text-red-600">
                    {money(saved, cc)} off
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <Link
            to={`/custom-print/${shape.toLowerCase()}`}
            className="btn mt-5 w-full bg-orange-500 text-white transition-colors hover:bg-orange-600"
          >
            Start your order
          </Link>
        </div>
      </div>
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
