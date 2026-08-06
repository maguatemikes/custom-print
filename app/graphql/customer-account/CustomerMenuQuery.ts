// Minimal Customer Account API query — just enough to greet the signed-in user
// in the header. Lives here so codegen validates it against the Customer Account
// schema (where `customer` needs no access-token argument), not the Storefront one.
// https://shopify.dev/docs/api/customer/latest/objects/Customer
export const CUSTOMER_MENU_QUERY = `#graphql
  query CustomerMenu {
    customer {
      firstName
      lastName
    }
  }
` as const;
