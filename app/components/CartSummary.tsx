import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {useAside} from '~/components/Aside';
import {CartDeliveryOptions} from '~/components/CartDeliveryOptions';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

// Free shipping threshold — matches the "Free shipping over $75" value prop.
const FREE_SHIP_THRESHOLD = 75;

export function CartSummary({cart, layout}: CartSummaryProps) {
  const {close} = useAside();
  const subtotal = cart?.cost?.subtotalAmount;
  const currencyCode = subtotal?.currencyCode ?? 'USD';
  const subtotalNum = Number(subtotal?.amount ?? 0);
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotalNum);
  const pct = Math.min(100, (subtotalNum / FREE_SHIP_THRESHOLD) * 100);

  return (
    <div className="shrink-0 space-y-4 border-t border-black/10 bg-paper px-5 py-4">
      <CartDiscounts discountCodes={cart?.discountCodes} />

      {/* Free-shipping progress */}
      <div className="rounded-xl bg-mint px-3 py-2.5">
        {remaining > 0 ? (
          <p className="text-xs font-medium text-brand-800">
            Add{' '}
            <Money
              as="span"
              data={{amount: remaining.toFixed(2), currencyCode}}
              className="font-bold"
            />{' '}
            more for <span className="font-bold">free shipping</span>
          </p>
        ) : (
          <p className="text-xs font-bold text-brand-800">
            ✓ You&rsquo;ve unlocked free shipping!
          </p>
        )}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
            style={{width: `${pct}%`}}
          />
        </div>
      </div>

      {/* Totals */}
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="font-semibold text-ink">
            {subtotal?.amount ? <Money data={subtotal} /> : '—'}
          </dd>
        </div>
        <p className="text-xs text-muted">
          Shipping &amp; taxes calculated at checkout
        </p>
      </dl>

      <div className="flex items-baseline justify-between border-t border-black/10 pt-3">
        <span className="text-base font-extrabold uppercase tracking-tight">
          Total
        </span>
        <span className="text-xl font-extrabold text-ink">
          {subtotal?.amount ? <Money data={subtotal} /> : '—'}
        </span>
      </div>

      {/* Path B — native fulfillment method selector (Ship / Pickup / Local) */}
      <CartDeliveryOptions cart={cart} />

      {/* Actions */}
      <div className="space-y-2">
        <CartCheckoutButton checkoutUrl={cart?.checkoutUrl} />
        {layout === 'aside' ? (
          <button
            type="button"
            onClick={close}
            className="btn btn-outline w-full"
          >
            Continue Shopping
          </button>
        ) : (
          <Link to="/collections" className="btn btn-outline w-full">
            Continue Shopping
          </Link>
        )}
      </div>

      {/* Trust badges */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
        {['Secure checkout', 'Buyer protection', 'Easy returns'].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartCheckoutButton({checkoutUrl}: {checkoutUrl?: string}) {
  if (!checkoutUrl) return null;
  return (
    <a href={checkoutUrl} target="_self" className="btn btn-dark w-full">
      Proceed to Checkout →
    </a>
  );
}

function CartDiscounts({
  discountCodes,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    // The global `form { max-width: 400px }` reset caps CartForm's <form> and
    // makes the pill fall short of the drawer width — clear it for these forms.
    <div className="[&_form]:w-full [&_form]:max-w-none">
      {/* Applied codes with a remove option */}
      {codes.length > 0 && (
        <UpdateDiscountForm>
          <div className="mb-2 flex items-center justify-between rounded-full bg-mint px-3 py-1.5 text-sm">
            <span className="font-semibold text-brand-800">
              {codes.join(', ')}
            </span>
            <button
              type="submit"
              aria-label="Remove discount"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Remove
            </button>
          </div>
        </UpdateDiscountForm>
      )}

      {/* Promo code input */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className="flex items-center gap-2 rounded-full border border-black/15 bg-white pl-4 pr-1.5">
          <span className="text-muted" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M4 12 12 4l7 1 1 7-8 8-9-8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="14.5" cy="9.5" r="1.2" fill="currentColor" />
            </svg>
          </span>
          <input
            type="text"
            name="discountCode"
            placeholder="Promo code"
            className="!m-0 h-10 flex-1 !border-0 !bg-transparent !p-0 text-sm text-ink placeholder:text-muted focus:!outline-none"
          />
          <button
            type="submit"
            className="btn btn-dark !px-4 !py-1.5 text-xs"
            aria-label="Apply discount code"
          >
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </div>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{discountCodes: discountCodes || []}}
    >
      {children}
    </CartForm>
  );
}
