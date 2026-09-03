import {Suspense, useRef, useState} from 'react';
import {
  Await,
  useLoaderData,
  redirect,
  useFetcher,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
  CartForm,
} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import type {
  ProductFragment,
  RelatedProductFragment,
} from 'storefrontapi.generated';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductGallery} from '~/components/ProductGallery';
import {ProductForm} from '~/components/ProductForm';
import {MIN_ORDER_QTY} from '~/lib/cart';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {useAside} from '~/components/Aside';
import {ProductItem} from '~/components/ProductItem';
import {ProductInfo} from '~/components/ProductInfo';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {customWizardPath} from '~/lib/customPrintData';
import {uploadImage} from '~/lib/customPrintProof';
import {siteOrigin} from '~/lib/seo';
import {Breadcrumbs, breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {fetchProductRatingSummary} from '~/lib/judgeme.server';

// The product's data is fixed for a given handle + variant selection (which is
// URL-driven via ?Color=&Size=). Re-fetch only when the URL changes — NOT on cart
// mutations — so add-to-cart doesn't trigger a redundant product re-query.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
}) =>
  currentUrl.pathname !== nextUrl.pathname ||
  currentUrl.search !== nextUrl.search;

export const meta: Route.MetaFunction = ({data, matches}) => {
  const product = data?.product;
  if (!product) {
    return [{title: 'Product | Custom Bandanas'}];
  }

  const variant = product.selectedOrFirstAvailableVariant;
  const title = product.seo?.title || `${product.title} | Custom Bandanas`;
  const description = (
    product.seo?.description ||
    product.description ||
    `Shop ${product.title} at Custom Bandanas — custom-printed and made to order, with bulk & wholesale pricing.`
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const image = variant?.image?.url || product.images?.nodes?.[0]?.url;
  const origin = siteOrigin(matches);
  const url = `${origin}/products/${product.handle}`;

  // Rich-snippet stars only when there are real reviews to back them (Google
  // rejects an aggregateRating with reviewCount 0). Guarded fetch → {overall,
  // total}; both 0 when Judge.me has nothing or is unreachable.
  const rating = data?.reviewSummary;
  const aggregateRating =
    rating && rating.total > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating.overall,
          reviewCount: rating.total,
        }
      : undefined;

  const crumbs = [
    {label: 'Home', href: '/'},
    {label: 'Shop', href: '/collections'},
    {label: product.title},
  ];

  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'product'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    ...(image ? [{property: 'og:image', content: image}] : []),
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    ...(image ? [{name: 'twitter:image', content: image}] : []),
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description,
        image: image ? [image] : undefined,
        brand: {'@type': 'Brand', name: product.vendor || 'Custom Bandanas'},
        sku: variant?.sku || undefined,
        aggregateRating,
        offers: variant?.price
          ? {
              '@type': 'Offer',
              priceCurrency: variant.price.currencyCode,
              price: variant.price.amount,
              // Rolling validity (next year-end) — keeps the price "fresh" for
              // Google without a per-day value that would churn the markup.
              priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
              availability: variant.availableForSale
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url,
            }
          : undefined,
      },
    },
    {'script:ld+json': breadcrumbJsonLd(crumbs, origin)},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // The made-to-order shape products (square/triangle) have no real PDP — each is
  // a variant/price carrier for checkout. Any hit on one's product page (shop
  // card, direct link, search) goes straight to that shape's custom-print wizard.
  const wizardPath = customWizardPath(args.params.handle ?? '');
  if (wizardPath) {
    return redirect(wizardPath);
  }

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}, reviewSummary] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Rating totals for the Product JSON-LD's aggregateRating (rich-snippet
    // stars). ZERO added TTFB — cache hit returns instantly, cache miss returns
    // 0/0 now and refills in the background (context.waitUntil). See
    // fetchProductRatingSummary.
    fetchProductRatingSummary(context.env, handle, context.waitUntil),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
    reviewSummary,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  const {storefront} = context;
  const {handle} = params;

  // "You may also like" — Shopify's NATIVE recommendation engine FIRST
  // (`productRecommendations(intent: RELATED)`, algorithm-driven & genuinely
  // related), fetched below the fold so it never blocks TTFB. If it returns
  // fewer than 4 (thin order history / uncategorised product / dev store), we top
  // the row up with real, LIVE best-selling products — never hardcoded — so the
  // section always shows a full set of 4. RELATED items always come first.
  // Never recommend a made-to-order wizard product — those are configurators, not
  // shoppable cards. `customWizardPath` is non-null for the square/triangle wizard
  // handles.
  const isWizard = (p: {handle: string}) => Boolean(customWizardPath(p.handle));

  const recommendations = (async () => {
    let items: RelatedProductFragment[] = [];
    if (handle) {
      try {
        const data = await storefront.query(PRODUCT_RECOMMENDATIONS_QUERY, {
          variables: {handle},
          cache: storefront.CacheLong(),
        });
        items = (data?.recommended ?? []).filter((p) => !isWizard(p));
      } catch {
        items = [];
      }
    }
    // Need up to 5 so the row still has 4 after the current product is dropped.
    if (items.length >= 5) return items;
    try {
      const fb = await storefront.query(RECOMMENDATIONS_FALLBACK_QUERY, {
        cache: storefront.CacheLong(),
      });
      const seen = new Set(items.map((p) => p.id));
      for (const p of fb?.products?.nodes ?? []) {
        if (isWizard(p) || seen.has(p.id)) continue; // skip wizard + dupes
        items.push(p as RelatedProductFragment);
        seen.add(p.id);
      }
    } catch {
      // best-effort — keep whatever RELATED returned
    }
    return items;
  })();

  return {recommendations};
}

export default function Product() {
  const {product, recommendations} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  // Quantity is shared so the displayed price reflects the selected amount.
  const [quantity, setQuantity] = useState(MIN_ORDER_QTY);
  // Buy the design as-shown, or open the personalize configurator.
  const [mode, setMode] = useState<'stock' | 'custom'>('stock');
  // Personalize logo + placement — lifted here so the MAIN gallery image and the
  // configurator share it (drag on the big image, resize from the config).
  const [pLogo, setPLogo] = useState<PersonalizeLogo | null>(null);
  const [logoPos, setLogoPos] = useState({x: 50, y: 50});
  const [logoScale, setLogoScale] = useState(40);
  const [logoRotate, setLogoRotate] = useState(0);

  const unitPrice = selectedVariant?.price;
  const unitCompareAt = selectedVariant?.compareAtPrice;
  const lineTotal: MoneyV2 | undefined = unitPrice
    ? {
        amount: (Number(unitPrice.amount) * quantity).toFixed(2),
        currencyCode: unitPrice.currencyCode,
      }
    : undefined;
  const compareTotal: MoneyV2 | null = unitCompareAt
    ? {
        amount: (Number(unitCompareAt.amount) * quantity).toFixed(2),
        currencyCode: unitCompareAt.currencyCode,
      }
    : null;

  // Build the gallery in a STABLE order (product images as-is) so switching
  // variants doesn't reshuffle the thumbnails. The selected variant's image stays
  // in its natural position — ProductGallery highlights it and slides the rail to
  // it via `activeImageUrl`, instead of hoisting it to the top on every swatch
  // change. If the variant's image isn't among the product images, it's appended
  // so it's still shown.
  const galleryImages = (() => {
    const out: Array<{
      id?: string | null;
      url: string;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
    }> = [];
    const seen = new Set<string>();
    for (const node of product.images?.nodes ?? []) {
      if (node?.url && !seen.has(node.url)) {
        out.push(node);
        seen.add(node.url);
      }
    }
    if (selectedVariant?.image?.url && !seen.has(selectedVariant.image.url)) {
      out.push(selectedVariant.image);
    }
    return out;
  })();

  return (
    <>
      <div className="ui-container py-8 md:py-12">
        <Breadcrumbs
          className="mb-6"
          items={[
            {label: 'Home', href: '/'},
            {label: 'Shop', href: '/collections'},
            {label: title},
          ]}
        />
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          {/* Gallery */}
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <ProductGallery
              images={galleryImages}
              title={title}
              activeImageUrl={selectedVariant?.image?.url}
              logoOverlay={
                mode === 'custom' && pLogo?.preview
                  ? {
                      src: pLogo.preview,
                      pos: logoPos,
                      scale: logoScale,
                      rotate: logoRotate,
                      onPosChange: setLogoPos,
                      onScaleChange: setLogoScale,
                      onRotateChange: setLogoRotate,
                    }
                  : null
              }
            />
          </div>

          {/* Product info */}
          <div className="min-w-0 lg:py-2">
            <h1 className="text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
              {title}
            </h1>
            {/* Brand under the title — the vendor's only home (the eyebrow is
              seller-only now). Hidden when it's just the store-default vendor. */}
            {product.vendor &&
              !product.vendor.toLowerCase().includes('custombandanas') && (
                <p className="mt-1 text-sm text-muted">
                  Brand: {product.vendor}
                </p>
              )}

            <div className="mt-4">
              <ProductPrice price={lineTotal} compareAtPrice={compareTotal} />
              {quantity > 1 && unitPrice && (
                <p className="mt-1 text-sm text-muted">
                  {quantity} × <Money as="span" data={unitPrice} />
                </p>
              )}
            </div>

            <MadeToOrderBadge />

            <div className="mt-8">
              {mode === 'stock' ? (
                <ProductForm
                  productOptions={productOptions}
                  selectedVariant={selectedVariant}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  onPersonalize={() => setMode('custom')}
                />
              ) : (
                <PersonalizeSection
                  selectedVariant={selectedVariant}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  onBack={() => setMode('stock')}
                  logo={pLogo}
                  setLogo={setPLogo}
                  logoPos={logoPos}
                  setLogoPos={setLogoPos}
                  logoScale={logoScale}
                  setLogoScale={setLogoScale}
                  logoRotate={logoRotate}
                  setLogoRotate={setLogoRotate}
                />
              )}
            </div>

            <TrustLine />

            <div className="mt-8 border-t border-black/10">
              <Accordion title="Shipping & Returns" defaultOpen>
                <p className="text-sm text-muted">
                  Every piece is{' '}
                  <span className="font-semibold text-ink">
                    printed to order
                  </span>{' '}
                  just for you — please allow{' '}
                  <span className="font-semibold text-ink">20–30 days</span> for
                  production and delivery. Personalized orders include a digital
                  proof for your approval before we print. Free shipping on
                  orders over $75. Because each item is made to order, returns
                  are limited to production defects.
                </p>
              </Accordion>
              <Accordion title="Details">
                <ul className="space-y-1 text-sm text-muted">
                  <li>Made to order · printed in-house</li>
                  {product.vendor && <li>Brand: {product.vendor}</li>}
                  {selectedVariant?.sku && <li>SKU: {selectedVariant.sku}</li>}
                  <li>Ships from custombandanas</li>
                </ul>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Description / Reviews band below the detail (like the wizard). */}
      <ProductInfo
        productHandle={product.handle}
        descriptionHtml={descriptionHtml}
      />

      {/* "You may also like" — deferred so it streams in after the detail. */}
      <Suspense fallback={null}>
        <Await resolve={recommendations} errorElement={null}>
          {(items) => <RelatedProducts items={items} currentId={product.id} />}
        </Await>
      </Suspense>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

/**
 * "You may also like" row. Drops the product being viewed and caps at 4 cards;
 * renders nothing when there's nothing to show (keeps the page clean on a thin
 * catalog rather than leaving an empty band).
 */
function RelatedProducts({
  items,
  currentId,
}: {
  items: RelatedProductFragment[];
  currentId: string;
}) {
  const list = items.filter((p) => p.id !== currentId).slice(0, 4);
  if (list.length === 0) return null;

  return (
    <section className="bg-mint">
      <div className="ui-container py-16 md:py-24">
        <div className="mb-10">
          <span className="eyebrow text-brand-700">More to love</span>
          <h2 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
            You may also like
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {list.map((p) => (
            <ProductItem key={p.id} product={p} loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustLine() {
  return (
    <p className="mt-6 flex items-center gap-2 text-xs text-muted">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-brand-600"
        aria-hidden="true"
      >
        <path
          d="m5 13 4 4L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Made to order · digital proof before we print · free shipping over $75
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Made-to-order + personalize                                                */
/* -------------------------------------------------------------------------- */

/** Small status pill under the price: sets the made-to-order expectation. */
function MadeToOrderBadge() {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-black/5">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-brand-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 2" />
      </svg>
      Made to order · ships in 20–30 days
    </div>
  );
}

const SIZE_PRESETS: Array<{name: string; dims: string}> = [
  {name: 'Standard', dims: '22 × 22 in'},
  {name: 'Large', dims: '27 × 27 in'},
  {name: 'XL', dims: '35 × 35 in'},
];

const FABRICS: Array<{name: string; note: string}> = [
  {name: 'Cotton', note: 'soft & breathable'},
  {name: 'Poly blend', note: 'durable, vivid print'},
  {name: 'Polyester', note: 'quick-dry, vibrant'},
  {name: 'Silk', note: 'luxe, soft sheen'},
  {name: 'Satin', note: 'smooth, premium'},
  {name: 'Microfiber', note: 'lightweight'},
];

/** A numbered step block so the configurator reads as a clear 1-2-3 flow. */
function PersonalizeStep({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
          {n}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-ink">{title}</h4>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

/**
 * Personalize configurator — colour, logo upload (client-validated), and size.
 * Choices are written to the cart line as native Shopify line-item attributes:
 * human-readable ones (Color / Size / Logo) that surface in cart + checkout +
 * order, plus a hidden `_custom_print_data` JSON payload (leading underscore =
 * hidden from the customer-facing line) for fulfilment / POD.
 *
 * NOTE (Hydrogen-native, storefront-only): the storefront cart can't set an
 * arbitrary line price, so personalization ships at the base variant price for
 * now — add a surcharge via a variant tier, a flat add-on product, or an Admin
 * API draft order when pricing is decided. The logo file is captured + previewed
 * client-side (name/type/size); wire an upload endpoint (Shopify Files / R2) and
 * store the returned URL in `_custom_print_data.logo.url` to send the artwork.
 */
type PersonalizeLogo = {
  name: string;
  type: string;
  size: number;
  preview: string | null;
};

/**
 * Composite the product photo + the placed logo (position / scale / rotation)
 * into a single PNG data URL — the "Design output" proof shown in the cart and
 * on the order. Returns null if compositing fails (e.g. a tainted canvas).
 */
async function buildDesignProof(
  productUrl: string | null,
  logoDataUrl: string,
  pos: {x: number; y: number},
  scale: number,
  rotateDeg: number,
): Promise<string | null> {
  const SIZE = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const load = (src: string, cross: boolean) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const im = new window.Image();
      if (cross) im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  try {
    if (productUrl) {
      const p = await load(productUrl, true);
      const s = Math.max(SIZE / p.width, SIZE / p.height); // cover
      const w = p.width * s;
      const h = p.height * s;
      ctx.drawImage(p, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    } else {
      ctx.fillStyle = '#eef8ef';
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    const lg = await load(logoDataUrl, false);
    const logoW = (scale / 100) * SIZE;
    const logoH = logoW * (lg.height / lg.width || 1);
    ctx.save();
    ctx.translate((pos.x / 100) * SIZE, (pos.y / 100) * SIZE);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    ctx.drawImage(lg, -logoW / 2, -logoH / 2, logoW, logoH);
    ctx.restore();
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function PersonalizeSection({
  selectedVariant,
  quantity,
  setQuantity,
  onBack,
  logo,
  setLogo,
  logoPos,
  setLogoPos,
  logoScale,
  setLogoScale,
  logoRotate,
  setLogoRotate,
}: {
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  quantity: number;
  setQuantity: (fn: (q: number) => number) => void;
  /** Return to the "buy as shown" view. */
  onBack: () => void;
  // Logo + placement are lifted to the parent so the main gallery image can host
  // the draggable logo while the configurator resizes/removes it.
  logo: PersonalizeLogo | null;
  setLogo: (l: PersonalizeLogo | null) => void;
  logoPos: {x: number; y: number};
  setLogoPos: (p: {x: number; y: number}) => void;
  logoScale: number;
  setLogoScale: (n: number) => void;
  logoRotate: number;
  setLogoRotate: (n: number) => void;
}) {
  const {open} = useAside();
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [customHex, setCustomHex] = useState('#e23b3b');
  const color = keepOriginal ? 'Keep original' : customHex;
  const [fabric, setFabric] = useState('Cotton');
  const [sizePreset, setSizePreset] = useState('Standard');
  const [customSize, setCustomSize] = useState(false);
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Artwork hosting: the picked file is uploaded to the Shopify Files CDN so the
  // order carries a real URL (not just a filename) for fulfilment.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<
    'idle' | 'uploading' | 'ready' | 'error'
  >('idle');
  // Optional free-text note / design brief that rides along on the order.
  const [note, setNote] = useState('');
  // Compositing status for the "Prepare my design" step (the hosted proof URL
  // itself lives in proofUrlRef, below).
  const [designStatus, setDesignStatus] = useState<
    'idle' | 'pending' | 'ready' | 'error'
  >('ready');

  const onFile = (file?: File | null) => {
    setLogoError(null);
    if (!file) return;
    const okType = /^image\/(png|jpeg)$/.test(file.type);
    if (!okType) {
      setLogoError('Please use a PNG or JPG file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setLogoError('That file is over 25MB — please upload a smaller one.');
      return;
    }
    setLogoPos({x: 50, y: 50});
    setLogoScale(40);
    setLogoRotate(0);
    setLogoStatus('uploading');
    setLogoUrl(null);
    setDesignStatus('ready');
    const isImg = file.type.startsWith('image/');
    // Read as a data URL — used BOTH as the preview (a data: URL, which the CSP
    // allows; blob: URLs are blocked) and as the payload uploaded to the CDN.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setLogo({
        name: file.name,
        type: file.type,
        size: file.size,
        preview: isImg ? dataUrl : null,
      });
      void uploadImage(dataUrl, file.name).then((url) => {
        setLogoUrl(url);
        setLogoStatus(url ? 'ready' : 'error');
      });
    };
    reader.onerror = () => setLogoStatus('error');
    reader.readAsDataURL(file);
  };

  // The product photo used as the backdrop when compositing the proof on add.
  const productImgUrl = selectedVariant?.image?.url ?? null;

  const size = customSize
    ? `Custom ${w || '?'} × ${h || '?'} in`
    : SIZE_PRESETS.find((s) => s.name === sizePreset)?.dims ?? sizePreset;

  const uploading = logoStatus === 'uploading';
  const fetcher = useFetcher();
  const adding = fetcher.state !== 'idle';
  // Editing is free (the on-image overlay IS the preview). The composite proof is
  // rendered + hosted ONCE, when the customer adds to cart. `preparing` is only
  // true during that click.
  const preparing = designStatus === 'pending';
  // Cache the last generated proof so re-adding an unchanged placement reuses it.
  const proofSigRef = useRef<string | null>(null);
  const proofUrlRef = useRef<string | null>(null);
  const placementSig = () =>
    JSON.stringify({
      n: logo?.name,
      x: Math.round(logoPos.x),
      y: Math.round(logoPos.y),
      s: logoScale,
      r: logoRotate,
      img: productImgUrl,
    });

  // Build the cart line-item properties given the (freshly hosted) proof URL.
  const makeAttributes = (out: string | null) => {
    const cd = {
      v: 1,
      color,
      fabric,
      size,
      note: note.trim() || null,
      designOutput: out,
      logo: logo
        ? {
            name: logo.name,
            type: logo.type,
            sizeKB: Math.round(logo.size / 1024),
            url: logoUrl,
            position: logo.preview
              ? {
                  x: Math.round(logoPos.x),
                  y: Math.round(logoPos.y),
                  scale: logoScale,
                  rotate: logoRotate,
                }
              : null,
          }
        : null,
    };
    return [
      {key: 'Personalized', value: 'Yes'},
      {key: 'Color', value: color},
      {key: 'Fabric', value: fabric},
      {key: 'Size', value: size},
      ...(logo
        ? [
            {
              key: 'Logo',
              value: logoUrl ?? `${logo.name} (not uploaded — proof to follow)`,
            },
          ]
        : []),
      ...(logo && logo.preview
        ? [
            {
              key: 'Logo placement',
              value: `x ${Math.round(logoPos.x)}% · y ${Math.round(
                logoPos.y,
              )}% · size ${logoScale}% · ${logoRotate}°`,
            },
          ]
        : []),
      ...(note.trim() ? [{key: 'Note', value: note.trim()}] : []),
      // Composite proof (product + placed logo) — drives the cart thumbnail.
      ...(out ? [{key: 'Design output', value: out}] : []),
      {key: '_custom_print_data', value: JSON.stringify(cd)},
    ];
  };

  const baseReady = customSize ? Boolean(w && h) : true;
  const ready = baseReady && !uploading;

  // The proof is "ready" for the placement currently on screen once it's been
  // prepared for that exact placement (a no-logo personalization needs none).
  const designReady = !logo?.preview || proofSigRef.current === placementSig();

  // Step 1 — render the composite proof + host it (explicit "Prepare" click).
  const handlePrepare = async () => {
    if (!logo?.preview || preparing) return;
    const sig = placementSig();
    setDesignStatus('pending');
    const proof = await buildDesignProof(
      productImgUrl,
      logo.preview,
      logoPos,
      logoScale,
      logoRotate,
    );
    const out = proof
      ? await uploadImage(proof, 'personalized-design.png')
      : null;
    proofSigRef.current = sig;
    proofUrlRef.current = out;
    setDesignStatus(out ? 'ready' : 'error');
  };

  // Step 2 — add to cart (the proof is already hosted, so this is instant).
  const handleAdd = () => {
    if (!selectedVariant || !ready || !designReady || adding) return;
    const out = logo?.preview ? proofUrlRef.current : null;
    void fetcher.submit(
      {
        [CartForm.INPUT_NAME]: JSON.stringify({
          action: CartForm.ACTIONS.LinesAdd,
          inputs: {
            lines: [
              {
                merchandiseId: selectedVariant.id,
                quantity,
                selectedVariant,
                attributes: makeAttributes(out),
              },
            ],
          },
        }),
      },
      {method: 'POST', action: '/cart'},
    );
    open('cart');
  };

  return (
    <div className="rounded-2xl bg-mint/50 p-5 ring-1 ring-black/5">
      {/* Header — title + back to the as-shown view */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-tight text-ink">
            Personalize this design
          </h3>
          <p className="text-xs text-muted">
            Make it yours in a few steps — we proof it before printing.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>

      {/* Step 1 — colour */}
      <PersonalizeStep
        n={1}
        title="Choose a colour"
        hint="Keep the original design, or pick any colour from the spectrum."
      >
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={keepOriginal}
            onClick={() => setKeepOriginal(true)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              keepOriginal
                ? 'border-ink bg-ink text-white'
                : 'border-black/15 bg-white text-ink hover:border-ink'
            }`}
          >
            Keep original
          </button>
          <button
            type="button"
            aria-pressed={!keepOriginal}
            onClick={() => setKeepOriginal(false)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              !keepOriginal
                ? 'border-ink bg-ink text-white'
                : 'border-black/15 bg-white text-ink hover:border-ink'
            }`}
          >
            Custom colour
          </button>
        </div>

        {!keepOriginal ? (
          <ColorSpectrum value={customHex} onChange={setCustomHex} />
        ) : null}

        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          Selected:
          <span className="font-semibold text-ink">
            {keepOriginal ? 'Original colours' : customHex.toUpperCase()}
          </span>
          {!keepOriginal ? (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/15"
              style={{background: customHex}}
            />
          ) : null}
        </p>
      </PersonalizeStep>

      {/* Step 2 — fabric */}
      <PersonalizeStep
        n={2}
        title="Choose a fabric"
        hint="Pick the material we print your design on."
      >
        <SelectMenu
          ariaLabel="Fabric"
          value={fabric}
          onChange={setFabric}
          options={FABRICS.map((f) => ({
            value: f.name,
            label: f.name,
            meta: f.note,
          }))}
        />
      </PersonalizeStep>

      {/* Step 3 — logo */}
      <PersonalizeStep
        n={3}
        title="Add your logo"
        hint="Optional — PNG or JPG. We check print quality and send a proof."
      >
        {!logo ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-white px-4 py-6 text-center transition-colors hover:border-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span className="text-sm font-semibold text-ink">
              Drag a file or{' '}
              <span className="text-brand-700 underline">browse</span>
            </span>
            <span className="text-xs text-muted">
              PNG · JPG, up to 25MB
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-mint">
              {logo.preview ? (
                <img
                  src={logo.preview}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[11px] font-bold text-muted">
                  {(logo.name.split('.').pop() || 'FILE').toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {logo.name}
              </p>
              <p className="text-xs text-muted">
                {Math.round(logo.size / 1024)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLogo(null);
                setLogoUrl(null);
                setLogoStatus('idle');
                setDesignStatus('ready');
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {logoError ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{logoError}</p>
        ) : null}

        {/* CDN upload status */}
        {logo && !logoError ? (
          <p className="mt-2 text-xs font-semibold">
            {logoStatus === 'uploading' ? (
              <span className="text-muted">Uploading artwork…</span>
            ) : logoStatus === 'error' ? (
              <span className="text-red-600">
                Upload failed — we’ll chase the artwork by email.
              </span>
            ) : (
              <span className="text-brand-700">Artwork uploaded ✓</span>
            )}
          </p>
        ) : null}

        {/* Placement — transform the logo on the MAIN product image */}
        {logo?.preview ? (
          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
              </svg>
              On the product image: drag to move, corners to resize, top handle to
              rotate.
            </p>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Size <span className="font-semibold text-ink">{logoScale}%</span>{' '}
                · Rotation{' '}
                <span className="font-semibold text-ink">{logoRotate}°</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setLogoPos({x: 50, y: 50});
                  setLogoScale(40);
                  setLogoRotate(0);
                }}
                className="font-semibold text-brand-700 hover:underline"
              >
                Reset placement
              </button>
            </div>
          </div>
        ) : null}

        {/* Optional note / design brief */}
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">
            Add a note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Anything we should know — colours, placement, text…"
            className="w-full resize-none rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
          />
        </label>
      </PersonalizeStep>

      {/* Step 4 — size */}
      <PersonalizeStep
        n={4}
        title="Pick a size"
        hint="Choose a standard size or enter your own."
      >
        <SelectMenu
          ariaLabel="Size"
          value={customSize ? 'custom' : sizePreset}
          onChange={(v) => {
            if (v === 'custom') {
              setCustomSize(true);
            } else {
              setCustomSize(false);
              setSizePreset(v);
            }
          }}
          options={[
            ...SIZE_PRESETS.map((s) => ({
              value: s.name,
              label: s.name,
              meta: s.dims,
            })),
            {value: 'custom', label: 'Custom size', meta: 'enter your own'},
          ]}
        />
        {customSize ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={4}
              max={80}
              placeholder="W"
              value={w}
              onChange={(e) => setW(e.target.value)}
              aria-label="Custom width in inches"
              className="h-11 w-20 rounded-lg border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="text-muted">×</span>
            <input
              type="number"
              min={4}
              max={80}
              placeholder="H"
              value={h}
              onChange={(e) => setH(e.target.value)}
              aria-label="Custom height in inches"
              className="h-11 w-20 rounded-lg border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="text-sm text-muted">inches</span>
          </div>
        ) : null}
      </PersonalizeStep>

      {/* Step 5 — quantity (mirrors the stock stepper so custom mode is complete) */}
      <PersonalizeStep n={5} title="Quantity">
        <div className="inline-flex h-11 items-center rounded-full border border-black/15">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(MIN_ORDER_QTY, q - 1))}
            disabled={quantity <= MIN_ORDER_QTY}
            className="grid h-full w-11 place-items-center rounded-full text-ink hover:bg-mint disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="w-10 text-center text-sm font-semibold tabular-nums">
            {String(quantity).padStart(2, '0')}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="grid h-full w-11 place-items-center rounded-full text-ink hover:bg-mint"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </PersonalizeStep>

      {/* Summary — restates the choices + the made-to-order promise before add */}
      <div className="mt-2 rounded-xl bg-white p-3 ring-1 ring-black/5">
        <p className="text-xs font-semibold text-ink">Your personalization</p>
        <p className="mt-1 text-xs text-muted">
          Colour: <span className="text-ink">{color}</span> · Fabric:{' '}
          <span className="text-ink">{fabric}</span> · Size:{' '}
          <span className="text-ink">{size}</span> · Logo:{' '}
          <span className="text-ink">{logo ? logo.name : 'None'}</span>
          {note.trim() ? (
            <>
              {' '}
              · Note: <span className="text-ink">added</span>
            </>
          ) : null}
        </p>
        <p className="mt-2 text-[11px] text-muted">
          Made to order · 20–30 days · we email a proof before printing.
        </p>
      </div>

      <div className="mt-6 w-full">
        {logo?.preview && !designReady ? (
          // Step 1 — prepare the proof for the current placement.
          <button
            type="button"
            onClick={() => void handlePrepare()}
            disabled={preparing || uploading || !baseReady}
            className="btn btn-dark w-full min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {preparing ? 'Preparing your design…' : 'Prepare my design'}
          </button>
        ) : (
          <>
            {logo?.preview ? (
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {proofUrlRef.current
                  ? 'Design ready'
                  : 'Proof will follow by email'}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedVariant || !ready || adding}
              className="btn btn-dark w-full min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {adding ? 'Adding…' : 'Add personalized to cart'}
            </button>
          </>
        )}
        {!baseReady ? (
          <p className="mt-2 text-center text-xs text-muted">
            Enter your custom width and height to continue.
          </p>
        ) : uploading ? (
          <p className="mt-2 text-center text-xs text-muted">
            Uploading your artwork…
          </p>
        ) : logo?.preview && !designReady && !preparing ? (
          <p className="mt-2 text-center text-xs text-muted">
            Prepare your design to preview it in the cart.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
  meta,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
}) {
  return (
    <details
      className="accordion group border-b border-black/10"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-base font-semibold text-ink">
        <span>{title}</span>
        <span className="flex items-center gap-3">
          {meta}
          <span className="text-brand-600 transition-transform group-open:rotate-180">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="m6 9 6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    storeAvailability(first: 5) {
      nodes {
        available
        pickUpTime
        location {
          name
        }
      }
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    createdAt
    handle
    descriptionHtml
    description
    images(first: 12) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

// Card shape for the "You may also like" grid — matches what <ProductItem> reads.
const RELATED_PRODUCT_FRAGMENT = `#graphql
  fragment RelatedProduct on Product {
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
` as const;

// Native Shopify recommendation engine (tuned by the Search & Discovery app).
const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productHandle: $handle, intent: RELATED) {
      ...RelatedProduct
    }
  }
  ${RELATED_PRODUCT_FRAGMENT}
` as const;

// Fallback pool for "You may also like" when the native recommendation engine
// returns fewer than 4 (thin order history / uncategorised product / dev store).
// Real, LIVE best-selling products — never hardcoded — used only to top the row
// up to 4; native RELATED items are always preferred and shown first.
const RECOMMENDATIONS_FALLBACK_QUERY = `#graphql
  query RecommendationsFallback(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...RelatedProduct
      }
    }
  }
  ${RELATED_PRODUCT_FRAGMENT}
` as const;
