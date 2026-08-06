import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  // Only treat it as "on sale" when compare-at is genuinely higher than price.
  const onSale =
    !!compareAtPrice &&
    !!price &&
    Number(compareAtPrice.amount) > Number(price.amount);

  return (
    <div
      aria-label="Price"
      className="flex items-baseline gap-3 text-2xl font-extrabold text-ink"
      role="group"
    >
      {price ? <Money data={price} /> : <span>&nbsp;</span>}
      {onSale && compareAtPrice ? (
        <s className="text-lg font-semibold text-muted">
          <Money data={compareAtPrice} />
        </s>
      ) : null}
    </div>
  );
}
