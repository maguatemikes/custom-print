/**
 * Wraps a product grid with a pending state used during filter/sort changes:
 * dims + disables the current products and shows an "Updating…" pill, so the
 * refresh is visible right after the (optimistic) filter click. Pair with
 * `useFilterPending()` from CollectionFilters.
 */
export function GridPending({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" aria-busy={pending}>
      {pending && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin">
              <path
                d="M12 3a9 9 0 1 0 9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Updating…
          </span>
        </div>
      )}
      <div
        className={`transition-opacity duration-200 ${
          pending ? 'pointer-events-none opacity-40' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}
