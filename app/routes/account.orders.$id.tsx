import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Order ${data?.order?.name} — Custom Bandanas`},
    {name: 'robots', content: 'noindex,nofollow'},
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;
  const lineItems = order.lineItems.nodes;
  const discountApplications = order.discountApplications.nodes;
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';
  const firstDiscount = discountApplications[0]?.value;

  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<typeof firstDiscount, {__typename: 'MoneyV2'}>)
      : null;

  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  };
}

const cardCls =
  'rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(11,22,34,0.35)] md:p-6';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrderRoute() {
  const {order, lineItems, discountValue, discountPercentage, fulfillmentStatus} =
    useLoaderData<typeof loader>();
  const hasDiscount = !!(
    (discountValue && discountValue.amount) ||
    discountPercentage
  );

  const status = (order.fulfillmentStatus ?? '').toUpperCase();
  const fulfilled = status === 'FULFILLED';
  const steps = [
    {label: 'Placed', state: 'done', date: fmtDate(order.processedAt)},
    {label: 'Confirmed', state: 'done', date: ''},
    {label: 'In production', state: fulfilled ? 'done' : 'now', date: fulfilled ? '' : 'Now'},
    {label: 'Fulfilled', state: fulfilled ? 'done' : '', date: ''},
  ] as const;

  return (
    <>
      <Link
        to="/account/orders"
        prefetch="intent"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Back to overview
      </Link>

      {/* header + tracker */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Order {order.name}</h1>
            <div className="mt-1 text-xs text-muted">
              Placed {fmtDate(order.processedAt)}
              {order.confirmationNumber ? ` · ${order.confirmationNumber}` : ''}
            </div>
          </div>
          <a
            href={order.statusPageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-sm font-semibold text-ink transition hover:bg-mint"
          >
            Track shipment →
          </a>
        </div>

        <ol className="mt-8 flex">
          {steps.map((s, i) => (
            <li key={s.label} className="relative flex-1 px-1 pt-6 text-center">
              {i > 0 ? <span className={`absolute left-[calc(-50%+9px)] top-[8px] h-0.5 w-full ${s.state ? 'bg-emerald-500' : 'bg-black/10'}`} /> : null}
              <span className={`absolute left-[calc(50%-9px)] top-0 grid h-[18px] w-[18px] place-items-center rounded-full ${s.state === 'done' ? 'bg-emerald-500' : s.state === 'now' ? 'bg-brand-500 ring-4 ring-brand-500/25' : 'border-2 border-black/15 bg-white'}`}>
                {s.state === 'done' ? <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg> : null}
              </span>
              <div className={`text-[9px] font-bold uppercase leading-tight tracking-normal sm:text-[11px] sm:tracking-wide ${s.state ? 'text-ink' : ''}`} style={!s.state ? {color: '#94a1b3'} : undefined}>{s.label}</div>
              <div className="mt-0.5 text-[10px] text-muted">{s.date}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* items */}
        <div className={cardCls}>
          <h2 className="text-lg font-bold text-ink">Items · {lineItems.length}</h2>
          <div className="mt-2 divide-y divide-black/[0.06]">
            {lineItems.map((it) => (
              <OrderLineRow key={it.id} lineItem={it} />
            ))}
          </div>
        </div>

        {/* summary + shipping */}
        <div className="space-y-6">
          <div className={cardCls}>
            <h2 className="text-lg font-bold text-ink">Summary</h2>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              {hasDiscount ? (
                <Row label="Discount">
                  {discountPercentage ? <span>-{discountPercentage}%</span> : discountValue ? <Money data={discountValue} /> : null}
                </Row>
              ) : null}
              <Row label="Subtotal"><Money data={order.subtotal!} /></Row>
              <Row label="Tax"><Money data={order.totalTax!} /></Row>
              <div className="mt-1 flex items-center justify-between border-t border-black/[0.08] pt-3 text-[15px] font-bold text-ink">
                <span>Total</span>
                <span className="tabular-nums"><Money data={order.totalPrice!} /></span>
              </div>
            </div>
          </div>

          {order?.shippingAddress ? (
            <div className={cardCls}>
              <h2 className="text-lg font-bold text-ink">Shipping address</h2>
              <address className="mt-3 text-sm not-italic leading-relaxed text-ink">
                <span className="block font-semibold">{order.shippingAddress.name}</span>
                {order.shippingAddress.formatted ? <span className="block text-muted">{order.shippingAddress.formatted}</span> : null}
                {order.shippingAddress.formattedArea ? <span className="block text-muted">{order.shippingAddress.formattedArea}</span> : null}
              </address>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Fulfillment · <span className="text-ink">{prettyStatus(fulfillmentStatus)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function prettyStatus(s: string) {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between gap-5 text-muted">
      <span>{label}</span>
      <span className="tabular-nums text-ink">{children}</span>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-2 last:pb-0">
      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-mint">
        {lineItem?.image ? (
          <Image data={lineItem.image} aspectRatio="1/1" sizes="64px" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold tracking-tight text-ink">{lineItem.title}</div>
        {lineItem.variantTitle ? <div className="mt-0.5 text-[13px] text-muted">{lineItem.variantTitle}</div> : null}
        <div className="mt-1 text-[13px] text-muted">Qty {lineItem.quantity}</div>
      </div>
      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
        <Money data={lineItem.price!} />
      </div>
    </div>
  );
}
