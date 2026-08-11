/**
 * Uploads a file to Shopify Files (cdn.shopify.com) via the Admin API and
 * returns its permanent CDN URL. Three steps:
 *   1. stagedUploadsCreate → a temporary upload target
 *   2. POST the bytes to that target
 *   3. fileCreate → poll until Shopify finishes processing and exposes the URL
 *
 * Requires an Admin API token with `write_files` (env.PRIVATE_ADMIN_API_TOKEN).
 * Server-only — never import into client code.
 */

import {getAdminAccessToken} from './adminToken.server';

const API_VERSION = '2025-04';

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{name: string; value: string}>;
};

async function adminGraphql<T>(
  domain: string,
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = (await res.json()) as {data?: T; errors?: unknown};
  if (!res.ok || json.errors) {
    throw new Error(`Admin API error: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data as T;
}

export async function uploadToShopifyFiles(
  env: Env,
  file: {filename: string; mimeType: string; bytes: Uint8Array},
): Promise<string> {
  const domain = env.PUBLIC_STORE_DOMAIN;
  if (!domain) throw new Error('PUBLIC_STORE_DOMAIN is not set');
  // Auto-minted/refreshed by the broker (falls back to the static token).
  const token = await getAdminAccessToken(env);

  // 1. Ask Shopify for a staged upload target.
  const staged = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: Array<{message: string}>;
    };
  }>(
    domain,
    token,
    `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { message }
      }
    }`,
    {
      input: [
        {
          filename: file.filename,
          mimeType: file.mimeType,
          resource: 'FILE',
          httpMethod: 'POST',
          fileSize: String(file.bytes.byteLength),
        },
      ],
    },
  );

  const errs = staged.stagedUploadsCreate.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('No staged upload target returned');

  // 2. POST the bytes to the staged target (parameters first, file last).
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append(
    'file',
    new Blob([file.bytes], {type: file.mimeType}),
    file.filename,
  );
  const upload = await fetch(target.url, {method: 'POST', body: form});
  if (!upload.ok) {
    throw new Error(`Staged upload failed: ${upload.status}`);
  }

  // 3. Register the file, then poll until it's READY and the URL is exposed.
  const created = await adminGraphql<{
    fileCreate: {
      files: Array<{id: string}>;
      userErrors: Array<{message: string}>;
    };
  }>(
    domain,
    token,
    `mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
        userErrors { message }
      }
    }`,
    {
      files: [
        {
          originalSource: target.resourceUrl,
          contentType: 'FILE',
          alt: file.filename,
        },
      ],
    },
  );

  const cErrs = created.fileCreate.userErrors;
  if (cErrs?.length) throw new Error(cErrs.map((e) => e.message).join('; '));
  const id = created.fileCreate.files[0]?.id;
  if (!id) throw new Error('fileCreate returned no file id');

  for (let attempt = 0; attempt < 8; attempt++) {
    const node = await adminGraphql<{
      node:
        | {url?: string | null; image?: {url?: string | null} | null}
        | null;
    }>(
      domain,
      token,
      `query fileUrl($id: ID!) {
        node(id: $id) {
          ... on GenericFile { url }
          ... on MediaImage { image { url } }
        }
      }`,
      {id},
    );
    const url = node.node?.url ?? node.node?.image?.url ?? null;
    if (url) return url;
    await new Promise((r) => setTimeout(r, 600));
  }

  throw new Error('Timed out waiting for Shopify to process the file');
}
