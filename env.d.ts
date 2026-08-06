/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    // Admin API access token (custom app, `write_files` scope) for hosting
    // logo + design-output images on Shopify Files (cdn.shopify.com). Secret.
    PRIVATE_ADMIN_API_TOKEN?: string;
  }
}
