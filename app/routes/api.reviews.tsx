import type {Route} from './+types/api.reviews';
import {fetchProductReviews, submitReview} from '~/lib/judgeme.server';

/**
 * Resource route for reviews (PER PRODUCT):
 *  - GET  ?handle=… → fetch that product's published reviews (called lazily by
 *           the reviews UI so the Judge.me API calls never block the render).
 *  - POST (with a `handle` field) → submit a review to that product on Judge.me,
 *           server-side so the private token never touches the client.
 */

// Accept any real product handle (custom-print shapes AND normal PDP products).
// A missing/malformed handle falls back to the Square product. The slug shape
// guard keeps the value sane before it reaches Judge.me.
const DEFAULT_HANDLE = 'custom-square-bandana-wizard';
const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,127}$/i;
function resolveHandle(handle: string | null | undefined): string {
  return handle && HANDLE_RE.test(handle) ? handle : DEFAULT_HANDLE;
}

export async function loader({request, context}: Route.LoaderArgs) {
  const handle = resolveHandle(new URL(request.url).searchParams.get('handle'));
  return fetchProductReviews(context.env, handle);
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  return submitReview(context.env, {
    handle: resolveHandle(String(form.get('handle') ?? '')),
    name: String(form.get('name') ?? ''),
    email: String(form.get('email') ?? ''),
    rating: Number(form.get('rating') ?? 0),
    title: String(form.get('title') ?? ''),
    body: String(form.get('body') ?? ''),
  });
}
