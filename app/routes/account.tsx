import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
  useNavigation,
  type ShouldRevalidateFunction,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {
  IconBag,
  IconUser,
  IconPin,
  IconSignOut,
  AccountSkeleton,
} from '~/components/AccountUI';

// Reuse the already-loaded customer profile on plain tab navigations; only
// re-fetch it after a mutation (address / profile change). This removes one
// uncached Customer Account API round-trip per tab click, so switching tabs
// feels snappy instead of waiting on the customer query every time.
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

const NAV_BASE =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors [&>svg]:shrink-0';
const NAV_INACTIVE = 'text-ink hover:bg-black/[0.04] [&>svg]:text-muted';
const NAV_ACTIVE = 'bg-mint text-brand-700 [&>svg]:text-brand-700';
// Optimistic active: highlight the tab the instant it's clicked (isPending),
// not only once its loader resolves (isActive).
const navCls = ({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) => `${NAV_BASE} ${isActive || isPending ? NAV_ACTIVE : NAV_INACTIVE}`;

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  // Show a skeleton while a tab's loader is fetching (a link/GET navigation to
  // an /account route) — not for form submits, which have their own button
  // pending states. Gives the tab switch instant feedback instead of a dead beat.
  const isTabLoading =
    navigation.state === 'loading' &&
    navigation.formMethod == null &&
    (navigation.location?.pathname?.startsWith('/account') ?? false);
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  const initials =
    `${customer.firstName?.charAt(0) ?? ''}${customer.lastName?.charAt(0) ?? ''}` ||
    'BH';
  const email = customer.emailAddress?.emailAddress;

  return (
    <section className="bg-[#f2f5f1]">
      <div className="ui-container py-8 md:py-10">
        <div className="grid max-w-[1180px] items-start gap-6 md:grid-cols-[256px_minmax(0,1fr)] md:gap-8">
          {/* Rail */}
          <nav
            aria-label="Account"
            className="h-fit rounded-2xl border border-black/10 bg-white p-3.5 shadow-sm md:sticky md:top-28"
          >
            <div className="flex items-center gap-3 border-b border-black/10 px-1.5 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-[13px] font-semibold uppercase text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {name || 'Your account'}
                </div>
                {email ? (
                  <div className="truncate text-xs text-muted">{email}</div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1 py-3.5">
              <NavLink to="/account/orders" prefetch="intent" className={navCls}>
                <IconBag />
                Orders
              </NavLink>
              <NavLink to="/account/profile" prefetch="intent" className={navCls}>
                <IconUser />
                Profile
              </NavLink>
              <NavLink
                to="/account/addresses"
                prefetch="intent"
                className={navCls}
              >
                <IconPin />
                Addresses
              </NavLink>
            </div>

            <div className="border-t border-black/10 pt-2.5">
              <Form method="POST" action="/account/logout">
                <button
                  type="submit"
                  className={`${NAV_BASE} ${NAV_INACTIVE}`}
                >
                  <IconSignOut />
                  Sign out
                </button>
              </Form>
            </div>
          </nav>

          {/* Content */}
          <main className="min-w-0" aria-busy={isTabLoading}>
            {isTabLoading ? (
              <AccountSkeleton />
            ) : (
              <Outlet context={{customer}} />
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
