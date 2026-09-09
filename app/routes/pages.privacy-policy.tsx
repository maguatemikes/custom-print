import {Link} from 'react-router';
import type {Route} from './+types/pages.privacy-policy';
import {siteOrigin} from '~/lib/seo';

/**
 * Privacy Policy — a designed, static policy page (not a Shopify CMS page).
 * Lives at /pages/privacy-policy, taking precedence over pages.$handle.
 *
 * Adapted from Wholesale For Everyone's privacy policy for THIS store: the same
 * substance, re-pointed to Custom Bandanas / custombandanas.shop, noting the
 * uploaded artwork/design files custom orders collect and the Shopify-hosted
 * checkout. Not legal advice — the business owner should review before relying
 * on it. Keep the "Last updated" date in sync when the text changes.
 */
const EMAIL = 'info@wholesaleforeveryone.com';
const PHONE_DISPLAY = '800-355-1131';
const PHONE_HREF = 'tel:+18003551131';
const ADDRESS = '2402 Sylon Blvd, Hainesport, NJ 08036';
const LAST_UPDATED = 'September 9, 2026';

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Privacy Policy — Custom Bandanas';
  const description =
    'How Custom Bandanas (by Wholesale For Everyone) collects, uses, shares, and protects your information when you shop, design a custom order, or contact us at custombandanas.shop.';
  const url = `${siteOrigin(matches)}/pages/privacy-policy`;
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
        '@type': 'WebPage',
        name: title,
        description,
        url,
        publisher: {'@type': 'Organization', name: 'Custom Bandanas'},
      },
    },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div className="bg-paper">
      <PrivacyHero />
      <PrivacyBody />
      <PrivacyCta />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function PrivacyHero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="ui-container relative py-20 md:py-28">
        <span className="eyebrow text-brand-400">Your privacy</span>
        <h1 className="mt-4 max-w-3xl text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl">
          Privacy <span className="text-brand-400">policy.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Custom Bandanas (custombandanas.shop) is operated by Wholesale For
          Everyone. This policy explains what we collect when you visit, design a
          custom order, or buy — how we use it, who we share it with, and the
          choices you have.
        </p>
        <p className="mt-4 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>
      </div>
    </section>
  );
}

function PrivacyBody() {
  return (
    <section className="bg-paper">
      <div className="ui-container grid gap-12 py-16 md:grid-cols-[1fr_2fr] md:py-24">
        {/* Sticky section nav */}
        <nav className="md:sticky md:top-28 md:self-start" aria-label="On this page">
          <span className="eyebrow text-brand-700">On this page</span>
          <ul className="mt-4 space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-muted transition-colors hover:text-ink"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl space-y-12">
          <Block id="collect" title="Information we collect">
            <p>
              We collect information you provide directly — your name, billing
              and shipping address, email address, phone number, and order
              details — when you create an account, place an order, sign up for
              our emails, or contact customer support. Payment card details are
              entered directly with our payment processors and are not stored on
              our servers.
            </p>
            <p>
              When you design a product or place a custom order, we also collect
              the <strong className="text-ink">artwork, images, and design
              files you upload</strong>, along with the design details (shape,
              size, colors, and layout) we need to proof and produce your order.
            </p>
            <p>
              We also collect information automatically as you browse — your IP
              address, browser type, device information, pages viewed, referring
              URLs, and the dates and times of your visits — through cookies and
              similar technologies described below.
            </p>
          </Block>

          <Block id="cookies" title="Cookies and tracking technologies">
            <p>
              We use cookies, pixels, and similar technologies to keep items in
              your cart, remember your preferences, understand how the site is
              used, and deliver relevant marketing. You can control or disable
              cookies through your browser settings, though some features of the
              site may not work properly if you do.
            </p>
          </Block>

          <Block id="use" title="How we use your information">
            <p>
              We use your information to process and ship your orders, proof and
              produce your custom designs, provide customer support, manage your
              account, send order and shipping notifications, send marketing
              emails where you have opted in, prevent fraud and secure the site,
              improve our products and services, and comply with our legal
              obligations.
            </p>
          </Block>

          <Block id="share" title="How we share your information">
            <p>
              <strong className="text-ink">We do not sell your personal
              information.</strong> We share it only with service providers who
              help us operate our business, and only as needed to perform their
              services:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-brand-500">
              <li>
                Our commerce platform and payment processors (such as Shopify,
                which hosts our checkout, and PayPal) to run the store and
                process transactions.
              </li>
              <li>
                Shipping and fulfillment partners and carriers (such as UPS and
                the U.S. Postal Service) to deliver your orders.
              </li>
              <li>
                Email and marketing platforms to send communications you have
                requested.
              </li>
              <li>
                Analytics and advertising providers (such as Google and Meta) to
                understand and improve site performance.
              </li>
            </ul>
            <p>
              We may also disclose information when required by law, to enforce
              our terms, or to protect the rights, property, or safety of our
              customers or business.
            </p>
          </Block>

          <Block id="retention" title="Data retention">
            <p>
              We keep your personal information for as long as your account is
              active or as needed to provide services, comply with our legal
              obligations, resolve disputes, and enforce our agreements. When it
              is no longer needed, we securely delete or anonymize it.
            </p>
          </Block>

          <Block id="rights" title="Your rights and choices">
            <p>
              You may access, update, or correct your account information at any
              time by logging into your account or contacting us. You can
              unsubscribe from marketing emails using the link in any message.
              Depending on where you live, you may have additional rights to
              request access to, correction of, or deletion of your personal
              information, and to opt out of certain sharing. To exercise these
              rights, contact us using the details below and we will respond as
              required by applicable law.
            </p>
          </Block>

          <Block id="security" title="Data security">
            <p>
              We use administrative, technical, and physical safeguards to
              protect your information, including encryption of data in transit
              at checkout. No method of transmission or storage is completely
              secure, so we cannot guarantee absolute security, but we work to
              protect your information and to promptly address any issues.
            </p>
          </Block>

          <Block id="children" title="Children's privacy">
            <p>
              The site is intended for business and general consumer use and is
              not directed to children under 13. We do not knowingly collect
              personal information from children under 13. If you believe a child
              has provided us with information, please contact us and we will
              delete it.
            </p>
          </Block>

          <Block id="third-party" title="Third-party links">
            <p>
              The site may contain links to third-party websites and services
              that we do not control. This Privacy Policy does not apply to those
              sites, and we encourage you to review their privacy policies before
              providing any information.
            </p>
          </Block>

          <Block id="changes" title="Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we
              will revise the &ldquo;Last updated&rdquo; date above. Material
              changes will be posted on this page, and your continued use of the
              site after changes take effect means you accept the updated policy.
            </p>
          </Block>

          <Block id="contact" title="Contact us">
            <p>
              Questions about this Privacy Policy or how we handle your
              information? Contact us:
            </p>
            <address className="not-italic leading-relaxed text-muted">
              <span className="font-semibold text-ink">Wholesale For Everyone</span>
              <br />
              {ADDRESS}
              <br />
              Phone:{' '}
              <a
                href={PHONE_HREF}
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {PHONE_DISPLAY}
              </a>
              <br />
              Email:{' '}
              <a
                href={`mailto:${EMAIL}`}
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {EMAIL}
              </a>
            </address>
          </Block>
        </div>
      </div>
    </section>
  );
}

function Block({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-muted">{children}</div>
    </div>
  );
}

const SECTIONS = [
  {id: 'collect', title: 'Information we collect'},
  {id: 'cookies', title: 'Cookies & tracking'},
  {id: 'use', title: 'How we use it'},
  {id: 'share', title: 'How we share it'},
  {id: 'retention', title: 'Data retention'},
  {id: 'rights', title: 'Your rights & choices'},
  {id: 'security', title: 'Data security'},
  {id: 'children', title: "Children's privacy"},
  {id: 'third-party', title: 'Third-party links'},
  {id: 'changes', title: 'Changes to this policy'},
  {id: 'contact', title: 'Contact us'},
];

function PrivacyCta() {
  return (
    <section className="bg-mint">
      <div className="ui-container flex flex-col items-center gap-6 py-16 text-center md:py-24">
        <span className="eyebrow text-brand-700">Questions?</span>
        <h2 className="max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-5xl">
          We&apos;re happy to help
        </h2>
        <p className="max-w-xl text-muted">
          Reach our team about your data, your account, or anything else — real
          people, ready to help.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/pages/contact" className="btn btn-dark">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
