import {useEffect, useRef, useState} from 'react';
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useOutletContext,
  Form,
  type FetcherWithComponents,
} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {
  Money,
  Pagination,
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
  CustomerFragment,
  AddressFragment,
} from 'customer-accountapi.generated';
import type {ActionResponse as ProfileActionResponse} from './account.profile';
import type {ActionResponse as AddressActionResponse} from './account.addresses';
import {StatusChip, prettyStatus} from '~/components/AccountUI';
import {getCached, setCached} from '~/lib/accountCache';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => [
  {title: 'Account overview — Custom Bandanas'},
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {pageBy: 20});

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

// Client-side stale-cache: on repeat visits within the TTL, paint the last
// orders result instantly instead of re-hitting the (uncacheable) Customer
// Account API. In-memory only + cleared on logout — see ~/lib/accountCache.
export async function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  const cached = getCached<OrdersLoaderData>('orders');
  if (cached) return cached;
  const data = (await serverLoader()) as OrdersLoaderData;
  setCached('orders', data);
  return data;
}
// Run on hydration too, so the very first load seeds the cache (serverLoader()
// returns the already-loaded SSR data here — no extra request).
clientLoader.hydrate = true as const;

const cardCls =
  'rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(11,22,34,0.35)] md:p-6';

/* -------------------------------------------------------------------------- */
/* Status helpers (map real Shopify statuses to a single friendly label)      */

function fulfillmentOf(order: OrderItemFragment) {
  return flattenConnection(order.fulfillments)[0]?.status ?? null;
}
function isFulfilled(order: OrderItemFragment) {
  const s = (fulfillmentOf(order) ?? '').toUpperCase();
  return s === 'SUCCESS' || s === 'FULFILLED' || s === 'DELIVERED';
}
function orderStatusLabel(order: OrderItemFragment) {
  if (isFulfilled(order)) return 'Delivered';
  const f = fulfillmentOf(order);
  if (f) return prettyStatus(f);
  return prettyStatus(order.financialStatus ?? 'Processing');
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* -------------------------------------------------------------------------- */

export default function AccountOverview() {
  const {customer: ordersCustomer, filters} = useLoaderData<OrdersLoaderData>();
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const orders = ordersCustomer.orders;
  const nodes = flattenConnection(orders);

  const firstName = customer.firstName || 'there';
  const total = nodes.length + (orders.pageInfo.hasNextPage ? '+' : '');
  const inProduction = nodes.filter((o) => !isFulfilled(o)).length;
  const delivered = nodes.filter((o) => isFulfilled(o)).length;

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
          Account overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Welcome back, {firstName}. Manage your orders and personal information.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total orders" value={String(total)} />
        <Stat label="In production" value={String(inProduction)} accent />
        <Stat label="Delivered" value={String(delivered)} />
        <Stat label="Saved addresses" value={String(customer.addresses.nodes.length)} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <OrdersCard orders={orders} nodes={nodes} filters={filters} />

        <div className="space-y-6">
          <AccountDetails customer={customer} />
          <SavedAddresses customer={customer} />
        </div>
      </div>
    </>
  );
}

function OrderTableRow({order: o}: {order: OrderItemFragment}) {
  const navigate = useNavigate();
  const to = `/account/orders/${btoa(o.id)}`;
  return (
    <tr
      onClick={() => navigate(to)}
      className="cursor-pointer border-b border-black/[0.06] transition last:border-0 hover:bg-mint/40"
    >
      <td className="py-3.5 pr-3 font-semibold text-ink">
        <Link to={to} prefetch="intent" onClick={(e) => e.stopPropagation()} className="hover:underline">#{o.number}</Link>
      </td>
      <td className="px-3 py-3.5 text-muted">{fmtDate(o.processedAt)}</td>
      <td className="px-3 py-3.5"><StatusChip>{orderStatusLabel(o)}</StatusChip></td>
      <td className="py-3.5 pl-3 text-right font-semibold text-ink"><Money data={o.totalPrice} /></td>
    </tr>
  );
}

/* --------------------------------- Stat ----------------------------------- */

function Stat({label, value, accent}: {label: string; value: string; accent?: boolean}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_8px_24px_-18px_rgba(11,22,34,0.35)] md:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-extrabold tracking-tight md:text-[26px] ${accent ? 'text-brand-600' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------------------- Orders ---------------------------------- */

function OrdersCard({
  orders,
  nodes,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  nodes: OrderItemFragment[];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className={cardCls + ' flex flex-col'}>
      <h2 className="text-lg font-bold text-ink">Your orders</h2>

      {nodes.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted">
          <p>{hasFilters ? 'No orders found matching your search.' : 'You haven’t placed any orders yet.'}</p>
          <Link to={hasFilters ? '/account/orders' : '/collections'} className="btn btn-dark mt-6">
            {hasFilters ? 'Clear filters' : 'Start shopping'}
          </Link>
        </div>
      ) : (
        <Pagination connection={orders}>
          {({nodes: pageNodes, NextLink, PreviousLink, isLoading, hasPreviousPage, hasNextPage}) => (
            <>
              {/* mobile: stacked cards */}
              <div className="mt-4 space-y-2 sm:hidden">
                {pageNodes.map((o) => (
                  <Link
                    key={o.id}
                    to={`/account/orders/${btoa(o.id)}`}
                    prefetch="intent"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] p-3 text-left transition active:bg-mint/50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">#{o.number}</div>
                      <div className="mt-0.5 text-xs text-muted">{fmtDate(o.processedAt)}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold text-ink"><Money data={o.totalPrice} /></span>
                      <StatusChip>{orderStatusLabel(o)}</StatusChip>
                    </div>
                  </Link>
                ))}
              </div>

              {/* desktop/tablet: table */}
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[460px] text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="pb-3 pr-3 font-semibold">Order</th>
                      <th className="px-3 pb-3 font-semibold">Date</th>
                      <th className="px-3 pb-3 font-semibold">Status</th>
                      <th className="pb-3 pl-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageNodes.map((o) => (
                      <OrderTableRow key={o.id} order={o} />
                    ))}
                  </tbody>
                </table>
              </div>

              {(hasPreviousPage || hasNextPage) ? (
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
                  <PreviousLink className={`text-xs font-semibold ${hasPreviousPage ? 'text-brand-700 hover:underline' : 'pointer-events-none text-muted/40'}`}>
                    {isLoading ? 'Loading…' : '← Newer'}
                  </PreviousLink>
                  <span className="text-xs text-muted">Most recent orders</span>
                  <NextLink className={`text-xs font-semibold ${hasNextPage ? 'text-brand-700 hover:underline' : 'pointer-events-none text-muted/40'}`}>
                    {isLoading ? 'Loading…' : 'Older →'}
                  </NextLink>
                </div>
              ) : null}
            </>
          )}
        </Pagination>
      )}
    </div>
  );
}

/* ----------------------------- Account details ---------------------------- */

function AccountDetails({customer}: {customer: CustomerFragment}) {
  const fetcher = useFetcher<ProfileActionResponse>();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const saving = fetcher.state !== 'idle';

  // Close the editor after a successful save.
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && !fetcher.data.error) {
      setEditing(false);
    }
  }, [fetcher.state, fetcher.data]);

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
  const email = customer.emailAddress?.emailAddress ?? '—';

  return (
    <div className={cardCls}>
      <div className="relative flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Account details</h2>
        {!editing ? (
          <button
            type="button"
            aria-label="Account details options"
            onClick={() => setMenu((v) => !v)}
            className="-mr-1 -mt-1 h-6 text-muted transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        ) : null}
        {menu ? (
          <>
            <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-sm shadow-lg">
              <button type="button" onClick={() => {setMenu(false); setEditing(true);}} className="block w-full px-4 py-2 text-left hover:bg-mint">
                Edit details
              </button>
              <Form method="POST" action="/account/logout">
                <button type="submit" className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50">Sign out</button>
              </Form>
            </div>
          </>
        ) : null}
      </div>

      {!editing ? (
        <>
          <Field label="Full name" value={name} />
          <Field label="Email address" value={email} />
        </>
      ) : (
        <fetcher.Form method="PUT" action="/account/profile" className="mt-4 space-y-3">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-xs font-semibold text-muted">First name</label>
            <input id="firstName" name="firstName" defaultValue={customer.firstName ?? ''} minLength={1} className={inputCls} />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-xs font-semibold text-muted">Last name</label>
            <input id="lastName" name="lastName" defaultValue={customer.lastName ?? ''} minLength={1} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Email address</label>
            <input value={email} readOnly disabled className={inputCls + ' cursor-not-allowed opacity-60'} />
          </div>
          {fetcher.data?.error ? <p className="text-sm text-red-600">{fetcher.data.error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-sm font-semibold text-ink transition hover:bg-mint">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </fetcher.Form>
      )}
    </div>
  );
}

function Field({label, value}: {label: string; value: string}) {
  return (
    <div className="mt-4 first:mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-ink placeholder:text-muted/60 focus:border-brand-500 focus:outline-none';

/* ----------------------------- Saved addresses ---------------------------- */

function SavedAddresses({customer}: {customer: CustomerFragment}) {
  const fetcher = useFetcher<AddressActionResponse>();
  const {addresses, defaultAddress} = customer;
  const [form, setForm] = useState<null | 'new' | AddressFragment>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const busy = fetcher.state !== 'idle';

  // Close form / menu after any successful mutation.
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && fetcher.data.error == null) {
      setForm(null);
      setMenu(null);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className={cardCls}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold leading-none text-ink">Saved addresses</h2>
        <button
          type="button"
          onClick={() => setForm((f) => (f === 'new' ? null : 'new'))}
          className="shrink-0 text-sm font-semibold leading-none text-brand-600 hover:underline"
        >
          {form === 'new' ? 'Close' : 'Add new'}
        </button>
      </div>

      {form ? (
        <AddressForm
          fetcher={fetcher}
          busy={busy}
          address={form === 'new' ? null : form}
          onCancel={() => setForm(null)}
        />
      ) : null}

      {addresses.nodes.length === 0 && !form ? (
        <p className="mt-4 text-sm text-muted">No saved addresses yet.</p>
      ) : null}

      {addresses.nodes.map((a) => {
        const isDefault = defaultAddress?.id === a.id;
        const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.company || 'Address';
        const lines = [
          a.company && name !== a.company ? a.company : null,
          a.address1,
          a.address2,
          [a.city, a.zoneCode, a.zip].filter(Boolean).join(', '),
          a.territoryCode,
        ].filter(Boolean) as string[];
        return (
          <div key={a.id} className="relative mt-4 flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-brand-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7" /><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{name}</span>
                {isDefault ? <span className="rounded bg-brand-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">Primary</span> : null}
              </div>
              <div className="mt-1.5 text-sm leading-relaxed text-ink">
                {lines.map((l, i) => <div key={l + i} className={i === 0 ? 'font-semibold' : undefined}>{l}</div>)}
              </div>
            </div>
            <button
              type="button"
              aria-label="Address options"
              onClick={() => setMenu(menu === a.id ? null : a.id)}
              className="h-6 text-muted transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
            </button>
            {menu === a.id ? (
              <>
                <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(null)} />
                <div className="absolute right-3 top-11 z-20 w-40 overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-sm shadow-lg">
                  {!isDefault ? (
                    <fetcher.Form method="PUT" action="/account/addresses">
                      <HiddenAddressFields address={a} asDefault />
                      <button type="submit" className="block w-full px-4 py-2 text-left hover:bg-mint">Set as primary</button>
                    </fetcher.Form>
                  ) : null}
                  <button type="button" onClick={() => {setMenu(null); setForm(a);}} className="block w-full px-4 py-2 text-left hover:bg-mint">Edit</button>
                  <fetcher.Form method="DELETE" action="/account/addresses">
                    <input type="hidden" name="addressId" value={a.id} />
                    <button type="submit" className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50">Remove</button>
                  </fetcher.Form>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function HiddenAddressFields({address: a, asDefault}: {address: AddressFragment; asDefault?: boolean}) {
  return (
    <>
      <input type="hidden" name="addressId" value={a.id} />
      <input type="hidden" name="firstName" value={a.firstName ?? ''} />
      <input type="hidden" name="lastName" value={a.lastName ?? ''} />
      <input type="hidden" name="company" value={a.company ?? ''} />
      <input type="hidden" name="address1" value={a.address1 ?? ''} />
      <input type="hidden" name="address2" value={a.address2 ?? ''} />
      <input type="hidden" name="city" value={a.city ?? ''} />
      <input type="hidden" name="zoneCode" value={a.zoneCode ?? ''} />
      <input type="hidden" name="zip" value={a.zip ?? ''} />
      <input type="hidden" name="territoryCode" value={a.territoryCode ?? ''} />
      <input type="hidden" name="phoneNumber" value={a.phoneNumber ?? ''} />
      {asDefault ? <input type="hidden" name="defaultAddress" value="on" /> : null}
    </>
  );
}

function AddressForm({
  fetcher,
  busy,
  address,
  onCancel,
}: {
  fetcher: FetcherWithComponents<AddressActionResponse>;
  busy: boolean;
  address: AddressFragment | null;
  onCancel: () => void;
}) {
  const isNew = address === null;
  const id = address?.id ?? 'NEW_ADDRESS_ID';
  const err = fetcher.data?.error?.[id];
  const labelCls = 'mb-1 block text-xs font-semibold text-muted';
  return (
    <fetcher.Form method={isNew ? 'POST' : 'PUT'} action="/account/addresses" className="mt-4 max-w-none rounded-xl border border-black/10 bg-white p-4">
      <input type="hidden" name="addressId" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>First name</label>
          <input name="firstName" required defaultValue={address?.firstName ?? ''} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input name="lastName" required defaultValue={address?.lastName ?? ''} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Company</label>
          <input name="company" defaultValue={address?.company ?? ''} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address</label>
          <input name="address1" required defaultValue={address?.address1 ?? ''} placeholder="Street address" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Apartment, suite, etc.</label>
          <input name="address2" defaultValue={address?.address2 ?? ''} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input name="city" required defaultValue={address?.city ?? ''} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>State / Province</label>
          <input name="zoneCode" required defaultValue={address?.zoneCode ?? ''} placeholder="e.g. TX" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ZIP / Postal</label>
          <input name="zip" required defaultValue={address?.zip ?? ''} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Country code</label>
          <input name="territoryCode" required maxLength={2} defaultValue={address?.territoryCode ?? ''} placeholder="e.g. US" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Phone</label>
          <input name="phoneNumber" type="tel" defaultValue={address?.phoneNumber ?? ''} placeholder="+16135551111" className={inputCls} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="defaultAddress" className="accent-brand-600" defaultChecked={isNew ? false : undefined} />
        Set as primary address
      </label>
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-sm font-semibold text-ink transition hover:bg-mint">Cancel</button>
        <button type="submit" disabled={busy} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40">
          {busy ? 'Saving…' : isNew ? 'Add address' : 'Save'}
        </button>
      </div>
    </fetcher.Form>
  );
}
