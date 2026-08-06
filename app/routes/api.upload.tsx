import type {Route} from './+types/api.upload';
import {uploadToShopifyFiles} from '~/lib/shopifyFiles.server';

/**
 * POST /api/upload — hosts an image on Shopify Files and returns its CDN URL.
 * Body: { dataUrl: "data:<mime>;base64,...", filename: string }
 * Response: { url } on success, { error } otherwise.
 */
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
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

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
