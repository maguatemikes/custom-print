import {Link} from 'react-router';

export type Crumb = {label: string; href?: string};

/**
 * Visible breadcrumb trail (full-width, above the page grid). The last item is
 * the current page (no link). Emit the matching BreadcrumbList JSON-LD from the
 * route's `meta` (see `breadcrumbJsonLd`) so the structured data mirrors this.
 */
export function Breadcrumbs({
  items,
  className = 'mb-5',
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.label} className="flex items-center gap-1.5">
              {it.href && !last ? (
                <Link
                  to={it.href}
                  prefetch="intent"
                  className="transition-colors hover:text-ink"
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-ink"
                  aria-current={last ? 'page' : undefined}
                >
                  {it.label}
                </span>
              )}
              {!last ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 shrink-0 text-black/25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Build the BreadcrumbList JSON-LD object for a route's `meta` — pass the SAME
 * items shown by <Breadcrumbs> plus the site origin so the `item` URLs are
 * absolute (Google requires the structured data to match the visible trail).
 */
export function breadcrumbJsonLd(items: Crumb[], origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.href ? {item: `${origin}${it.href}`} : {}),
    })),
  };
}
