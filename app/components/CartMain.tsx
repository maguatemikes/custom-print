import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // useOptimisticCart applies pending actions so the user sees feedback instantly.
  const cart = useOptimisticCart(originalCart);

  const lines = cart?.lines?.nodes ?? [];
  const cartHasItems = (cart?.totalQuantity ?? 0) > 0;
  const childrenMap = getLineItemChildrenMap(lines);
  const count = cart?.totalQuantity ?? 0;

  // Only render parent lines at the root of the cart.
  const rootLines = lines.filter(
    (line) =>
      !('parentRelationship' in line && line.parentRelationship?.parent),
  );

  if (!cartHasItems) {
    return <CartEmpty />;
  }

  if (layout === 'page') {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {rootLines.map((line) => (
            <CartLineItem
              key={line.id}
              line={line}
              layout={layout}
              childrenMap={childrenMap}
            />
          ))}
        </ul>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <CartSummary cart={cart} layout={layout} />
        </div>
      </div>
    );
  }

  // Aside (drawer): scrollable line items + sticky summary footer.
  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 px-5 pt-4 text-sm text-muted">
        {count} {count === 1 ? 'item' : 'items'} in your cart
      </p>
      <ul className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {rootLines.map((line) => (
          <CartLineItem
            key={line.id}
            line={line}
            layout={layout}
            childrenMap={childrenMap}
          />
        ))}
      </ul>
      <CartSummary cart={cart} layout={layout} />
    </div>
  );
}

function CartEmpty() {
  const {close} = useAside();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-mint text-brand-600">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17.5" cy="20" r="1.4" />
          <path d="M3 4h2l2.2 11.3a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.2L20 7.5H6" />
        </svg>
      </span>
      <div>
        <p className="text-lg font-bold text-ink">Your cart is empty</p>
        <p className="mt-1 text-sm text-muted">
          Looks like you haven&rsquo;t added anything yet.
        </p>
      </div>
      <Link
        to="/collections"
        onClick={close}
        prefetch="viewport"
        className="btn btn-dark mt-2"
      >
        Start shopping
      </Link>
    </div>
  );
}
