/**
 * In-memory (per browser session) cache for the account section's personal
 * loader data — the layout's customer details and the orders list — so
 * navigating away and back paints instantly instead of re-hitting the
 * uncacheable Customer Account API on every visit.
 *
 * SECURITY — this holds personal data, so it is deliberately constrained:
 * - **Memory only.** Never written to localStorage / sessionStorage / IndexedDB
 *   / disk, so it inherits the account's `Cache-Control: no-store` privacy: it
 *   evaporates on tab close or a full page reload and never persists.
 * - **Client-only.** Read/written ONLY from a route's `clientLoader` /
 *   `clientAction` (browser). The server `loader` must never touch it — a module
 *   singleton on the server is shared across requests, which would leak one
 *   customer's data to another. Because only client code calls these, the
 *   server-side value stays empty forever.
 * - **Cleared on logout** (see account_.logout `clientAction`) so a different
 *   customer on a shared device can never be served the previous one's cached
 *   data. The account layout's auth gate is the primary guard; this is
 *   defense-in-depth.
 * - **Short TTL** bounds staleness; details/order status still refresh on their
 *   own once the TTL lapses.
 */

type Entry = {data: unknown; at: number};

const store = new Map<string, Entry>();

/** How long a cached result is served before a fresh fetch (ms). */
const TTL_MS = 60_000;

/** Cached data for `key` if present and still fresh, else null (→ fetch). */
export function getCached<T>(key: string): T | null {
  const e = store.get(key);
  if (e && Date.now() - e.at < TTL_MS) return e.data as T;
  return null;
}

/** Remember loader data under `key` (call from clientLoader only). */
export function setCached(key: string, data: unknown): void {
  store.set(key, {data, at: Date.now()});
}

/** Drop one cached key — called after a mutation so the next read fetches fresh. */
export function invalidateCached(key: string): void {
  store.delete(key);
}

/** Drop EVERY account cache — called on logout so the next customer starts clean. */
export function clearAccountCache(): void {
  store.clear();
}
