import {
  EMPTY_REVIEWS,
  type JudgemeReview,
  type JudgemeReviews,
} from './judgeme';

/**
 * Judge.me reviews — SERVER-ONLY (the `.server.ts` suffix keeps it out of the
 * client bundle). Uses the PRIVATE API token (env.JUDGEME_API_TOKEN) + the shop
 * domain to fetch published reviews for a product. Any missing config or API
 * error → an empty result so the page always degrades gracefully.
 *
 * Set the token as a secret (never in the repo):
 *   wrangler secret put JUDGEME_API_TOKEN      (production)
 *   JUDGEME_API_TOKEN=... in .env              (local dev, gitignored)
 */
const API = 'https://api.judge.me/api/v1';
// Note: creating a review uses the bare host (no `api.` prefix) per Judge.me docs.
const CREATE_REVIEW_URL = 'https://judge.me/api/v1/reviews';

type RawReview = {
  id?: number;
  rating?: number;
  body?: string;
  created_at?: string;
  reviewer?: {name?: string; email?: string};
  pictures?: Array<{urls?: {compact?: string; original?: string}}>;
};

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!then) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w > 1 ? 's' : ''} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m > 1 ? 's' : ''} ago`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y > 1 ? 's' : ''} ago`;
}

/**
 * Submit a customer review to Judge.me (server-side POST with the private token).
 * Creates an unverified web review (like the public product-page form). Returns a
 * simple ok/error the form can render. Judge.me may hold it for moderation.
 */
export async function submitReview(
  env: {JUDGEME_API_TOKEN?: string; PUBLIC_STORE_DOMAIN?: string},
  input: {
    handle: string;
    name: string;
    email: string;
    rating: number;
    title?: string;
    body: string;
  },
): Promise<{ok: boolean; error?: string}> {
  const token = env.JUDGEME_API_TOKEN;
  const shop = env.PUBLIC_STORE_DOMAIN;
  if (!token || !shop) {
    return {ok: false, error: 'Reviews aren’t set up yet — please try again later.'};
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email);
  if (
    !input.name.trim() ||
    !emailOk ||
    !input.body.trim() ||
    !(input.rating >= 1 && input.rating <= 5)
  ) {
    return {
      ok: false,
      error: 'Please add your name, a valid email, a star rating and a review.',
    };
  }
  try {
    const res = await fetch(CREATE_REVIEW_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        shop_domain: shop,
        platform: 'shopify',
        api_token: token,
        handle: input.handle,
        name: input.name.trim(),
        email: input.email.trim(),
        rating: input.rating,
        title: (input.title ?? '').trim(),
        body: input.body.trim(),
      }),
    });
    if (!res.ok) {
      return {ok: false, error: 'Couldn’t submit your review — please try again.'};
    }
    return {ok: true};
  } catch {
    return {ok: false, error: 'Couldn’t submit your review — please try again.'};
  }
}

export async function fetchProductReviews(
  env: {JUDGEME_API_TOKEN?: string; PUBLIC_STORE_DOMAIN?: string},
  handle: string,
): Promise<JudgemeReviews> {
  const token = env.JUDGEME_API_TOKEN;
  const shop = env.PUBLIC_STORE_DOMAIN;
  if (!token || !shop || !handle) return EMPTY_REVIEWS;

  const q = (params: Record<string, string>) =>
    Object.entries({shop_domain: shop, api_token: token, ...params})
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

  try {
    // 1) Resolve the Judge.me internal product id from the Shopify handle.
    const pRes = await fetch(`${API}/products/-1?${q({handle})}`);
    if (!pRes.ok) return EMPTY_REVIEWS;
    const pJson = (await pRes.json()) as {product?: {id?: number}};
    const productId = pJson.product?.id;
    if (!productId) return EMPTY_REVIEWS;

    // 2) Fetch published reviews for that product (up to 100).
    const rRes = await fetch(
      `${API}/reviews?${q({
        product_id: String(productId),
        per_page: '100',
        published: 'true',
      })}`,
    );
    if (!rRes.ok) return EMPTY_REVIEWS;
    const rJson = (await rRes.json()) as {reviews?: RawReview[]};
    const raw = Array.isArray(rJson.reviews) ? rJson.reviews : [];

    const reviews: JudgemeReview[] = raw
      .filter((r) => Number(r.rating) > 0)
      .map((r) => ({
        id: Number(r.id) || 0,
        name: (r.reviewer?.name || 'Verified buyer').trim(),
        when: relativeTime(r.created_at),
        score: Number(r.rating) || 0,
        body: String(r.body || '').trim(),
        photos: (r.pictures ?? [])
          .map((p) => p?.urls?.compact || p?.urls?.original || '')
          .filter(Boolean),
      }));

    const total = reviews.length;
    const overall = total
      ? Math.round((reviews.reduce((a, r) => a + r.score, 0) / total) * 10) / 10
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.score === stars).length,
    }));

    return {overall, total, distribution, reviews};
  } catch {
    return EMPTY_REVIEWS;
  }
}
