import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  ShopProductFragment,
  RecommendedProductFragment,
  RelatedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | ShopProductFragment
    | ProductItemFragment
    | RecommendedProductFragment
    | RelatedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  // The made-to-order product stays visible in the shop, but its card (and PDP,
  // see routes/products.$handle) routes to the custom-print wizard instead of a
  // generic product page.
  const isCustom = product.handle === 'design-your-bandana';
  const to = isCustom ? '/custom-print/design' : variantUrl;

  return (
    <Link className="group block" key={product.id} prefetch="intent" to={to}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-mint">
        {image ? (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 50vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : isCustom ? (
          // The made-to-order product has no Shopify image — use a bundled
          // mosaic, inset with padding on the mint tile so it reads as a framed
          // "design your own" card that balances with the product photos.
          <div className="h-full w-full p-3">
            <img
              src="/custom-print-mosaic.avif"
              alt="Design your custom bandana"
              loading={loading}
              className="h-full w-full rounded-lg object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-brand-600">
            <span className="text-sm font-bold lowercase">custombandanas</span>
          </div>
        )}

        {/* Wishlist */}
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <div className="mt-3 px-1">
        <h4 className="text-sm font-bold leading-snug text-ink">
          {product.title}
        </h4>
        {product.vendor ? (
          <p className="text-xs text-muted">{product.vendor}</p>
        ) : null}
        <div className="mt-1 text-sm font-bold text-brand-700">
          <Money data={product.priceRange.minVariantPrice} />
        </div>
      </div>
    </Link>
  );
}
