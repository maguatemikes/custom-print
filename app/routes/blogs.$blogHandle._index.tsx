import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {siteOrigin} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, matches, location}) => {
  const blogTitle = data?.blog?.title;
  const title = blogTitle
    ? `${blogTitle} — Custom Bandanas`
    : 'Blog — Custom Bandanas';
  const description = blogTitle
    ? `${blogTitle} — guides and inspiration from Custom Bandanas on custom bandana printing, design, and bulk ordering.`
    : 'Stories and guides from Custom Bandanas.';
  const url = `${siteOrigin(matches)}${location.pathname}`;
  return [
    {title},
    {name: 'description', content: description},
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
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  if (!params.blogHandle) {
    throw new Response(`blog not found`, {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.blogHandle, data: blog});

  return {blog};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blog() {
  const {blog} = useLoaderData<typeof loader>();
  const {articles} = blog;
  const isEmpty = articles.nodes.length === 0;

  return (
    <div className="bg-paper">
      {/* Header */}
      <section className="bg-mint">
        <div className="ui-container py-16 md:py-24">
          <Link
            to="/blogs"
            prefetch="intent"
            className="eyebrow text-brand-700 transition-colors hover:text-brand-800"
          >
            ← Journal
          </Link>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold uppercase leading-tight tracking-tight md:text-6xl">
            {blog.title}
          </h1>
        </div>
      </section>

      {/* Articles */}
      <section className="bg-paper">
        <div className="ui-container py-16 md:py-24">
          {isEmpty ? (
            <EmptyState />
          ) : (
            <PaginatedResourceSection<ArticleItemFragment>
              connection={articles}
              resourcesClassName="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
            >
              {({node: article, index}) => (
                <ArticleItem
                  article={article}
                  key={article.id}
                  loading={index < 3 ? 'eager' : 'lazy'}
                />
              )}
            </PaginatedResourceSection>
          )}
        </div>
      </section>
    </div>
  );
}

function ArticleItem({
  article,
  loading,
}: {
  article: ArticleItemFragment;
  loading?: HTMLImageElement['loading'];
}) {
  const publishedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt!));
  return (
    <Link
      to={`/blogs/${article.blog.handle}/${article.handle}`}
      prefetch="intent"
      className="group block"
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-mint">
        {article.image ? (
          <Image
            alt={article.image.altText || article.title}
            aspectRatio="3/2"
            data={article.image}
            loading={loading}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-brand-600">
            <span className="text-sm font-bold lowercase">custombandanas</span>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-700">
        {publishedAt}
      </p>
      <h3 className="mt-1 text-lg font-bold leading-snug text-ink group-hover:underline">
        {article.title}
      </h3>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-mint px-8 py-16 text-center">
      <h2 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
        Coming soon
      </h2>
      <p className="mt-3 text-sm text-muted">
        No stories here yet — we&apos;re working on the first ones. Explore the
        collection while you wait.
      </p>
      <Link to="/collections/all" className="btn btn-dark mt-8">
        Shop the collection
      </Link>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          hasNextPage
          endCursor
          startCursor
        }

      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
` as const;
