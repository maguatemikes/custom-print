import {
  data as remixData,
  Outlet,
  useLoaderData,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

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

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  return (
    <section className="bg-[#f2f5fa]">
      <div className="ui-container py-8 md:py-12">
        <Outlet context={{customer}} />
      </div>
    </section>
  );
}
