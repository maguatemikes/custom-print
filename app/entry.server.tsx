import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // img-src has no Hydrogen default, so this list IS the whole image policy —
    // it must re-list every host the storefront already relied on (Shopify CDN,
    // Unsplash, and the NetX media CDN the wizard/PDP + cart proofs load from)
    // before adding the GA4 pixel hosts. Dropping any of these would break the
    // cart's uploaded-logo / design-proof images.
    imgSrc: [
      "'self'",
      'data:',
      'https://cdn.shopify.com',
      'https://images.unsplash.com',
      'https://media.wholesaleforeveryone.com',
      // Google Tag Manager / GA4 — tracking pixels & beacons.
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.g.doubleclick.net',
      // Meta (Facebook) Pixel — the <img> tracking beacon (facebook.com/tr).
      'https://www.facebook.com',
    ],
    // script-src has NO Hydrogen default — scripts normally fall back to
    // default-src. Introducing a script-src REPLACES that fallback, so this list
    // must reproduce every script host default-src provided (cdn.shopify.com =
    // consent-tracking-api + perf-kit, shopify.com = Customer Account API, the
    // dev localhost host) and only THEN add GTM/GA4. Hydrogen appends the nonce.
    scriptSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://shopify.com',
      'http://localhost:*',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      // Meta (Facebook) Pixel — fbevents.js loads from connect.facebook.net.
      'https://connect.facebook.net',
    ],
    // Now that a script-src exists, workers fall back to it instead of
    // default-src — so allow blob: workers explicitly (Shopify perf-kit / GA
    // spin these up) rather than loosening script-src to accept blob: scripts.
    workerSrc: ["'self'", 'blob:'],
    // connectSrc has a Hydrogen default, so this MERGES with it — the Storefront
    // API, checkout domain, monorail, and dev HMR websockets are all preserved.
    // We only add the GA4 collect/beacon hosts; the cart/wizard network calls
    // keep working untouched.
    connectSrc: [
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://stats.g.doubleclick.net',
      // Meta (Facebook) Pixel — event beacons / config fetches.
      'https://www.facebook.com',
      'https://connect.facebook.net',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
