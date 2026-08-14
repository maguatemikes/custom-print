import {type Dispatch, type SetStateAction} from 'react';
import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {MIN_ORDER_QTY} from '~/lib/cart';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
  quantity,
  setQuantity,
  onPersonalize,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  quantity: number;
  setQuantity: Dispatch<SetStateAction<number>>;
  /** Opens the personalize configurator; renders the "Personalize me" CTA. */
  onPersonalize?: () => void;
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const available = Boolean(selectedVariant?.availableForSale);

  const lines = selectedVariant
    ? [{merchandiseId: selectedVariant.id, quantity, selectedVariant}]
    : [];

  return (
    <div>
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;

        // Treat an option as colour swatches if it's named Color/Colour, or if
        // any value carries a native swatch. This way a colour option still
        // renders as swatches even when no hex/swatch was set in Shopify — we
        // fall back to the variant photo, then a name→hex map (see ColorSwatch).
        const isColor =
          /colou?r/i.test(option.name) ||
          option.optionValues.some(
            (v) => v.swatch && (v.swatch.color || v.swatch.image),
          );

        // Native: getProductOptions flags the current selection per value.
        const selectedName = option.optionValues.find((v) => v.selected)?.name;

        return (
          <div className="mb-6" key={option.name}>
            <h3 className="mb-2 text-sm font-semibold text-ink">
              {option.name}
              {selectedName ? (
                <span className="font-normal text-muted">: {selectedName}</span>
              ) : null}
            </h3>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available: valueAvailable,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                const commonProps = {
                  key: option.name + name,
                  title: name,
                  'aria-label': name,
                };

                const content = isColor ? (
                  <ColorSwatch
                    swatch={swatch}
                    name={name}
                    selected={selected}
                    variantImage={value.firstSelectableVariant?.image?.url}
                  />
                ) : (
                  <SizeBox name={name} selected={selected} />
                );

                if (isDifferentProduct) {
                  return (
                    <Link
                      {...commonProps}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      style={{opacity: valueAvailable ? 1 : 0.35}}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    {...commonProps}
                    type="button"
                    disabled={!exists}
                    style={{opacity: valueAvailable ? 1 : 0.35}}
                    onClick={() => {
                      if (!selected) {
                        void navigate(`?${variantUriQuery}`, {
                          replace: true,
                          preventScrollReset: true,
                        });
                      }
                    }}
                    className="disabled:cursor-not-allowed"
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-ink">Quantity</h3>
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
      </div>

      {/* Actions — Add to cart, with Personalize me to its right */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AddToCartButton
          className="btn w-full min-h-11 bg-orange-500 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!available}
          onClick={() => open('cart')}
          lines={lines}
        >
          {available ? 'Pre order' : 'Sold out'}
        </AddToCartButton>
        {onPersonalize ? (
          <button
            type="button"
            onClick={onPersonalize}
            className="btn btn-outline w-full min-h-11"
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 3l1.9 5.1L20 10l-5.1 1.9L13 17l-1.9-5.1L6 10l5.1-1.9z" />
              <path d="M6 16v4M4 18h4" />
            </svg>
            Personalize me
          </button>
        ) : (
          <AddToCartButton
            className="btn btn-dark w-full min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!available}
            redirectTo="checkout"
            lines={lines}
          >
            Buy it now
          </AddToCartButton>
        )}
      </div>
    </div>
  );
}

/**
 * Common colour names → hex, used as a cheap fallback when a value has no
 * Shopify swatch and no variant photo. Names are matched case-insensitively.
 */
const COLOR_HEX: Record<string, string> = {
  black: '#111111', white: '#f5f5f5', ivory: '#fffff0', cream: '#f5f0e1',
  beige: '#e8dcc4', tan: '#d2b48c', khaki: '#c3b091', sand: '#dcc9a6',
  brown: '#6b4423', chocolate: '#3f2a1d', camel: '#c19a6b',
  grey: '#9ca3af', gray: '#9ca3af', charcoal: '#36454f', slate: '#5b6770',
  silver: '#c0c0c0',
  navy: '#1f2a44', blue: '#2f5cd0', 'light blue': '#8fb8e0', 'sky blue': '#87ceeb',
  denim: '#3b5a80', teal: '#008080', turquoise: '#40e0d0', aqua: '#66cdcc',
  green: '#3f9142', olive: '#556b2f', forest: '#228b22', 'forest green': '#228b22',
  mint: '#a8e6cf', sage: '#9caf88', lime: '#a3d54b',
  yellow: '#f4c430', gold: '#d4af37', mustard: '#d4a017',
  orange: '#e8791f', rust: '#b7410e', terracotta: '#c26a4a',
  red: '#c0392b', maroon: '#7b241c', burgundy: '#6d1f2b', wine: '#722f37',
  pink: '#e79ab0', 'hot pink': '#ff69b4', rose: '#d98695', blush: '#e6b7bc',
  coral: '#f5836b', salmon: '#f0876c', peach: '#ffc1a1',
  purple: '#7b4bb7', lavender: '#c4b0e0', violet: '#8f5bd4', plum: '#673147',
  multicolor: '#9ca3af', multi: '#9ca3af', multicolour: '#9ca3af',
};

function colorFromName(name: string): string | undefined {
  return COLOR_HEX[name.trim().toLowerCase()];
}

/** Append a Shopify CDN size transform so swatches load a tiny thumbnail,
 *  not the full product image (≈2–4 KB each instead of ~1 MB). */
function tinySwatch(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}width=96&height=96&crop=center`;
}

function ColorSwatch({
  swatch,
  name,
  selected,
  variantImage,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
  selected: boolean;
  variantImage?: string | null;
}) {
  // Priority: native swatch image → variant photo → native swatch colour →
  // name→hex → neutral grey. Image wins visually; colour sits behind it as a
  // load/failure fallback.
  const imageUrl = swatch?.image?.previewImage?.url || variantImage || null;
  const color = swatch?.color || colorFromName(name) || '#e5e7eb';
  // Image swatches read as mini product thumbnails → rounded square (standard).
  // Solid colour dots stay circular.
  const shape = imageUrl ? 'rounded-xl' : 'rounded-full';

  return (
    <span
      className={`grid h-9 w-9 place-items-center transition ${shape} ${
        selected ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-black/10'
      }`}
    >
      <span
        className={`block h-7 w-7 overflow-hidden bg-cover bg-center ${shape}`}
        style={{
          backgroundColor: color,
          backgroundImage: imageUrl ? `url(${tinySwatch(imageUrl)})` : undefined,
        }}
      >
        <span className="sr-only">{name}</span>
      </span>
    </span>
  );
}

function SizeBox({name, selected}: {name: string; selected: boolean}) {
  return (
    <span
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
        selected
          ? 'border-ink bg-ink text-white'
          : 'border-black/15 bg-white text-ink hover:border-ink'
      }`}
    >
      {name}
    </span>
  );
}
