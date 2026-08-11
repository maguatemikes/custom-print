import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs._index';
import {Image} from '@shopify/hydrogen';
import {siteOrigin} from '~/lib/seo';

/** Minimal article shape the Journal cards read — satisfied by both the
 *  Storefront article and the dev mock. */
type JournalArticle = {
  id: string;
  handle: string;
  title: string;
  publishedAt: string;
  excerpt?: string | null;
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

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Journal — Custom Bandanas';
  const description =
    'Guides and inspiration from Custom Bandanas on custom bandana printing, design tips, digital printing, and ordering in bulk for teams, brands, and events.';
  return [
    {title},
    {name: 'description', content: description},
    {tagName: 'link', rel: 'canonical', href: `${siteOrigin(matches)}/blogs`},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const {blogs} = await storefront.query(JOURNAL_QUERY, {
    // Short cache so newly published posts surface on the Journal promptly.
    cache: storefront.CacheShort(),
  });

  // Flatten every blog's recent articles into one Journal feed, newest first.
  const articles: JournalArticle[] = (blogs?.nodes ?? []).flatMap((b) =>
    (b.articles?.nodes ?? []).map((a) => ({
      id: a.id,
      handle: a.handle,
      title: a.title,
      publishedAt: a.publishedAt,
      excerpt: a.excerpt,
      author: a.author,
      image: a.image,
      blog: {handle: b.handle},
    })),
  );
  articles.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const primaryBlogHandle =
    articles[0]?.blog.handle ?? blogs?.nodes?.[0]?.handle ?? 'news';

  return {articles, primaryBlogHandle};
}

export default function Journal() {
  const {articles, primaryBlogHandle} = useLoaderData<typeof loader>();
  const [featured, ...rest] = articles;

  if (articles.length === 0) {
    return (
      <div className="bg-paper">
        <div className="ui-container py-16 md:py-24">
          <span className="eyebrow text-brand-700">The Journal</span>
          <h1 className="mt-3 text-4xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-6xl">
            Stories from Custom Bandanas
          </h1>
          <div className="mt-12">
            <EmptyState />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper">
      {/* Intro */}
      <section className="bg-paper">
        <div className="ui-container pb-6 pt-14 md:pt-20">
          <span className="eyebrow text-brand-700">The Journal</span>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-6xl">
            Stories from Custom Bandanas
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Guides and inspiration on custom bandana printing, design tips, and
            ordering in bulk for teams, brands, schools, and events.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured ? (
        <section className="bg-paper">
          <div className="ui-container pb-8">
            <FeaturedPost article={featured} />
          </div>
        </section>
      ) : null}

      {/* Recent posts */}
      {rest.length > 0 ? (
        <section className="bg-paper">
          <div className="ui-container pb-16 md:pb-24">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
                Recent posts
              </h2>
              <Link
                to={`/blogs/${primaryBlogHandle}`}
                prefetch="intent"
                className="btn btn-outline shrink-0"
              >
                View all posts
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article, i) => (
                <PostCard
                  key={article.id}
                  article={article}
                  loading={i < 3 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function articleHref(a: JournalArticle) {
  return `/blogs/${a.blog.handle}/${a.handle}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function FeaturedPost({article}: {article: JournalArticle}) {
  return (
    <Link
      to={articleHref(article)}
      prefetch="intent"
      className="group relative block overflow-hidden rounded-3xl bg-mint ring-1 ring-black/5"
    >
      <div className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[5/2]">
        {article.image ? (
          <Image
            data={article.image}
            sizes="(min-width: 90rem) 1400px, 100vw"
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-brand-600">
            <span className="text-lg font-bold lowercase">custombandanas</span>
          </div>
        )}
      </div>

      {/* Scrim + content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 lg:p-12">
        <span className="eyebrow text-brand-400">Featured</span>
        <h3 className="mt-3 max-w-3xl text-2xl font-extrabold leading-[1.1] tracking-tight text-white md:text-4xl lg:text-5xl">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-white/85 md:text-base">
            {article.excerpt}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <AuthorLine article={article} tone="light" />
          <span className="hidden items-center gap-1.5 text-sm font-semibold text-white sm:inline-flex">
            Read article
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({
  article,
  loading,
}: {
  article: JournalArticle;
  loading?: 'eager' | 'lazy';
}) {
  return (
    <Link to={articleHref(article)} prefetch="intent" className="group block">
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-mint ring-1 ring-black/5">
        {article.image ? (
          <Image
            data={article.image}
            aspectRatio="3/2"
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

      <h3 className="mt-4 flex items-start justify-between gap-2 text-lg font-bold leading-snug text-ink">
        <span className="group-hover:underline">{article.title}</span>
        <svg
          viewBox="0 0 24 24"
          className="mt-1 h-4 w-4 shrink-0 text-brand-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        >
          <path
            d="M7 17 17 7M9 7h8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </h3>
      {article.excerpt ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-4">
        <AuthorLine article={article} />
      </div>
    </Link>
  );
}

function AuthorLine({
  article,
  tone = 'dark',
}: {
  article: JournalArticle;
  tone?: 'dark' | 'light';
}) {
  const name = article.author?.name?.trim();
  const initial = name ? name.charAt(0).toUpperCase() : 'B';
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
        {initial}
      </span>
      <span className={tone === 'light' ? 'text-white/80' : 'text-muted'}>
        {name ? (
          <span
            className={
              tone === 'light'
                ? 'font-semibold text-white'
                : 'font-semibold text-ink'
            }
          >
            {name}
          </span>
        ) : null}
        {name ? ' · ' : null}
        {formatDate(article.publishedAt)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-mint px-8 py-16 text-center">
      <h2 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
        Coming soon
      </h2>
      <p className="mt-3 text-sm text-muted">
        We&apos;re writing our first stories. In the meantime, explore our
        custom-printed bandanas and merch.
      </p>
      <Link to="/collections/all" className="btn btn-dark mt-8">
        Shop the collection
      </Link>
    </div>
  );
}

const JOURNAL_QUERY = `#graphql
  query Journal($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    blogs(first: 10) {
      nodes {
        handle
        articles(first: 8, sortKey: PUBLISHED_AT, reverse: true) {
          nodes {
            id
            handle
            title
            publishedAt
            excerpt
            author: authorV2 {
              name
            }
            image {
              id
              url
              altText
              width
              height
            }
          }
        }
      }
    }
  }
` as const;
