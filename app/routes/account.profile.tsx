import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.profile';
import {
  AccountCard,
  IconUser,
  ACCOUNT_LABEL,
  ACCOUNT_INPUT,
} from '~/components/AccountUI';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Profile — Custom Bandanas'},
    {name: 'robots', content: 'noindex,nofollow'},
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;

  return (
    <AccountCard icon={<IconUser />} title="Profile">
      <p className="mb-5 text-sm text-muted">
        Update the name on your Custom Bandanas account.
      </p>

      <Form method="PUT">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={ACCOUNT_LABEL}>
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              aria-label="First name"
              defaultValue={customer.firstName ?? ''}
              minLength={2}
              className={ACCOUNT_INPUT}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={ACCOUNT_LABEL}>
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              aria-label="Last name"
              defaultValue={customer.lastName ?? ''}
              minLength={2}
              className={ACCOUNT_INPUT}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className={ACCOUNT_LABEL}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={customer.emailAddress?.emailAddress ?? ''}
              readOnly
              disabled
              className={`${ACCOUNT_INPUT} cursor-not-allowed opacity-70`}
            />
          </div>
        </div>

        {action?.error ? (
          <p className="mt-3 text-sm text-red-600">{action.error}</p>
        ) : null}

        <div className="mt-6">
          <button
            type="submit"
            disabled={state !== 'idle'}
            className="btn btn-dark !px-5 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {state !== 'idle' ? 'Saving' : 'Save changes'}
          </button>
        </div>
      </Form>
    </AccountCard>
  );
}
