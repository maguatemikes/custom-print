import {Link} from 'react-router';
import type {Route} from './+types/pages.contact';
import {siteOrigin} from '~/lib/seo';

/**
 * Contact Us — a designed, static page (not a Shopify CMS page). Lives at
 * /pages/contact, which takes precedence over the generic pages.$handle route
 * (mirrors pages.about). No form on purpose — it shows the real, direct contact
 * channels (email, toll-free phone, mailing + location) so shoppers reach a
 * person, not a black-box form. Details sourced from Wholesale For Everyone.
 */
const EMAIL = 'info@wholesaleforeveryone.com';
const PHONE_DISPLAY = '800-355-1131';
const PHONE_HREF = 'tel:+18003551131';
const MAILING = 'PO Box 275, Hainesport, NJ 08036';
const LOCATION = '2402 Sylon Blvd, Hainesport, NJ 08036';

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Contact Us — Custom Bandanas';
  const description =
    'Get in touch with Custom Bandanas by Wholesale For Everyone. Email info@wholesaleforeveryone.com or call 800-355-1131 for help with orders, artwork proofs, and bulk or wholesale quotes.';
  const url = `${siteOrigin(matches)}/pages/contact`;
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
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: title,
        description,
        url,
        publisher: {
          '@type': 'Organization',
          name: 'Custom Bandanas',
          email: EMAIL,
          telephone: `+1-${PHONE_DISPLAY}`,
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: EMAIL,
            telephone: `+1-${PHONE_DISPLAY}`,
            areaServed: 'US',
          },
        },
      },
    },
  ];
};

export default function Contact() {
  return (
    <div className="bg-paper">
      <ContactHero />
      <Methods />
      <ContactHelp />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function ContactHero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="ui-container relative py-20 md:py-28">
        <span className="eyebrow text-brand-400">We&apos;re here to help</span>
        <h1 className="mt-4 max-w-3xl text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl">
          Get in <span className="text-brand-400">touch.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          Questions about an order, artwork, or a bulk quote? Reach our team
          directly — real people from Wholesale For Everyone, ready to help you
          get your design printed right.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`mailto:${EMAIL}`} className="btn btn-brand">
            Email us
          </a>
          <a href={PHONE_HREF} className="btn btn-ghost">
            Call {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}

function Methods() {
  // Shared functional-icon spec — matches FeatureBadges exactly (stroke 1.7, no
  // fill, h-6 w-6) so these cards read as the same system.
  const sw = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-6 w-6',
    'aria-hidden': true,
  };
  const methods = [
    {
      t: 'Email us',
      d: 'Best for order details, artwork files, and quotes — we reply as fast as we can.',
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      icon: (
        <svg {...sw}>
          <path d="M3 7l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
        </svg>
      ),
    },
    {
      t: 'Call us',
      d: 'Toll-free — talk through sizes, quantities, and wholesale pricing.',
      value: PHONE_DISPLAY,
      href: PHONE_HREF,
      icon: (
        <svg {...sw}>
          <path d="M4 4h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 2 6a2 2 0 0 1 2-2z" />
        </svg>
      ),
    },
    {
      t: 'Write or visit',
      d: `Mailing: ${MAILING}. Location: ${LOCATION}.`,
      value: 'Hainesport, New Jersey',
      href: null,
      icon: (
        <svg {...sw}>
          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      ),
    },
  ];
  return (
    <section className="bg-paper">
      <div className="ui-container py-16 md:py-24">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow text-brand-700">Reach us directly</span>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
            Ways to get in touch
          </h2>
        </div>
        {/* Framed grid with hairline dividers + index numbers — the same card
            language as FeatureBadges (home / PDP), applied for consistency. */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-black/10 ring-1 ring-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m, i) => (
            <div
              key={m.t}
              className="group relative flex flex-col gap-5 bg-paper p-7 transition-colors duration-200 hover:bg-mint md:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-ink ring-1 ring-black/5 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                {m.icon}
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">{m.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {m.d}
                </p>
                {m.href ? (
                  <a
                    href={m.href}
                    className="mt-3 inline-block break-words text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                  >
                    {m.value}
                  </a>
                ) : (
                  <span className="mt-3 inline-block text-sm font-semibold text-ink">
                    {m.value}
                  </span>
                )}
              </div>
              <span className="pointer-events-none absolute right-6 top-6 text-xs font-semibold tabular-nums text-black/15">
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactHelp() {
  const links = [
    {label: 'Track my order', to: '/account/orders'},
    {label: 'Shipping & returns', to: '/pages/refund-returns'},
    {label: 'Bulk & wholesale pricing', to: '/bandana-calculator'},
    {label: 'Start a design', to: '/collections/made-to-order-collections'},
  ];
  return (
    <section className="bg-mint">
      <div className="ui-container py-16 md:py-24">
        <div className="grid gap-10 rounded-3xl bg-brand-700 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <span className="eyebrow text-brand-400">Before you write</span>
            <h2 className="mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
              Quick answers
            </h2>
            <p className="mt-4 text-white/80">
              Many questions are covered here — check these first, then reach out
              if you still need a hand.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 md:content-center">
            {links.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  prefetch="intent"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/20"
                >
                  {l.label}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
