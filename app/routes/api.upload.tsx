import type {Route} from './+types/api.upload';
import {uploadToShopifyFiles} from '~/lib/shopifyFiles.server';

/**
 * POST /api/upload — hosts an image on Shopify Files and returns its CDN URL.
 * Body: { dataUrl: "data:<mime>;base64,...", filename: string }
 * Response: { url } on success, { error } otherwise.
 */

// Accepted upload types (IMAGES ONLY — png/jpg/webp/gif), each paired with a
// byte-signature check on the ACTUAL file contents. A MIME allowlist alone isn't
// enough — a caller can lie about the type — so we also verify the file's leading
// "magic" bytes match what it claims. Anything not listed (SVG, PDF, HTML,
// executables, …) is refused. Raster images are inert (a browser can't execute
// them), which is why SVG and PDF are deliberately excluded.
const SIGNATURES = new Map<string, (b: Uint8Array) => boolean>([
  ['image/png', (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/gif', (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38],
  [
    'image/webp',
    (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // "WEBP"
  ],
]);

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }
  try {
    const {dataUrl, filename} = (await request.json()) as {
      dataUrl?: string;
      filename?: string;
    };
    if (!dataUrl || !filename) {
      return Response.json({error: 'Missing dataUrl or filename'}, {status: 400});
    }

    const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
    if (!match) {
      return Response.json({error: 'Invalid data URL'}, {status: 400});
    }
    const mimeType = match[1];
    // Allowlist: reject any type we don't explicitly accept, before decoding.
    const sniff = SIGNATURES.get(mimeType);
    if (!sniff) {
      return Response.json({error: 'Unsupported file type'}, {status: 415});
    }
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // Content sniff: the real bytes must match the declared type, so a caller
    // can't smuggle a script/executable in by mislabelling it as an image.
    if (!sniff(bytes)) {
      return Response.json(
        {error: 'File contents do not match its type'},
        {status: 415},
      );
    }

    const url = await uploadToShopifyFiles(context.env, {
      filename,
      mimeType,
      bytes,
    });
    return Response.json({url});
  } catch (error) {
    return Response.json(
      {error: error instanceof Error ? error.message : 'Upload failed'},
      {status: 500},
    );
  }
}

// GET on this resource route just returns a hint (no page).
export async function loader() {
  return Response.json({error: 'POST an image to this endpoint'}, {status: 405});
}
