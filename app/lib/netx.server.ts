/**
 * Uploads a file to the NetX Media CDN (media.wholesaleforeveryone.com) as a
 * PUBLIC, edge-cached asset and returns its public URL. One multipart POST to
 * `/assets/` (vs Shopify Files' 3-step staged upload + poll).
 *
 * Response (201): { slug, ext, url, size, content_type, version, ... }
 *   → the public URL is `.url`, served at the ROOT domain:
 *     https://media.wholesaleforeveryone.com/<slug>.<ext>
 *
 * Server-only — never import into client code (uses the private NETX_API_KEY).
 * The wizard/PDP upload endpoint (`api.upload`) is the only caller.
 */

const DEFAULT_BASE = 'https://media.wholesaleforeveryone.com/api/v1/';

/** Read the Bearer key, tolerating stray surrounding quotes/whitespace in .env. */
function netxKey(env: Env): string {
  const key = env.NETX_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('NETX_API_KEY is not set');
  return key;
}

/**
 * A UNIQUE, URL-safe slug for each upload. NetX addresses assets by slug and
 * `PUT`-replaces in place, so a non-unique slug would let one order's design
 * overwrite another's — hence the random suffix. The wizard reuses filenames
 * (`design-front.png`, `logo.png`, …) across orders, so uniqueness is essential.
 */
function toSlug(filename: string): string {
  const base =
    filename
      .replace(/\.[^.]+$/, '') // drop extension (NetX derives `ext` from the file)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'upload';
  return `${base}-${crypto.randomUUID().slice(0, 12)}`;
}

export async function uploadToNetX(
  env: Env,
  file: {filename: string; mimeType: string; bytes: Uint8Array},
): Promise<string> {
  const key = netxKey(env);
  const base = (env.NETX_API_BASE_URL?.trim() || DEFAULT_BASE).replace(
    /\/?$/,
    '/',
  );
  const slug = toSlug(file.filename);

  // NOTE: the API's file field is `upload` (the published guide says `file`,
  // which returns 422 — verified against the live endpoint).
  const form = new FormData();
  form.append(
    'upload',
    new Blob([file.bytes as BlobPart], {type: file.mimeType}),
    file.filename,
  );
  form.append('slug', slug);

  const res = await fetch(`${base}assets/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      // A retry with the same key won't create a duplicate asset.
      'Idempotency-Key': slug,
      Accept: 'application/json',
    },
    body: form,
  });

  const json = (await res.json().catch(() => null)) as {
    url?: string;
    error?: {message?: string; detail?: unknown};
  } | null;

  if (!res.ok || !json?.url) {
    const msg =
      json?.error?.message ?? `NetX upload failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return json.url;
}
