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
            <span className="text-2xl font-extrabold lowercase tracking-tight text-white">
              custom<span className="text-brand-400">bandanas</span>
            </span>
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
            {header?.shop?.name || 'Berlin Houseware'}. All rights reserved.
          </p>
          <p>Powered by Shopify Hydrogen · Carbon-neutral shipping</p>
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

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com',
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
    label: 'TikTok',
    href: 'https://tiktok.com',
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
    label: 'X',
    href: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 4l16 16M20 4L4 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
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
