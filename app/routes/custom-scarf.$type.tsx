import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearchParams,
  redirect,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/custom-scarf.$type';
import {siteOrigin} from '~/lib/seo';
import {useAside} from '~/components/Aside';
import {
  SCARF_STEPS,
  SCARF_DEFAULT_HEX,
  SCARF_PRODUCT_HANDLE,
  SCARF_TYPES,
  MIN_QTY,
  EMAIL_RE,
  money,
  scarfTypeFor,
  sizeFor,
  defaultSizeFor,
  scarfArea,
  scarfTiers,
  scarfUnitPrice,
  scarfNextTier,
  scarfListPrice,
  finishFor,
  scarfAliasFor,
  scarfSku,
} from '~/lib/customScarfData';
import {ProgressBar} from '~/components/custom-print/primitives';
import {QuoteStep} from '~/components/custom-print/QuoteStep';
import {ScarfPreview} from '~/components/custom-scarf/ScarfPreview';
import {ScarfTypeStep} from '~/components/custom-scarf/ScarfTypeStep';
import {ScarfQuantityStep} from '~/components/custom-scarf/ScarfQuantityStep';
import {Breadcrumbs} from '~/components/Breadcrumbs';

/* -------------------------------------------------------------------------- */
/* SEO + loader                                                               */
/* -------------------------------------------------------------------------- */

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentParams,
  nextParams,
}) => currentParams.type !== nextParams.type;

export const meta: Route.MetaFunction = ({matches, data, params}) => {
  const slug = (data?.initialSlug ?? params?.type ?? 'square').toLowerCase();
  const title = `Design a custom scarf — Custom Bandanas`;
  const description = `Order made-to-order scarves: pick the type (square, oblong, or shawl), size, edge finish, material, and colour — with bulk pricing. Artwork is set up after checkout.`;
  const origin = siteOrigin(matches);
  const url = `${origin}/custom-scarf/${slug}`;
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'product'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
  ];
};

type ScarfVariant = {
  id: string;
  size: string;
  material: string;
  amount: number;
  currencyCode: string;
  variantTitle: string;
  image: {url: string; altText: string | null} | null;
};

export async function loader({context, params}: Route.LoaderArgs) {
  // The slug only sets the INITIAL type — unknown slugs redirect to square.
  const typeDef = scarfTypeFor(params.type);
  if (!typeDef) throw redirect('/custom-scarf/square');
  const initialSlug = typeDef.slug;

  const {storefront} = context;
  let variants: ScarfVariant[] = [];
  let currencyCode = 'USD';
  let productTitle = 'Custom Scarf';
  let productHandle = SCARF_PRODUCT_HANDLE;
  try {
    const d = (await storefront.query(SCARF_PRODUCT_QUERY, {
      variables: {handle: SCARF_PRODUCT_HANDLE},
      cache: storefront.CacheLong(),
    })) as {
      product?: {
        title?: string;
        handle?: string;
        variants?: {
          nodes?: Array<{
            id: string;
            title?: string;
            price?: {amount?: string; currencyCode?: string};
            image?: {url?: string; altText?: string | null} | null;
            selectedOptions?: Array<{name: string; value: string}>;
          }>;
        };
      } | null;
    };
    if (d?.product?.title) productTitle = d.product.title;
    if (d?.product?.handle) productHandle = d.product.handle;
    variants = (d?.product?.variants?.nodes ?? []).map((v) => {
      const opt = (n: string) =>
        v.selectedOptions?.find((o) => o.name === n)?.value ?? '';
      return {
        id: v.id,
        size: opt('Size'),
        material: opt('Material'),
        amount: Number(v.price?.amount ?? 0),
        currencyCode: v.price?.currencyCode ?? 'USD',
        variantTitle: v.title ?? '',
        image: v.image?.url
          ? {url: v.image.url, altText: v.image.altText ?? null}
          : null,
      };
    });
    currencyCode = variants[0]?.currencyCode ?? 'USD';
  } catch {
    // Product not published to the headless channel yet — handled in the UI.
  }

  return {variants, currencyCode, productTitle, productHandle, initialSlug};
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export default function CustomScarf() {
  const {variants, currencyCode, productTitle, productHandle, initialSlug} =
    useLoaderData<typeof loader>();
  const {open} = useAside();

  // The CONFIG lives in the URL so a configured scarf is shareable + SSR-safe.
  // Type is in the PATH (/custom-scarf/<type>); size/finish/material/colour/qty
  // are query params. PII (email) + consent stay LOCAL — never in the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const typeSlug = initialSlug; // path-driven
  const typeDef = SCARF_TYPES[typeSlug] ?? SCARF_TYPES.square;

  // Merge-patch the query string (replace = no history spam; keep scroll).
  const setParam = (patch: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v == null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      {replace: true, preventScrollReset: true},
    );
  };

  // Derived config (URL → values, with sensible fallbacks).
  const sizeParam = searchParams.get('size');
  const sizeName =
    sizeParam && typeDef.sizes.some((o) => o.name === sizeParam)
      ? sizeParam
      : defaultSizeFor(typeDef).name;
  const sizeObj = sizeFor(typeDef, sizeName);
  const finish = searchParams.get('finish') ?? 'hem';
  const material = searchParams.get('material') ?? 'Cotton';
  const colorParam = searchParams.get('color');
  const baseHex =
    colorParam && /^[0-9a-fA-F]{6}$/.test(colorParam)
      ? `#${colorParam.toLowerCase()}`
      : SCARF_DEFAULT_HEX;
  const qtyParam = Math.floor(Number(searchParams.get('qty')));
  const qty =
    Number.isFinite(qtyParam) && qtyParam >= MIN_QTY ? qtyParam : MIN_QTY;

  // Setters write to the URL.
  const setSizeName = (n: string) => setParam({size: n});
  const setFinish = (v: string) => setParam({finish: v});
  const setMaterial = (v: string) => setParam({material: v});
  const setBaseHex = (hex: string) => setParam({color: hex.replace('#', '')});
  const setQty = (n: number) => setParam({qty: String(n)});

  // Switching type changes the PATH (keeps the query) and resets size to that
  // type's default, since the size options differ per type.
  function selectType(slug: string) {
    const def = SCARF_TYPES[slug];
    const next = new URLSearchParams(searchParams);
    if (def) next.set('size', defaultSizeFor(def).name);
    const qs = next.toString();
    navigate(`/custom-scarf/${slug}${qs ? `?${qs}` : ''}`, {
      replace: true,
      preventScrollReset: true,
    });
  }

  // Step + PII/consent are LOCAL (a share link carries the config, not these).
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [deliveryAck, setDeliveryAck] = useState(false);
  const [terms, setTerms] = useState(false);

  const stepPanelRef = useRef<HTMLDivElement>(null);
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    stepPanelRef.current?.focus();
  }, [step]);

  // Pricing (placeholder scarf model — area × finish × material, volume ladder).
  const area = useMemo(() => scarfArea(sizeObj.w, sizeObj.h), [sizeObj]);
  const tiers = useMemo(
    () => scarfTiers(area, finish, material),
    [area, finish, material],
  );
  const unit = scarfUnitPrice(qty, area, finish, material);
  const list = scarfListPrice(area, finish, material);
  const total = Math.round(unit * qty * 100) / 100;
  const saved = Math.max(0, Math.round((list - unit) * 100) / 100);
  const nextT = scarfNextTier(qty, area, finish, material);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.material === material) ?? variants[0];
  }, [variants, material]);
  const variantId = selectedVariant?.id ?? null;

  const typeLabel = typeDef.label;
  const sizeDisplay = `${sizeObj.name}″`;
  const finishLabel = finishFor(finish).label;
  const alias = scarfAliasFor(typeSlug, sizeObj.w, sizeObj.h);
  const sku = scarfSku(typeSlug, sizeObj.w, sizeObj.h, material, finish, baseHex);

  const stepValid = [
    Boolean(typeSlug && sizeName && material && finish),
    qty >= MIN_QTY && EMAIL_RE.test(email) && deliveryAck && terms,
    true,
  ];

  const attributes = [
    {key: 'Custom order', value: 'Scarf'},
    {key: 'SKU', value: sku},
    {key: 'Product', value: alias.label},
    {key: 'Type', value: typeLabel},
    {key: 'Size', value: sizeDisplay},
    {key: 'Finish', value: finishLabel},
    {key: 'Material', value: material},
    {key: 'Base colour', value: baseHex.toUpperCase()},
    {key: 'Quantity', value: String(qty)},
    {key: 'Artwork', value: 'Provided after checkout via design intake'},
    {key: 'Contact email', value: email},
  ];

  const lines = variantId
    ? [
        {
          merchandiseId: variantId,
          quantity: qty,
          selectedVariant: selectedVariant
            ? {
                id: `${selectedVariant.id}#${baseHex}-${sizeObj.name}`,
                availableForSale: true,
                title: selectedVariant.variantTitle,
                price: {amount: String(selectedVariant.amount), currencyCode},
                image: selectedVariant.image,
                product: {handle: productHandle, title: productTitle},
              }
            : undefined,
          attributes,
        },
      ]
    : [];

  const specs = [
    {label: 'Type', value: typeLabel},
    {label: 'Size', value: sizeDisplay},
    {label: 'Finish', value: finishLabel},
    {label: 'Material', value: material},
    {label: 'Base colour', value: baseHex.toUpperCase(), color: baseHex},
  ];

  const canNext = stepValid[step];
  const isLast = step === SCARF_STEPS.length - 1;

  return (
    <div className="bg-paper">
      <div className="ui-container py-8 md:py-12">
        <Breadcrumbs
          items={[
            {label: 'Home', href: '/'},
            {label: 'Made to order', href: '/collections/made-to-order-collections'},
            {label: `${typeLabel}`},
          ]}
        />
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          {/* Left — live preview */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ScarfPreview
              w={sizeObj.w}
              h={sizeObj.h}
              baseColor={baseHex}
              finish={finish}
              logoPreview={null}
              showDims
            />
          </div>

          {/* Right — configurator */}
          <div className="min-w-0 lg:py-2">
            <p className="eyebrow text-brand-700">Custom Cut</p>
            <h1 className="mt-1 text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
              {typeLabel}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-2xl font-extrabold leading-none text-ink">
                {money(total, currencyCode)}
              </span>
              <span className="text-sm leading-none text-muted">
                {money(unit, currencyCode)}/pc · {qty} pcs
              </span>
            </div>

            <ProgressBar step={step} steps={SCARF_STEPS} />

            <div
              ref={stepPanelRef}
              tabIndex={-1}
              role="group"
              aria-label={`Step ${step + 1} of ${SCARF_STEPS.length}: ${SCARF_STEPS[step]}`}
              className="mt-6 outline-none"
            >
              {step === 0 ? (
                <ScarfTypeStep
                  typeSlug={typeSlug}
                  onSelectType={selectType}
                  sizes={typeDef.sizes}
                  sizeName={sizeName}
                  onSelectSize={setSizeName}
                  finish={finish}
                  setFinish={setFinish}
                  material={material}
                  setMaterial={setMaterial}
                  baseHex={baseHex}
                  setBaseHex={setBaseHex}
                />
              ) : null}

              {step === 1 ? (
                <ScarfQuantityStep
                  qty={qty}
                  setQty={setQty}
                  currencyCode={currencyCode}
                  tiers={tiers}
                  email={email}
                  setEmail={setEmail}
                  deliveryAck={deliveryAck}
                  setDeliveryAck={setDeliveryAck}
                  terms={terms}
                  setTerms={setTerms}
                />
              ) : null}

              {step === 2 ? (
                <QuoteStep
                  noun="Scarf"
                  shape={typeLabel}
                  size={sizeDisplay}
                  material={material}
                  qty={qty}
                  list={list}
                  unit={unit}
                  total={total}
                  saved={saved}
                  nextT={nextT}
                  currencyCode={currencyCode}
                  variantId={variantId}
                  lines={lines}
                  designStatus="ready"
                  onAdded={() => open('cart')}
                  onRetry={() => {}}
                  specs={specs}
                  preview={
                    <div className="h-full w-full">
                      <ScarfPreview
                        w={sizeObj.w}
                        h={sizeObj.h}
                        baseColor={baseHex}
                        finish={finish}
                        logoPreview={null}
                        compact
                      />
                    </div>
                  }
                />
              ) : null}
            </div>

            {/* Step nav */}
            {!isLast ? (
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="btn btn-outline min-h-11 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => canNext && setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="btn btn-dark min-h-11 disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="btn btn-outline min-h-11"
                >
                  Back
                </button>
              </div>
            )}

            {variants.length === 0 ? (
              <p className="mt-4 text-xs text-muted">
                Tip: publish the{' '}
                <span className="font-semibold">{productTitle}</span> product to
                the Headless channel to enable checkout.{' '}
                <Link className="underline" to="/custom-print/square">
                  See the bandana wizard →
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const SCARF_PRODUCT_QUERY = `#graphql
  query ScarfProduct(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      variants(first: 100) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
          image {
            url
            altText
            width
            height
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
` as const;
