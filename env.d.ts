/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    // NetX Media CDN (WFE) — the wizard/PDP host logo + design-output images here
    // as PUBLIC, edge-cached assets (media.wholesaleforeveryone.com). Bearer key
    // is server-only; never expose to the client.
    NETX_API_KEY?: string;
    NETX_API_BASE_URL?: string;
    // Admin API access token (`write_files` scope) — legacy Shopify Files upload
    // path (cdn.shopify.com), no longer used for uploads; kept for other Admin API
    // needs (token broker below). Rotating `shpca_` token.
    PRIVATE_ADMIN_API_TOKEN?: string;
    // Client credentials for the token-rotation broker. When both are set the
    // app auto-mints/refreshes the Admin token from them (client-credentials
    // grant → /admin/oauth/access_token), so it never manually expires. Secret.
    SHOPIFY_CLIENT_ID?: string;
    SHOPIFY_CLIENT_SECRET?: string;
  }
}
