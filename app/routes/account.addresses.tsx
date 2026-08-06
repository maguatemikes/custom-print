import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from 'react-router';
import {useEffect, useState} from 'react';
import type {Route} from './+types/account.addresses';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';
import {
  AccountCard,
  IconPin,
  IconKebab,
  ACCOUNT_LABEL,
  ACCOUNT_INPUT,
} from '~/components/AccountUI';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Addresses'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

type Mode = 'list' | 'new' | {edit: string};

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;
  const action = useActionData<ActionResponse>();
  const [mode, setMode] = useState<Mode>('list');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Return to the list after any successful create / update / delete.
  useEffect(() => {
    if (action && action.error == null) {
      setMode('list');
      setOpenMenu(null);
    }
  }, [action]);

  const back = () => setMode('list');

  if (mode === 'new') {
    return (
      <div>
        <BackButton onClick={back} />
        <AccountCard icon={<IconPin />} title="Add address">
          <NewAddressForm onCancel={back} />
        </AccountCard>
      </div>
    );
  }

  if (typeof mode === 'object') {
    const address = addresses.nodes.find((a) => a.id === mode.edit);
    return (
      <div>
        <BackButton onClick={back} />
        <AccountCard icon={<IconPin />} title="Edit address">
          {address ? (
            <AddressForm
              addressId={address.id}
              address={address}
              defaultAddress={defaultAddress}
            >
              {({stateForMethod}) => (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    disabled={stateForMethod('PUT') !== 'idle'}
                    formMethod="PUT"
                    type="submit"
                    className="btn btn-dark !px-5 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {stateForMethod('PUT') !== 'idle' ? 'Saving' : 'Save address'}
                  </button>
                  <button
                    type="button"
                    onClick={back}
                    className="btn btn-outline !px-5 !py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </AddressForm>
          ) : (
            <p className="text-sm text-muted">Address not found.</p>
          )}
        </AccountCard>
      </div>
    );
  }

  return (
    <>
      <AccountCard
        icon={<IconPin />}
        title="Addresses"
        flush
        action={
          <button
            type="button"
            onClick={() => setMode('new')}
            className="btn btn-outline !px-3.5 !py-1.5 text-xs"
          >
            Add address
          </button>
        }
      >
        {addresses.nodes.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted">
            <p>No saved addresses yet.</p>
            <button
              type="button"
              onClick={() => setMode('new')}
              className="btn btn-dark mt-6"
            >
              Add address
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/10">
            {addresses.nodes.map((address) => (
              <AddressRow
                key={address.id}
                address={address}
                isDefault={defaultAddress?.id === address.id}
                open={openMenu === address.id}
                onToggle={() =>
                  setOpenMenu((m) => (m === address.id ? null : address.id))
                }
                onEdit={() => {
                  setMode({edit: address.id});
                  setOpenMenu(null);
                }}
                onAction={() => setOpenMenu(null)}
              />
            ))}
          </div>
        )}
      </AccountCard>

      {openMenu ? (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setOpenMenu(null)}
        />
      ) : null}
    </>
  );
}

function BackButton({onClick}: {onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
    >
      ← Back to addresses
    </button>
  );
}

function addressLine(a: AddressFragment) {
  return [
    a.address1,
    a.address2,
    [a.city, a.zip].filter(Boolean).join(' '),
    a.territoryCode,
  ]
    .filter(Boolean)
    .join(' · ');
}

function HiddenAddressFields({
  address: a,
  asDefault,
}: {
  address: AddressFragment;
  asDefault?: boolean;
}) {
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
      {asDefault ? (
        <input type="hidden" name="defaultAddress" value="on" />
      ) : null}
    </>
  );
}

function AddressRow({
  address: a,
  isDefault,
  open,
  onToggle,
  onEdit,
  onAction,
}: {
  address: AddressFragment;
  isDefault: boolean;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAction: () => void;
}) {
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Address';
  const item =
    'block w-full rounded-lg px-3 py-2 text-left text-[13.5px] font-medium';
  return (
    <div className="flex items-start gap-4 px-5 py-4 md:px-6">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
          {name}
          {isDefault ? (
            <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10.5px] font-semibold text-white">
              Default
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {addressLine(a)}
        </p>
      </div>

      <div className="relative flex-none">
        <button
          type="button"
          aria-label="Address options"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-neutral-100 hover:text-ink aria-expanded:bg-neutral-100 aria-expanded:text-ink"
        >
          <IconKebab />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[172px] rounded-[13px] border border-black/15 bg-white p-1.5 shadow-lg"
          >
            {!isDefault ? (
              <Form onSubmit={onAction}>
                <HiddenAddressFields address={a} asDefault />
                <button
                  type="submit"
                  formMethod="PUT"
                  className={`${item} text-ink hover:bg-neutral-100`}
                >
                  Make default
                </button>
              </Form>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className={`${item} text-ink hover:bg-neutral-100`}
            >
              Edit
            </button>
            <Form onSubmit={onAction}>
              <input type="hidden" name="addressId" value={a.id} />
              <button
                type="submit"
                formMethod="DELETE"
                className={`${item} text-red-600 hover:bg-red-50`}
              >
                Delete
              </button>
            </Form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewAddressForm({onCancel}: {onCancel: () => void}) {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  } as CustomerAddressInput;

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
            className="btn btn-dark !px-5 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stateForMethod('POST') !== 'idle' ? 'Adding' : 'Add address'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline !px-5 !py-2.5 text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </AddressForm>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment['id'];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment['defaultAddress'];
  children: (props: {
    stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
  }) => React.ReactNode;
}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  const inputClass = ACCOUNT_INPUT;
  const labelClass = ACCOUNT_LABEL;
  return (
    <Form id={addressId}>
      <input type="hidden" name="addressId" defaultValue={addressId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name*
          </label>
          <input
            aria-label="First name"
            autoComplete="given-name"
            defaultValue={address?.firstName ?? ''}
            id="firstName"
            name="firstName"
            placeholder="First name"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name*
          </label>
          <input
            aria-label="Last name"
            autoComplete="family-name"
            defaultValue={address?.lastName ?? ''}
            id="lastName"
            name="lastName"
            placeholder="Last name"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="company" className={labelClass}>
            Company
          </label>
          <input
            aria-label="Company"
            autoComplete="organization"
            defaultValue={address?.company ?? ''}
            id="company"
            name="company"
            placeholder="Company"
            type="text"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="address1" className={labelClass}>
            Address line*
          </label>
          <input
            aria-label="Address line 1"
            autoComplete="address-line1"
            defaultValue={address?.address1 ?? ''}
            id="address1"
            name="address1"
            placeholder="Address line 1*"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="address2" className={labelClass}>
            Address line 2
          </label>
          <input
            aria-label="Address line 2"
            autoComplete="address-line2"
            defaultValue={address?.address2 ?? ''}
            id="address2"
            name="address2"
            placeholder="Address line 2"
            type="text"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            City*
          </label>
          <input
            aria-label="City"
            autoComplete="address-level2"
            defaultValue={address?.city ?? ''}
            id="city"
            name="city"
            placeholder="City"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="zoneCode" className={labelClass}>
            State / Province*
          </label>
          <input
            aria-label="State/Province"
            autoComplete="address-level1"
            defaultValue={address?.zoneCode ?? ''}
            id="zoneCode"
            name="zoneCode"
            placeholder="State / Province"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="zip" className={labelClass}>
            Zip / Postal Code*
          </label>
          <input
            aria-label="Zip"
            autoComplete="postal-code"
            defaultValue={address?.zip ?? ''}
            id="zip"
            name="zip"
            placeholder="Zip / Postal Code"
            required
            type="text"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="territoryCode" className={labelClass}>
            Country Code*
          </label>
          <input
            aria-label="Country code"
            autoComplete="country"
            defaultValue={address?.territoryCode ?? ''}
            id="territoryCode"
            name="territoryCode"
            placeholder="Country"
            required
            type="text"
            maxLength={2}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="phoneNumber" className={labelClass}>
            Phone
          </label>
          <input
            aria-label="Phone Number"
            autoComplete="tel"
            defaultValue={address?.phoneNumber ?? ''}
            id="phoneNumber"
            name="phoneNumber"
            placeholder="+16135551111"
            pattern="^\+?[1-9]\d{3,14}$"
            type="tel"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          defaultChecked={isDefaultAddress}
          id="defaultAddress"
          name="defaultAddress"
          type="checkbox"
          className="accent-brand-600"
        />
        <label htmlFor="defaultAddress" className="text-sm text-ink">
          Set as default address
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {children({
        stateForMethod: (method) => (formMethod === method ? state : 'idle'),
      })}
    </Form>
  );
}
