import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {
  AccountCard,
  IconBag,
  IconPin,
  IconTruck,
  StatusChip,
} from '~/components/AccountUI';

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

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
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

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  } = useLoaderData<typeof loader>();
  const hasDiscount = !!((discountValue && discountValue.amount) ||
    discountPercentage);

  return (
    <div>
      <Link
        to="/account/orders"
        prefetch="intent"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        ← Back to orders
      </Link>

      <AccountCard
        icon={<IconBag />}
        title={`Order ${order.name}`}
        action={<StatusChip>{fulfillmentStatus}</StatusChip>}
      >
        <p className="mb-4 text-sm text-muted">
          Placed on {new Date(order.processedAt!).toDateString()}
          {order.confirmationNumber ? ` · ${order.confirmationNumber}` : ''}
        </p>

        <div className="divide-y divide-black/10">
          {lineItems.map((lineItem, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <OrderLineRow key={i} lineItem={lineItem} />
          ))}
        </div>

        <div className="ml-auto mt-4 flex max-w-[300px] flex-col gap-2.5 border-t border-black/10 pt-4 text-[13.5px]">
          {hasDiscount && (
            <SummaryRow label="Discounts">
              {discountPercentage ? (
                <span>-{discountPercentage}% OFF</span>
              ) : (
                discountValue && <Money data={discountValue} />
              )}
            </SummaryRow>
          )}
          <SummaryRow label="Subtotal">
            <Money data={order.subtotal!} />
          </SummaryRow>
          <SummaryRow label="Tax">
            <Money data={order.totalTax!} />
          </SummaryRow>
          <div className="mt-1 flex items-center justify-between gap-5 border-t border-black/10 pt-3 text-[15px] font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">
              <Money data={order.totalPrice!} />
            </span>
          </div>
        </div>
      </AccountCard>

      {order?.shippingAddress ? (
        <div className="mt-5">
          <AccountCard icon={<IconPin />} title="Shipping address">
            <address className="text-[13.5px] not-italic leading-relaxed text-muted">
              <span className="block font-semibold text-ink">
                {order.shippingAddress.name}
              </span>
              {order.shippingAddress.formatted ? (
                <span className="block">{order.shippingAddress.formatted}</span>
              ) : null}
              {order.shippingAddress.formattedArea ? (
                <span className="block">
                  {order.shippingAddress.formattedArea}
                </span>
              ) : null}
            </address>
          </AccountCard>
        </div>
      ) : null}

      <div className="mt-5">
        <AccountCard icon={<IconTruck />} title="Delivery">
          <p className="mb-4 text-sm text-muted">
            Follow your order status and shipment updates.
          </p>
          <a
            target="_blank"
            href={order.statusPageUrl}
            rel="noreferrer"
            className="btn btn-dark !px-5 !py-2.5 text-sm"
          >
            View order status →
          </a>
        </AccountCard>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 text-muted">
      <span>{label}</span>
      <span className="tabular-nums text-ink">{children}</span>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="h-12 w-12 flex-none overflow-hidden rounded-xl border border-black/10 bg-mint">
        {lineItem?.image ? (
          <Image
            data={lineItem.image}
            aspectRatio="1/1"
            sizes="48px"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{lineItem.title}</p>
        {lineItem.variantTitle ? (
          <p className="text-[12.5px] text-muted">{lineItem.variantTitle}</p>
        ) : null}
      </div>
      <div className="tabular-nums text-[13px] text-muted">
        Qty {lineItem.quantity}
      </div>
      <div className="tabular-nums text-sm font-semibold text-ink">
        <Money data={lineItem.price!} />
      </div>
    </div>
  );
}
