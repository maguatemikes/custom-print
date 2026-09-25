import {
  data as remixData,
  Outlet,
  useLoaderData,
  useNavigation,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {getCached, setCached} from '~/lib/accountCache';
import {AccountSkeleton} from '~/components/AccountUI';

// Account is private — keep every /account/* page out of search indexes.
export const meta: Route.MetaFunction = () => [
  {title: 'Account — Custom Bandanas'},
  {name: 'robots', content: 'noindex,nofollow'},
];

// Reuse the already-loaded customer profile on plain tab navigations; only
// re-fetch it after a mutation (address / profile change). This removes one
// uncached Customer Account API round-trip per navigation, and it also means a
// successful inline mutation (fetcher POST/PUT/DELETE to /account/profile or
// /account/addresses) refreshes the customer shown on the dashboard.
export const shouldRevalidate: ShouldRevalidateFunction = ({formMethod}) =>
  Boolean(formMethod && formMethod !== 'GET');

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

// Client-side stale-cache for the customer details, mirroring the orders route:
// re-entering the account section within the TTL paints instantly instead of
// re-querying the (uncacheable) Customer Account API. In-memory only + cleared
// on logout — see ~/lib/accountCache.
export async function clientLoader({serverLoader}: Route.ClientLoaderArgs) {
  const cached = getCached<Awaited<ReturnType<typeof serverLoader>>>('customer');
  if (cached) return cached;
  const fresh = await serverLoader();
  setCached('customer', fresh);
  return fresh;
}
// Seed the cache on the first (hydration) load — serverLoader() returns the
// already-loaded SSR data here, so there's no extra request.
clientLoader.hydrate = true as const;

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  // Show a skeleton only while an account GET navigation is actually fetching
  // (cold load / cache miss). Cache hits resolve instantly so this won't flash,
  // and fetcher mutations (profile/address) don't touch `navigation`, so their
  // own pending states show instead.
  const isAccountLoading =
    navigation.state === 'loading' &&
    navigation.formMethod == null &&
    (navigation.location?.pathname?.startsWith('/account') ?? false);

  return (
    <section className="bg-[#f2f5fa]">
      <div className="ui-container py-8 md:py-12" aria-busy={isAccountLoading}>
        {isAccountLoading ? (
          <AccountSkeleton />
        ) : (
          <Outlet context={{customer}} />
        )}
      </div>
    </section>
  );
}
