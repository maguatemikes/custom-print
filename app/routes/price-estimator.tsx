import {redirect} from 'react-router';
import type {Route} from './+types/price-estimator';

/**
 * The estimator was renamed to /bandana-calculator. Permanently redirect the old
 * URL — preserving the shareable ?shape/?size/?qty query — so existing marketing
 * links (and any bookmarks) still land on the right estimate.
 */
export async function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  return redirect(`/bandana-calculator${url.search}`, 301);
}
