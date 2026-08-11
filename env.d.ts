/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    // Admin API access token (`write_files` scope) for hosting logo +
    // design-output images on Shopify Files (cdn.shopify.com). This is a
    // rotating `shpca_` token; used as a fallback if the broker below can't run.
    PRIVATE_ADMIN_API_TOKEN?: string;
    // Client credentials for the token-rotation broker. When both are set the
    // app auto-mints/refreshes the Admin token from them (client-credentials
    // grant → /admin/oauth/access_token), so it never manually expires. Secret.
    SHOPIFY_CLIENT_ID?: string;
    SHOPIFY_CLIENT_SECRET?: string;
  }
}
