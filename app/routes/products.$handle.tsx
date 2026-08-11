import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, useLoaderData, redirect} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import type {
  ProductFragment,
  RelatedProductFragment,
} from 'storefrontapi.generated';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductGallery} from '~/components/ProductGallery';
import {ProductForm} from '~/components/ProductForm';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {useAside} from '~/components/Aside';
import {ProductItem} from '~/components/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {siteOrigin} from '~/lib/seo';

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
  const url = `${siteOrigin(matches)}/products/${product.handle}`;

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
        offers: variant?.price
          ? {
              '@type': 'Offer',
              priceCurrency: variant.price.currencyCode,
              price: variant.price.amount,
              availability: variant.availableForSale
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url,
            }
          : undefined,
      },
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // The made-to-order "Design your bandana" product has no real PDP — it's a
  // variant/price carrier for checkout. Any hit on its product page (shop card,
  // direct link, search) goes to the custom-print wizard instead.
  if (args.params.handle === 'design-your-bandana') {
    return redirect('/custom-print/design');
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

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
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

  // "You may also like" — Shopify's NATIVE recommendation engine only (the same
  // one the Search & Discovery app tunes), fetched below the fold so it never
  // blocks TTFB. `productRecommendations(intent: RELATED)` is algorithm-driven:
  // every item it returns is genuinely related, so we show exactly those and
  // nothing else. When it returns nothing (thin order history / uncategorized
  // product), the row simply hides — we never pad with unrelated best-sellers.
  const recommendations = handle
    ? storefront
        .query(PRODUCT_RECOMMENDATIONS_QUERY, {
          variables: {handle},
          cache: storefront.CacheLong(),
        })
        .then((data) => data?.recommended ?? [])
        .catch(() => [])
    : Promise.resolve([]);

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
  const [quantity, setQuantity] = useState(1);
  // Buy the design as-shown, or open the personalize configurator.
  const [mode, setMode] = useState<'stock' | 'custom'>('stock');

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
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          {/* Gallery */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery
              images={galleryImages}
              title={title}
              activeImageUrl={selectedVariant?.image?.url}
            />
          </div>

          {/* Product info */}
          <div className="lg:py-2">
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
                />
              )}
            </div>

            <TrustLine />

            <div className="mt-8 border-t border-black/10">
              <Accordion title="Description" defaultOpen>
                <div
                  className="prose max-w-none text-sm text-muted [&_a]:text-brand-700 [&_a]:underline"
                  dangerouslySetInnerHTML={{__html: descriptionHtml}}
                />
              </Accordion>
              <Accordion title="Shipping & Returns">
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
              <Accordion title="Reviews (373)" meta={<Stars />}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-extrabold leading-none text-ink">
                    5.0
                  </div>
                  <div>
                    <Stars />
                    <p className="mt-1 text-xs text-muted">
                      Based on 373 verified reviews
                    </p>
                  </div>
                </div>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

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

function Stars({count = 5}: {count?: number}) {
  return (
    <span
      className="flex items-center gap-0.5 text-brand-500"
      aria-label={`${count} out of 5 stars`}
    >
      {Array.from({length: 5}).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z"
            fill={i < count ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </span>
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
function PersonalizeSection({
  selectedVariant,
  quantity,
  setQuantity,
  onBack,
}: {
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  quantity: number;
  setQuantity: (fn: (q: number) => number) => void;
  /** Return to the "buy as shown" view. */
  onBack: () => void;
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
  const [logo, setLogo] = useState<{
    name: string;
    type: string;
    size: number;
    preview: string | null;
  } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file?: File | null) => {
    setLogoError(null);
    if (!file) return;
    const okType =
      /^image\/(png|jpeg|svg\+xml)$/.test(file.type) ||
      file.type === 'application/pdf';
    if (!okType) {
      setLogoError('Please use a PNG, JPG, SVG or PDF file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setLogoError('That file is over 25MB — please upload a smaller one.');
      return;
    }
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null;
    setLogo({name: file.name, type: file.type, size: file.size, preview});
  };

  const size = customSize
    ? `Custom ${w || '?'} × ${h || '?'} in`
    : SIZE_PRESETS.find((s) => s.name === sizePreset)?.dims ?? sizePreset;

  const customData = {
    v: 1,
    color,
    fabric,
    size,
    logo: logo
      ? {
          name: logo.name,
          type: logo.type,
          sizeKB: Math.round(logo.size / 1024),
          // TODO: set once an upload endpoint exists.
          url: null as string | null,
        }
      : null,
  };

  const attributes = [
    {key: 'Personalized', value: 'Yes'},
    {key: 'Color', value: color},
    {key: 'Fabric', value: fabric},
    {key: 'Size', value: size},
    ...(logo ? [{key: 'Logo', value: logo.name}] : []),
    {key: '_custom_print_data', value: JSON.stringify(customData)},
  ];

  const lines = selectedVariant
    ? [
        {
          merchandiseId: selectedVariant.id,
          quantity,
          selectedVariant,
          attributes,
        },
      ]
    : [];

  const ready = customSize ? Boolean(w && h) : true;

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
        hint="Optional — PNG, JPG, SVG or PDF. We check print quality and send a proof."
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
              PNG · JPG · SVG · PDF, up to 25MB
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
          accept="image/png,image/jpeg,image/svg+xml,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {logoError ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{logoError}</p>
        ) : null}
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
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
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
        </p>
        <p className="mt-2 text-[11px] text-muted">
          Made to order · 20–30 days · we email a proof before printing.
        </p>
      </div>

      <div className="mt-6 w-full [&_form]:max-w-full">
        <AddToCartButton
          className="btn btn-dark w-full min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!selectedVariant || !ready}
          onClick={() => open('cart')}
          lines={lines}
        >
          Add personalized to cart
        </AddToCartButton>
        {!ready ? (
          <p className="mt-2 text-center text-xs text-muted">
            Enter your custom width and height to continue.
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
