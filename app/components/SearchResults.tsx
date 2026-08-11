import {Link} from 'react-router';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

/** Small uppercase section heading shared by each result group. */
function ResultsHeading({children}: {children: React.ReactNode}) {
  return (
    <h2 className="mb-6 text-xl font-extrabold uppercase tracking-tight text-ink">
      {children}
    </h2>
  );
}

/** Styled link row used by Pages and Articles result groups. */
function LinkRow({to, title}: {to: string; title: string}) {
  return (
    <li>
      <Link
        prefetch="intent"
        to={to}
        className="flex items-center justify-between gap-4 py-4 text-ink transition-colors hover:text-brand-700"
      >
        <span className="font-semibold">{title}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="m9 6 6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </li>
  );
}

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div>
      <ResultsHeading>Articles</ResultsHeading>
      <ul className="divide-y divide-black/10 border-y border-black/10">
        {articles.nodes.map((article) => (
          <LinkRow
            key={article.id}
            title={article.title}
            to={urlWithTrackingParams({
              baseUrl: `/blogs/${article.handle}`,
              trackingParams: article.trackingParameters,
              term,
            })}
          />
        ))}
      </ul>
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div>
      <ResultsHeading>Pages</ResultsHeading>
      <ul className="divide-y divide-black/10 border-y border-black/10">
        {pages.nodes.map((page) => (
          <LinkRow
            key={page.id}
            title={page.title}
            to={urlWithTrackingParams({
              baseUrl: `/pages/${page.handle}`,
              trackingParams: page.trackingParameters,
              term,
            })}
          />
        ))}
      </ul>
    </div>
  );
}

function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div>
      <ResultsHeading>Products</ResultsHeading>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => (
          <div>
            <div className="mb-6 flex justify-center empty:mb-0">
              <PreviousLink className="btn btn-outline !py-2 text-sm">
                {isLoading ? 'Loading…' : '↑ Load previous'}
              </PreviousLink>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {nodes.map((product) => {
                const productUrl = urlWithTrackingParams({
                  baseUrl: `/products/${product.handle}`,
                  trackingParams: product.trackingParameters,
                  term,
                });
                const variant = product.selectedOrFirstAvailableVariant;
                const image = variant?.image;
                const price = variant?.price;

                return (
                  <Link
                    key={product.id}
                    prefetch="intent"
                    to={productUrl}
                    className="group block"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-mint">
                      {image ? (
                        <Image
                          data={image}
                          alt={image.altText || product.title}
                          aspectRatio="1/1"
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-brand-600">
                          <span className="text-sm font-bold lowercase">
                            custombandanas
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 px-1">
                      <h4 className="text-sm font-bold leading-snug text-ink">
                        {product.title}
                      </h4>
                      <p className="text-xs text-muted">
                        {product.vendor || 'Custom Bandanas'}
                      </p>
                      {price && (
                        <div className="mt-1 text-sm font-bold text-brand-700">
                          <Money data={price} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center empty:mt-0">
              <NextLink className="btn btn-dark !py-2.5 text-sm">
                {isLoading ? 'Loading…' : 'Load more'}
              </NextLink>
            </div>
          </div>
        )}
      </Pagination>
    </div>
  );
}

function SearchResultsEmpty() {
  return (
    <div className="rounded-3xl bg-mint px-6 py-16 text-center">
      <p className="text-lg font-bold text-ink">No results found</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Try a different term, check the spelling, or browse the full shop.
      </p>
      <Link to="/collections/all" className="btn btn-dark mt-6">
        Browse the shop
      </Link>
    </div>
  );
}
