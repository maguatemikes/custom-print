import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, Money, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {useAside} from './Aside';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single cart line item — image, title, options, quantity stepper, price,
 * and a remove button. Child component lines render nested below.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  // While the just-added line is still optimistic (server hasn't confirmed the
  // real line id yet), present it as "confirming" so it reads as loading — not
  // as broken/inert controls.
  const pending = !!line.isOptimistic;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  // Only show real (non-"Title: Default Title") options.
  const options = selectedOptions.filter(
    (o) => o.value && o.value !== 'Default Title',
  );

  // Custom-print lines carry a hosted "Design output" proof (the whole rendered
  // bandana). Use it as the thumbnail so the customer sees their design right in
  // the cart — the variant image is empty for the made-to-order product.
  const designOutput = line.attributes?.find(
    (a) => a.key === 'Design output',
  )?.value;
  // A blank (no-print) bandana has no proof image — fall back to its solid base
  // colour so the cart shows the actual product, not an empty tile.
  const baseColour = line.attributes?.find(
    (a) => a.key === 'Base colour',
  )?.value;

  return (
    <li
      key={id}
      aria-busy={pending}
      className={`rounded-2xl border border-black/10 bg-paper p-3 transition-opacity ${
        pending ? 'opacity-80' : ''
      }`}
    >
      <div className="flex gap-3">
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => layout === 'aside' && close()}
          className="shrink-0"
        >
          {designOutput ? (
            // The design proof (transparent for triangles) — object-contain so
            // the whole shape shows; bg-mint fills any transparent area on-brand.
            <img
              src={designOutput}
              alt={`${product.title} — your design`}
              height={80}
              width={80}
              loading="lazy"
              className="h-20 w-20 rounded-xl bg-mint object-contain"
            />
          ) : image ? (
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={80}
              width={80}
              loading="lazy"
              className="h-20 w-20 rounded-xl bg-mint object-cover"
            />
          ) : baseColour ? (
            <div
              className="h-20 w-20 rounded-xl ring-1 ring-inset ring-black/10"
              style={{backgroundColor: baseColour}}
              aria-label={`${product.title} — ${baseColour}`}
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-mint" />
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => layout === 'aside' && close()}
              className="min-w-0"
            >
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                {product.title}
              </p>
            </Link>
            <CartLineRemoveButton
              lineIds={[id]}
              disabled={!!line.isOptimistic}
            />
          </div>

          {options.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted">
              {options.map((o) => o.value).join(' · ')}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-2">
            <CartLineQuantity line={line} />
            <span className="text-sm font-bold text-ink">
              {line?.cost?.totalAmount ? (
                <Money data={line.cost.totalAmount} />
              ) : null}
            </span>
          </div>
        </div>
      </div>

      {lineItemChildren ? (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="space-y-3">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Quantity stepper (− N +). Disabled while the line is optimistic (server
 * hasn't confirmed yet).
 */
function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  const btn =
    'grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-mint disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="inline-flex items-center rounded-full border border-black/15">
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          className={btn}
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
            <path
              d="M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </CartLineUpdateButton>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">
        {quantity}
      </span>
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          className={btn}
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

/** Remove-line button rendered as a trash icon. */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        aria-label={disabled ? 'Adding item…' : 'Remove item'}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          disabled
            ? 'text-brand-600'
            : 'text-muted hover:bg-red-50 hover:text-red-600'
        }`}
      >
        {disabled ? (
          // Confirming with Shopify — reads as loading, not a dead button.
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          >
            <path
              d="M12 3a9 9 0 1 0 9 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/** Unique key so concurrent updates to the same line cancel each other. */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
