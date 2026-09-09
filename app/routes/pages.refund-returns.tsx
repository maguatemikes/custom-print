import {Link} from 'react-router';
import type {Route} from './+types/pages.refund-returns';
import {siteOrigin} from '~/lib/seo';

/**
 * Refund & Returns — a designed, static policy page (not a Shopify CMS page).
 * Lives at /pages/refund-returns, taking precedence over pages.$handle.
 *
 * Adapted from Wholesale For Everyone's returns policy for THIS store: every
 * product here is custom-printed and made to order, so the returns section is
 * rewritten for personalized goods — non-returnable for change-of-mind, but
 * fully guaranteed against our errors, defects, and shipping damage, with the
 * proof-approval step as the safeguard. Shipping terms, guarantees, and contact
 * details are kept from WFE. Not legal advice — business owner should review.
 */
const EMAIL = 'info@wholesaleforeveryone.com';
const PHONE_DISPLAY = '800-355-1131';
const PHONE_HREF = 'tel:+18003551131';

export const meta: Route.MetaFunction = ({matches}) => {
  const title = 'Refund & Returns Policy — Custom Bandanas';
  const description =
    'How refunds, returns, and exchanges work for custom-printed, made-to-order bandanas and merch. Every order is proofed before printing and fully guaranteed against defects, production errors, and shipping damage.';
  const url = `${siteOrigin(matches)}/pages/refund-returns`;
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

export default function RefundReturns() {
  return (
    <div className="bg-paper">
      <PolicyHero />
      <PolicyBody />
      <PolicyCta />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function PolicyHero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl"
        aria-hidden="true"
      />
      <div className="ui-container relative py-20 md:py-28">
        <span className="eyebrow text-brand-400">Our promise to you</span>
        <h1 className="mt-4 max-w-3xl text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl">
          Refund &amp; <span className="text-brand-400">returns.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Everything we make is custom-printed and made to order, so we do things
          a little differently: you approve a proof before we print, and your
          order is fully guaranteed against defects, our production errors, and
          shipping damage.
        </p>
      </div>
    </section>
  );
}

function PolicyBody() {
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
          {/* Made-to-order guarantee */}
          <Block id="guarantee" title="Custom &amp; made to order">
            <p>
              Every bandana and every piece of merch is printed specifically for
              your order — there is no pre-made stock. Because each item is
              personalized, custom orders <strong className="text-ink">cannot
              be returned or refunded for a change of mind</strong>, an ordering
              mistake (wrong size, color, or quantity), or artwork you supplied
              and approved.
            </p>
            <p>
              That is exactly why we send a{' '}
              <strong className="text-ink">digital proof before we print</strong>
              . Nothing goes on fabric until you review and approve it, so you
              can catch anything before production starts. Please check your
              proof carefully — sizes, spelling, colors, and layout.
            </p>
          </Block>

          {/* What we guarantee */}
          <Block id="quality" title="Our quality guarantee">
            <p>
              We stand behind our work 100%. If your order arrives with a{' '}
              <strong className="text-ink">factory defect</strong>, a{' '}
              <strong className="text-ink">production or printing error on our
              part</strong>, or was <strong className="text-ink">damaged in
              shipping</strong>, we will refund, reprint, or replace it at no
              cost to you.
            </p>
            <p>
              We also guarantee our blanks: our 68×68 thread-count bandanas are
              softer and heavier than the thinner 63×54 count many competitors
              sell, backed by a money-back quality guarantee.
            </p>
          </Block>

          {/* How to report an issue */}
          <Block id="report" title="Report a problem with your order">
            <p>
              If something is wrong, contact us{' '}
              <strong className="text-ink">within 7 days of delivery</strong> so
              we can make it right quickly. Email{' '}
              <a
                href={`mailto:${EMAIL}`}
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {EMAIL}
              </a>{' '}
              or call{' '}
              <a
                href={PHONE_HREF}
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {PHONE_DISPLAY}
              </a>{' '}
              and include your <strong className="text-ink">name, phone
              number, order number</strong>, and a photo of the issue.
            </p>
            <p>
              When the return is due to our error, a defect, or shipping damage,
              we cover return shipping. For any other approved return, return
              shipping is the customer&apos;s responsibility, and original and
              return shipping costs are non-refundable. After{' '}
              <strong className="text-ink">30 days</strong>, no refunds can be
              given.
            </p>
          </Block>

          {/* Non-returnable */}
          <Block id="non-returnable" title="Non-returnable items">
            <ul className="list-disc space-y-2 pl-5 marker:text-brand-500">
              <li>
                Custom, personalized, or made-to-order items — except where the
                item is defective, damaged in shipping, or printed in error by
                us.
              </li>
              <li>Items that have been worn, washed, altered, or modified.</li>
              <li>Items damaged by customer misuse or neglect.</li>
              <li>Items not purchased from Custom Bandanas.</li>
              <li>Items reported more than 30 days after delivery.</li>
            </ul>
          </Block>

          {/* Shipping */}
          <Block id="shipping" title="Shipping information">
            <p>
              We ship within the United States and to most other countries, with{' '}
              <strong className="text-ink">UPS</strong> and{' '}
              <strong className="text-ink">USPS</strong> options — USPS is
              usually best on smaller orders, UPS on larger ones. You can compare
              live rates in your cart before checkout and choose during checkout.
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-brand-500">
              <li>
                All orders require{' '}
                <strong className="text-ink">1–3 business days</strong> of
                processing before shipment. We don&apos;t process orders on
                weekends or holidays, and same-day shipping isn&apos;t
                guaranteed.
              </li>
              <li>UPS does not deliver to P.O. Boxes.</li>
              <li>
                Military APO/FPO orders are welcome — choose USPS for shipping.
              </li>
              <li>
                <strong className="text-ink">Rush orders:</strong> additional
                shipping (and any applicable rush charges) apply, and standard
                processing time still applies. Contact us for Saturday delivery
                rates and options.
              </li>
              <li>
                <strong className="text-ink">International orders:</strong> you
                are responsible for all import duties, broker fees, bond fees,
                and taxes.
              </li>
            </ul>
          </Block>

          <p className="border-t border-black/10 pt-6 text-sm text-muted">
            Questions about this policy? Email{' '}
            <a
              href={`mailto:${EMAIL}`}
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {EMAIL}
            </a>{' '}
            or call {PHONE_DISPLAY}.
          </p>
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
  {id: 'guarantee', title: 'Custom & made to order'},
  {id: 'quality', title: 'Our quality guarantee'},
  {id: 'report', title: 'Report a problem'},
  {id: 'non-returnable', title: 'Non-returnable items'},
  {id: 'shipping', title: 'Shipping information'},
];

function PolicyCta() {
  return (
    <section className="bg-mint">
      <div className="ui-container flex flex-col items-center gap-6 py-16 text-center md:py-24">
        <span className="eyebrow text-brand-700">Still need a hand?</span>
        <h2 className="max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-5xl">
          We&apos;re here to help
        </h2>
        <p className="max-w-xl text-muted">
          Reach our team about an order, a proof, or a return — real people,
          ready to sort it out.
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
