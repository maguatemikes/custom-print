import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {customWizardPath} from '~/lib/customPrintData';

export async function loader({
  request,
  params,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    // Single-locale storefront — no `($locale)` route exists, so DON'T emit
    // locale-prefixed URLs (they'd 404 and produce invalid hreflang alternates).
    getLink: ({type, baseUrl, handle}) => {
      // Made-to-order shape products live at /custom-print/<slug>; their
      // /products/<handle> URL 301-redirects there, so emit the CANONICAL wizard
      // URL in the sitemap (never a redirecting one).
      if (type === 'products' && handle) {
        const wizardPath = customWizardPath(handle);
        if (wizardPath) return `${baseUrl}${wizardPath}`;
      }
      return `${baseUrl}/${type}/${handle}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
