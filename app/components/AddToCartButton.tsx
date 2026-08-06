import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  className = 'btn btn-dark w-full text-base disabled:cursor-not-allowed disabled:opacity-50',
  redirectTo,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  className?: string;
  /** Set to "checkout" to add the line and go straight to Shopify checkout. */
  redirectTo?: string;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}
          <button
            type="submit"
            onClick={onClick}
            disabled={disabled ?? fetcher.state !== 'idle'}
            className={className}
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}
