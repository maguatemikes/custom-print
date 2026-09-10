/**
 * Client-only cache of tiny base64 proof thumbnails, keyed by the hosted proof
 * URL. The cart drawer paints this instantly instead of downloading the full
 * NetX proof — the order's `Design output` attribute still carries the real URL,
 * so checkout, the order admin, and the email are unchanged.
 *
 * Best-effort: an in-memory Map covers the add-to-cart -> drawer flow (no
 * network, no wait); a small sessionStorage mirror survives a page reload. When
 * neither has an entry (cold load), the cart simply falls back to the URL.
 * Server-safe — `sessionStorage`/`window` are absent during SSR, so reads/writes
 * no-op there and the URL is used.
 */

const mem = new Map<string, string>();
const STORE_KEY = 'cb:proofThumbs';
const MAX_ENTRIES = 24; // keep sessionStorage tiny — thumbs are a few KB each

function readStore(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

/** Remember a base64 thumbnail for a hosted proof URL (call at upload time). */
export function setProofThumb(
  url: string | null | undefined,
  dataUrl: string | null | undefined,
): void {
  if (!url || !dataUrl) return;
  mem.set(url, dataUrl);
  try {
    const store = readStore();
    store[url] = dataUrl;
    // Trim oldest keys so the mirror can never grow unbounded.
    const keys = Object.keys(store);
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) delete store[keys[i]];
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* sessionStorage unavailable (SSR / private mode) — memory is enough */
  }
}

/** The instant base64 thumbnail for a proof URL, or null to fall back to it. */
export function getProofThumb(url?: string | null): string | null {
  if (!url) return null;
  const hit = mem.get(url);
  if (hit) return hit;
  const stored = readStore()[url];
  if (stored) {
    mem.set(url, stored);
    return stored;
  }
  return null;
}
