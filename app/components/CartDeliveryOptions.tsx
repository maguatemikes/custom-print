import {useFetchers} from 'react-router';
import {CartForm, type OptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

/**
 * Native fulfillment-method selector for the cart.
 *
 * Clicking a tile fires the `CustomSetDeliveryMethod` cart action, which:
 *  1) sets a delivery **preference** on `buyerIdentity`
 *     (`preferences.delivery.deliveryMethod`) — pre-fills the Ship/Pickup tab at
 *     Shopify's hosted checkout (no `deliveryGroups` handle required), and
 *  2) mirrors the choice to a cart **attribute** (`delivery_method`) so the cart
 *     UI can show which is active (preferences aren't readable back).
 *
 * Selection is **optimistic** — the tile highlights the instant it's clicked (via
 * the in-flight fetcher), then settles to the server value, so it feels instant
 * despite the save round-trip.
 */
export function CartDeliveryOptions({
  cart,
}: {
  cart: OptimisticCart<CartApiQueryFragment | null>;
}) {
  const pending = usePendingDeliveryMethod();
  const saved =
    cart?.attributes?.find((a) => a.key === 'delivery_method')?.value ?? null;
  const active = pending ?? saved; // optimistic: pending wins

  if (!cart?.totalQuantity) return null;

  return (
    <div className="rounded-xl border border-black/10 p-3">
      <p className="text-sm font-semibold text-ink">How you&rsquo;ll get it</p>
      <div className="mt-2 grid grid-cols-2 gap-2 [&_form]:w-full [&_form]:max-w-none">
        <PreferenceTile
          method="PICK_UP"
          label="Pickup"
          sub="Berlin, NJ"
          active={active === 'PICK_UP'}
          icon={
            <svg {...ICON}>
              <path d="M4 9h16M5 9l1-4h12l1 4M5 9v11h14V9M9 20v-6h6v6" />
            </svg>
          }
        />
        <PreferenceTile
          method="SHIPPING"
          label="Ship"
          sub="To your address"
          active={active === 'SHIPPING'}
          icon={
            <svg {...ICON}>
              <path d="M1 4h15v12H1zM16 8h4l3 3v5h-7" />
              <circle cx="5.5" cy="18.5" r="1.6" />
              <circle cx="18.5" cy="18.5" r="1.6" />
            </svg>
          }
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Pre-selects your choice at checkout — you can still change it there.
      </p>
    </div>
  );
}

/** Returns the delivery method of an in-flight CustomSetDeliveryMethod submit,
 *  so the clicked tile highlights immediately (before the server responds). */
function usePendingDeliveryMethod(): string | null {
  const fetchers = useFetchers();
  for (const f of fetchers) {
    if (f.state === 'idle' || !f.formData) continue;
    for (const value of f.formData.values()) {
      if (typeof value === 'string' && value.includes('CustomSetDeliveryMethod')) {
        try {
          const parsed = JSON.parse(value) as {inputs?: {method?: string}};
          const method = parsed?.inputs?.method;
          if (method) return String(method);
        } catch {
          // not the JSON payload — keep looking
        }
      }
    }
  }
  return null;
}

const ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-5 w-5',
  'aria-hidden': true,
};

function PreferenceTile({
  method,
  label,
  sub,
  active,
  icon,
}: {
  method: 'PICK_UP' | 'SHIPPING';
  label: string;
  sub: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action="CustomSetDeliveryMethod"
      inputs={{method}}
    >
      <button
        type="submit"
        aria-pressed={active}
        className={`flex w-full flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors ${
          active
            ? 'border-brand-600 bg-mint'
            : 'border-black/10 bg-white hover:border-black/25'
        }`}
      >
        <span className={active ? 'text-brand-700' : 'text-muted'}>{icon}</span>
        <span className="mt-2 text-sm font-bold text-ink">{label}</span>
        <span className="text-xs text-muted">{sub}</span>
      </button>
    </CartForm>
  );
}
