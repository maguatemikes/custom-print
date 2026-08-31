import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {
  Money,
  Image,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {AccountCard, IconBag, StatusChip} from '~/components/AccountUI';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Orders — Custom Bandanas'},
    {name: 'robots', content: 'noindex,nofollow'},
  ];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <AccountCard icon={<IconBag />} title="Orders" flush>
      {orders?.nodes.length ? (
        <PaginatedResourceSection
          connection={orders}
          resourcesClassName="divide-y divide-black/10"
        >
          {({node: order}) => <OrderRow key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <div className="px-6 py-14 text-center text-sm text-muted">
          <p>
            {hasFilters
              ? 'No orders found matching your search.'
              : 'You haven’t placed any orders yet.'}
          </p>
          <Link
            to={hasFilters ? '/account/orders' : '/collections'}
            className="btn btn-dark mt-6"
          >
            {hasFilters ? 'Clear filters' : 'Start shopping'}
          </Link>
        </div>
      )}
    </AccountCard>
  );
}

function OrderRow({order}: {order: OrderItemFragment}) {
  const fulfillment = flattenConnection(order.fulfillments)[0]?.status;
  const items = order.lineItems?.nodes ?? [];
  return (
    <Link
      to={`/account/orders/${btoa(order.id)}`}
      prefetch="intent"
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50 md:gap-5 md:px-6"
    >
      {/* thumbnail lane (fixed width → columns line up) */}
      <div className="flex w-[92px] flex-none items-center">
        {items.slice(0, 3).map((it, i) => (
          <span
            key={i}
            className="-ml-[18px] h-[42px] w-[42px] flex-none overflow-hidden rounded-[11px] border-2 border-white bg-mint shadow-sm first:ml-0"
          >
            {it.image ? (
              <Image
                data={it.image}
                aspectRatio="1/1"
                sizes="42px"
                className="h-full w-full object-cover"
              />
            ) : null}
          </span>
        ))}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold tracking-tight text-ink">
          #{order.number}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-muted">
          {new Date(order.processedAt).toDateString()}
          {order.confirmationNumber ? ` · ${order.confirmationNumber}` : ''}
        </div>
      </div>

      {/* status */}
      <div className="hidden w-[160px] flex-none flex-wrap gap-1.5 sm:flex">
        <StatusChip>{order.financialStatus}</StatusChip>
        {fulfillment ? <StatusChip>{fulfillment}</StatusChip> : null}
      </div>

      {/* price */}
      <div className="w-[92px] flex-none text-right text-[14.5px] font-semibold tabular-nums text-ink">
        <Money data={order.totalPrice} />
      </div>

      <span className="flex-none text-[13px] font-semibold text-brand-700">
        View
      </span>
    </Link>
  );
}
