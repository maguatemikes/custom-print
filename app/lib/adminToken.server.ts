/**
 * Admin API token broker — keeps a valid `write_files` Admin token available
 * without anyone hand-refreshing it.
 *
 * Shopify's `shpca_` Admin token is a rotating client-credentials token: it
 * expires (~24h) and must be re-minted. Because it's a *client-credentials*
 * grant, the server can mint a fresh one on its own — no browser, no human:
 *
 *   POST https://{shop}/admin/oauth/access_token
 *   { client_id, client_secret, grant_type: "client_credentials" }
 *   → 200 { access_token: "shpca_…", scope: "write_files", expires_in: 86399 }
 *
 * Strategy (lazy + cached):
 *   1. Return an in-memory cached token while it's still valid (minus a safety
 *      margin) — the hot path costs nothing.
 *   2. Otherwise mint a fresh one (single-flight, so concurrent uploads don't
 *      stampede the token endpoint) and cache it.
 *   3. If client credentials aren't set, fall back to a manually-pasted
 *      PRIVATE_ADMIN_API_TOKEN so nothing breaks before the broker is configured.
 *
 * Server-only. The in-memory cache lives per worker instance; each instance
 * mints at most once per token lifetime, and Shopify keeps previously-issued
 * tokens valid until their own expiry, so multiple instances never conflict.
 */

const TOKEN_PATH = '/admin/oauth/access_token';
// Refresh this long before the real expiry so in-flight requests never race a
// just-expired token.
const SAFETY_MARGIN_MS = 120_000; // 2 minutes

type Cached = {token: string; expiresAt: number};
let cached: Cached | null = null;
let inflight: Promise<string> | null = null;

async function mint(env: Env): Promise<string> {
  const domain = env.PUBLIC_STORE_DOMAIN;
  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;
  if (!domain) throw new Error('PUBLIC_STORE_DOMAIN is not set');

  const res = await fetch(`https://${domain}${TOKEN_PATH}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      `Admin token mint failed (${res.status}): ${
        json.error_description || json.error || 'no access_token returned'
      }`,
    );
  }

  const ttlMs = (json.expires_in ?? 86_400) * 1000;
  cached = {token: json.access_token, expiresAt: Date.now() + ttlMs - SAFETY_MARGIN_MS};
  return json.access_token;
}

/**
 * Returns a valid Admin API access token, minting/refreshing it on demand.
 * Prefers the client-credentials broker; falls back to the static token.
 */
export async function getAdminAccessToken(env: Env): Promise<string> {
  // 1. Still-valid cached token.
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  // 2. Auto-mint from client credentials when available (single-flight).
  if (env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET) {
    if (!inflight) {
      inflight = mint(env).finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  // 3. Fall back to the manually-pasted token.
  if (env.PRIVATE_ADMIN_API_TOKEN) return env.PRIVATE_ADMIN_API_TOKEN;

  throw new Error(
    'No Admin credentials: set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (auto) or PRIVATE_ADMIN_API_TOKEN (manual)',
  );
}

/** Drop the cached token (e.g. after a 401) so the next call re-mints. */
export function invalidateAdminToken(): void {
  cached = null;
}
