import {Suspense} from 'react';
import {Await, NavLink, Link} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      {label: 'New arrivals', to: '/collections/all'},
      {label: 'All collections', to: '/collections'},
      {label: 'Gift cards', to: '/'},
    ],
  },
  {
    title: 'Company',
    links: [
      {label: 'About Us', to: '/pages/about'},
      {label: 'Journal', to: '/blogs'},
      {label: 'Sustainability', to: '/pages/about'},
      {label: 'Careers', to: '/pages/about'},
    ],
  },
];

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <footer className="bg-ink text-white">
      <div className="ui-container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              prefetch="intent"
              aria-label="Wholesale For Everyone — home"
              className="inline-flex"
            >
              <img
                src="/wfe-logo.jpg"
                alt="Wholesale For Everyone"
                width={300}
                height={71}
                className="h-10 w-auto rounded-md bg-white p-2"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/60">
              Custom-printed bandanas and merch, made to order for brands,
              teams, schools, and events.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-600 hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Static columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      prefetch="intent"
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Dynamic policies column from Shopify menu */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-400">
              Help
            </h3>
            <Suspense fallback={<PolicyFallback />}>
              <Await resolve={footerPromise}>
                {(footer) => (
                  <FooterMenu
                    menu={footer?.menu}
                    primaryDomainUrl={header?.shop?.primaryDomain?.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                )}
              </Await>
            </Suspense>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="ui-container flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()}{' '}
            {header?.shop?.name || 'Custom Bandanas'}. All rights reserved.
          </p>
          <p>
            Powered by{' '}
            <span className="font-semibold text-white">NellacosaCorp</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function PolicyFallback() {
  return (
    <ul className="mt-4 space-y-3">
      {['Contact', 'Shipping', 'Returns', 'Privacy'].map((l) => (
        <li key={l}>
          <span className="text-sm text-white/70">{l}</span>
        </li>
      ))}
    </ul>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'] | undefined;
  primaryDomainUrl: string | undefined;
  publicStoreDomain: string;
}) {
  const items = (menu || FALLBACK_FOOTER_MENU).items;
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => {
        if (!item.url) return null;
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          (primaryDomainUrl && item.url.includes(primaryDomainUrl))
            ? new URL(item.url).pathname
            : item.url;
        const isExternal = !url.startsWith('/');
        const className =
          'text-sm text-white/70 transition-colors hover:text-white';
        return (
          <li key={item.id}>
            {isExternal ? (
              <a
                href={url}
                rel="noopener noreferrer"
                target="_blank"
                className={className}
              >
                {item.title}
              </a>
            ) : (
              <NavLink end prefetch="intent" to={url} className={className}>
                {item.title}
              </NavLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Official Wholesale For Everyone social profiles (sourced from the brand's own
// site footer). Icons are monoline, matching the site's functional-icon style.
const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wholesaleforeveryone',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/wholesaleforeveryonecom',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@wholesaleforeveryone',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46M14 4c.5 2.5 2 4 4.5 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@WholesaleForEveryone',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 2C5.12 20 12 20 12 20s6.88 0 8.59-.42a2.78 2.78 0 0 0 1.95-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 15.5l5-3.5-5-3.5z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Pinterest',
    href: 'https://www.pinterest.com/WholeSaleForEveryone',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10.6 18l1.6-6.1m-.6-1.8a2.3 2.3 0 1 1 3.9 1.7c-.4 1.6-1.9 2.5-3.3 2.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/wholesaleforeveryone',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v1.5A5 5 0 0 1 16 8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect
          x="2"
          y="9"
          width="4"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="4"
          cy="4"
          r="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
  },
];

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};
