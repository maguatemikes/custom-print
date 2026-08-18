import type {Route} from './+types/api.reviews';
import {fetchProductReviews, submitReview} from '~/lib/judgeme.server';

/**
 * Resource route for reviews:
 *  - GET  → fetch published reviews (called lazily by CustomPrintInfo so the two
 *           Judge.me API calls never block the wizard's initial render).
 *  - POST → receives the on-site "Write a review" form and submits it to Judge.me
 *           server-side, so the private token never touches the client.
 */

// The product these reviews attach to — matches the wizard loader's productHandle.
const PRODUCT_HANDLE = 'design-your-bandana';

export async function loader({context}: Route.LoaderArgs) {
  return fetchProductReviews(context.env, PRODUCT_HANDLE);
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  return submitReview(context.env, {
    handle: PRODUCT_HANDLE,
    name: String(form.get('name') ?? ''),
    email: String(form.get('email') ?? ''),
    rating: Number(form.get('rating') ?? 0),
    title: String(form.get('title') ?? ''),
    body: String(form.get('body') ?? ''),
  });
}
