import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  const article = data?.article;
  if (!article) return [{title: 'Article — Custom Bandanas'}];
  const title = article.seo?.title || `${article.title} — Custom Bandanas`;
  const description = (article.seo?.description || article.title)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const image = article.image?.url;
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'article'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    ...(image ? [{property: 'og:image', content: image}] : []),
    ...(article.publishedAt
      ? [{property: 'article:published_time', content: article.publishedAt}]
      : []),
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    ...(image ? [{name: 'twitter:image', content: image}] : []),
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description,
        image: image ? [image] : undefined,
        datePublished: article.publishedAt,
        author: article.author?.name
          ? {'@type': 'Person', name: article.author.name}
          : undefined,
        publisher: {'@type': 'Organization', name: 'Custom Bandanas'},
      },
    },
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
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (blog?.articleByHandle) {
    redirectIfHandleIsLocalized(
      request,
      {
        handle: articleHandle,
        data: blog.articleByHandle,
      },
      {
        handle: blogHandle,
        data: blog,
      },
    );

    const moreArticles: SidebarArticle[] = (blog.articles?.nodes ?? [])
      .filter((a) => a.handle !== articleHandle)
      .slice(0, 4)
      .map((a) => ({
        id: a.id,
        handle: a.handle,
        title: a.title,
        publishedAt: a.publishedAt,
        excerpt: a.excerpt,
        tags: a.tags,
        author: a.author,
        image: a.image,
        blog: {handle: blogHandle},
      }));

    return {article: blog.articleByHandle, moreArticles};
  }

  throw new Response(null, {status: 404});
}

/** Compact article shape for the "Keep reading" sidebar. */
type SidebarArticle = {
  id: string;
  handle: string;
  title: string;
  publishedAt: string;
  excerpt?: string | null;
  tags?: string[] | null;
  author?: {name?: string | null} | null;
  image?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  blog: {handle: string};
};

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const {article, moreArticles} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  // Rough reading time from the body copy (~200 wpm).
  const wordCount = contentHtml
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <article className="bg-paper">
      {/* Title block */}
      <header className="bg-mint">
        <div className="ui-container py-16 md:py-20">
          <Link
            to="/blogs"
            prefetch="intent"
            className="eyebrow text-brand-700 transition-colors hover:text-brand-800"
          >
            ← Journal
          </Link>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {author?.name ? (
              <span className="font-semibold text-ink">{author.name}</span>
            ) : null}
            {author?.name ? <span aria-hidden="true">·</span> : null}
            <time dateTime={article.publishedAt}>{publishedDate}</time>
            <span aria-hidden="true">·</span>
            <span>{readingMinutes} min read</span>
          </p>
        </div>
      </header>

      {/* Two-column: ~80% article / ~20% keep-reading sidebar */}
      <div className="ui-container py-12 md:py-16">
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_15rem] md:gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16">
          {/* Article column */}
          <div className="min-w-0">
            {image ? (
              <div className="mb-10 aspect-[16/9] overflow-hidden rounded-3xl bg-mint md:mb-12">
                <Image
                  data={image}
                  aspectRatio="16/9"
                  sizes="(min-width: 1024px) 900px, 100vw"
                  loading="eager"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <div
              className="max-w-none text-base leading-relaxed text-ink/80 [&>*:first-child]:mt-0 [&>p:first-of-type]:text-lg [&>p:first-of-type]:leading-relaxed [&>p:first-of-type]:text-ink [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:mt-8 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-500 [&_blockquote]:pl-5 [&_blockquote]:text-lg [&_blockquote]:font-medium [&_blockquote]:italic [&_blockquote]:text-ink [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:marker:text-brand-500 [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
              dangerouslySetInnerHTML={{__html: contentHtml}}
            />

            <div className="mt-12 border-t border-black/10 pt-8">
              <Link to="/blogs" className="btn btn-outline">
                ← Back to the Journal
              </Link>
            </div>
          </div>

          {/* Keep-reading sidebar. NOTE: use a <div>, not <aside> — app.css
              styles every <aside> as the fixed slide-out drawer. */}
          {moreArticles.length > 0 ? (
            <div className="mt-14 border-t border-black/10 pt-10 md:mt-0 md:border-t-0 md:pt-0">
              <div className="md:sticky md:top-28">
                <h2 className="eyebrow text-brand-700">Keep reading</h2>
                <ul className="mt-5 space-y-5">
                  {moreArticles.map((a) => (
                    <li key={a.id}>
                      <SidebarCard article={a} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SidebarCard({article}: {article: SidebarArticle}) {
  const date = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(article.publishedAt));
  const author = article.author?.name?.trim();
  const tags = (article.tags ?? []).slice(0, 2);
  return (
    <Link
      to={`/blogs/${article.blog.handle}/${article.handle}`}
      prefetch="intent"
      className="group block"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-mint ring-1 ring-black/5">
        {article.image ? (
          <Image
            data={article.image}
            aspectRatio="16/10"
            loading="lazy"
            sizes="(min-width: 1280px) 20rem, 18rem"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs font-bold lowercase text-brand-600">
            custombandanas
          </div>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold text-brand-700">
        {author ? (
          <>
            <span className="text-ink">{author}</span>
            <span className="text-muted"> · {date}</span>
          </>
        ) : (
          <span className="text-muted">{date}</span>
        )}
      </p>
      <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-ink group-hover:underline">
        {article.title}
      </h3>
      {article.excerpt ? (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">
          {article.excerpt}
        </p>
      ) : null}
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-medium text-ink"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
      articles(first: 5, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          publishedAt
          excerpt
          tags
          author: authorV2 {
            name
          }
          image {
            id
            altText
            url
            width
            height
          }
        }
      }
    }
  }
` as const;
