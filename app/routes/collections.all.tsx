import {useState} from 'react';
import type {Route} from './+types/collections.all';
import {useLoaderData} from 'react-router';
import {getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {
  CollectionFilters,
  SortMenu,
  ActiveFilterChips,
  useFilterPending,
  type Facet,
} from '~/components/CollectionFilters';
import {GridPending} from '~/components/GridPending';
import {siteOrigin} from '~/lib/seo';

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Shop All — Berlin Houseware';
  const description =
    'Browse everything at Berlin Houseware — new and verified pre-loved homeware. Filter by color, brand, and price to find your next piece.';
  const url = `${siteOrigin(matches)}/collections/all`;
  return [
    {title},
    {name: 'description', content: description},
    // Canonical stays on the base URL so filter/sort params
    // (?filter=…&sort=…) don't fragment into duplicate pages.
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const searchParams = new URL(request.url).searchParams;
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});

  // Build the native Storefront filter input from the URL.
  const productFilters: Array<Record<string, unknown>> = [];
  for (const f of searchParams.getAll('filter')) {
    try {
      productFilters.push(JSON.parse(f) as Record<string, unknown>);
    } catch {
      // ignore malformed filter params
    }
  }
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice || maxPrice) {
    productFilters.push({
      price: {
        min: minPrice ? Number(minPrice) : 0,
        ...(maxPrice ? {max: Number(maxPrice)} : {}),
      },
    });
  }

  const sort = searchParams.get('sort') || '';
  let sortKey: 'RELEVANCE' | 'PRICE' = 'RELEVANCE';
  let reverse = false;
  if (sort === 'price-asc') {
    sortKey = 'PRICE';
    reverse = false;
  } else if (sort === 'price-desc') {
    sortKey = 'PRICE';
    reverse = true;
  }

  const {search} = await storefront.query(SHOP_QUERY, {
    variables: {
      ...paginationVariables,
      productFilters,
      sortKey,
      reverse,
    },
  });

  return {search};
}

export default function ShopAll() {
  const {search} = useLoaderData<typeof loader>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const facets = (search?.productFilters ?? []) as unknown as Facet[];
  const pending = useFilterPending();

  return (
    <div className="bg-paper">
      <div className="bg-mint">
        <div className="ui-container py-12">
          <span className="eyebrow text-brand-700">Browse everything</span>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight md:text-6xl">
            Shop
          </h1>
        </div>
      </div>

      <div className="ui-container flex flex-col gap-8 py-10 lg:flex-row">
        {/* Desktop sidebar (a div, not <aside> — the global `aside` rule is
            reserved for the fixed drawers) */}
        <div className="hidden lg:block lg:w-60 lg:shrink-0">
          <div className="sticky top-28">
            <p className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">
              Filters
            </p>
            <CollectionFilters facets={facets} />
          </div>
        </div>

        {/* Results */}
        <div id="collection-results" className="min-w-0 flex-1 scroll-mt-32">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="btn btn-outline !px-4 !py-2 text-sm lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Filters
            </button>
            <div className="ml-auto">
              <SortMenu />
            </div>
          </div>

          <div className="mb-5">
            <ActiveFilterChips facets={facets} />
          </div>

          <GridPending pending={pending}>
          <Pagination connection={search}>
            {({nodes, isLoading, PreviousLink, NextLink}) => {
              const products = nodes.filter((n) => n.__typename === 'Product');
              if (!products.length) {
                return (
                  <div className="rounded-3xl bg-mint px-6 py-16 text-center">
                    <p className="text-lg font-bold text-ink">
                      No products match these filters
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Try removing a filter or clearing them all.
                    </p>
                  </div>
                );
              }
              return (
                <div>
                  <div className="mb-6 flex justify-center empty:mb-0">
                    <PreviousLink className="btn btn-outline !py-2 text-sm">
                      {isLoading ? 'Loading…' : '↑ Load previous'}
                    </PreviousLink>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                    {products.map((product, i) => (
                      <ProductItem
                        key={product.id}
                        product={product}
                        loading={i < 6 ? 'eager' : 'lazy'}
                      />
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col items-center gap-3 border-t border-black/10 pt-6">
                    <p className="text-sm text-muted">
                      Showing {products.length}{' '}
                      {products.length === 1 ? 'product' : 'products'}
                    </p>
                    <NextLink className="btn btn-dark !py-2.5 text-sm">
                      {isLoading ? 'Loading…' : 'Load more'}
                    </NextLink>
                  </div>
                </div>
              );
            }}
          </Pagination>
          </GridPending>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <p className="text-lg font-extrabold uppercase tracking-tight">
                Filters
              </p>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <CollectionFilters facets={facets} />
            </div>
            <div className="border-t border-black/10 p-4">
              <button
                onClick={() => setFiltersOpen(false)}
                className="btn btn-dark w-full"
              >
                View results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SHOP_QUERY = `#graphql
  fragment ShopProduct on Product {
    id
    handle
    title
    vendor
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
  }
  query Shop(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    search(
      query: ""
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      types: [PRODUCT]
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $reverse
      unavailableProducts: LAST
    ) {
      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        __typename
        ...ShopProduct
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;
