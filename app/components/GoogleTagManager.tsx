import {AnalyticsEvent, useAnalytics, useLoadScript} from '@shopify/hydrogen';
import {useEffect} from 'react';

const GTM_CONTAINER_ID = 'GTM-NVHLN4G9';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// Hydrogen attaches the FULL cart (buyer identity + every line-item attribute)
// to each analytics event. The custom-print wizard stores the shopper's contact
// email as a line attribute, so without this, emails/phones would flow into the
// dataLayer → GA4/Google Ads, which Google's policy forbids. We strip that PII
// before anything is pushed. Match is value-free (we drop by attribute key).
const PII_ATTR_KEY = /e-?mail|phone|\btel\b|contact|\baddress\b/i;

function sanitizeCart(cart: unknown): unknown {
  if (!cart || typeof cart !== 'object') return cart;
  // Drop buyerIdentity (email/phone/customer) and checkoutUrl (a sensitive
  // session link). Everything else is copied shallowly so Hydrogen's own live
  // cart object is NEVER mutated.
  const {checkoutUrl, buyerIdentity, lines, ...rest} = cart as Record<
    string,
    unknown
  >;
  void checkoutUrl;
  void buyerIdentity;
  const safe: Record<string, unknown> = {...rest};
  const l = lines as {nodes?: Array<Record<string, unknown>>} | undefined;
  if (l?.nodes) {
    safe.lines = {
      ...l,
      nodes: l.nodes.map((n) => {
        const attrs = (n as {attributes?: Array<{key?: string}>}).attributes;
        return attrs
          ? {
              ...n,
              attributes: attrs.filter((a) => !PII_ATTR_KEY.test(a?.key ?? '')),
            }
          : n;
      }),
    };
  } else if (lines !== undefined) {
    safe.lines = lines;
  }
  return safe;
}

/**
 * Strip PII from a Hydrogen analytics payload before it reaches the dataLayer.
 * Always returns a NEW object — it never mutates Hydrogen's live cart/analytics
 * state, so cart rendering and checkout are unaffected.
 */
function sanitizeAnalytics(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return (data as Record<string, unknown>) ?? {};
  }
  const out: Record<string, unknown> = {...(data as Record<string, unknown>)};
  if ('cart' in out) out.cart = sanitizeCart(out.cart);
  if ('prevCart' in out) out.prevCart = sanitizeCart(out.prevCart);
  return out;
}

/**
 * Google Tag Manager, wired the native Hydrogen way:
 * - `useLoadScript` loads the container AFTER hydration (no SSR `<head>`
 *   injection, so no hydration mismatch — GTM is client-side anyway).
 * - `useAnalytics` subscribes to Hydrogen's own analytics events and pushes
 *   them into the GTM `dataLayer`, so GTM/GA4 receive real page / product /
 *   collection / cart / search events (not just a bare container load).
 *
 * Rendered inside `<Analytics.Provider>` so it can read the analytics context.
 * The container host is allow-listed in the CSP (see entry.server.tsx).
 */
export function GoogleTagManager() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Google Tag Manager');

  useLoadScript(
    `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`,
  );

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});

    const push = (event: string, data: unknown) =>
      window.dataLayer?.push({...sanitizeAnalytics(data), event});

    subscribe(AnalyticsEvent.PAGE_VIEWED, (data) => push('page_view', data));
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data) => push('view_item', data));
    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (data) =>
      push('view_item_list', data),
    );
    subscribe(AnalyticsEvent.CART_VIEWED, (data) => push('view_cart', data));
    subscribe(AnalyticsEvent.CART_UPDATED, (data) => push('cart_updated', data));
    subscribe(AnalyticsEvent.SEARCH_VIEWED, (data) => push('search', data));

    // Signal the provider this integration is ready, so events that fired
    // before this subscriber mounted get flushed to the dataLayer.
    ready();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
