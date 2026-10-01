/**
 * Minimal, SSR-safe push to GTM's `dataLayer`.
 *
 * Standard commerce events (page / product / collection / cart / search) flow
 * natively through Hydrogen's analytics bus → the `GoogleTagManager` component,
 * and must NOT be duplicated here. This helper exists only for CUSTOM app events
 * that have no standard Hydrogen analytics equivalent — specifically the
 * custom-print editor funnel (`CustomPrintAnalytics`), whose per-step design
 * data GTM cannot obtain any other way.
 *
 * It never throws: analytics must never be able to break the UI.
 */
export function pushDataLayer(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event, ...(data ?? {})});
  } catch {
    // swallow — a failed analytics push is never worth surfacing to the shopper
  }
}
