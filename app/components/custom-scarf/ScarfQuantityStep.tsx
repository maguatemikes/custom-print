import {useEffect, useState} from 'react';
import {Field} from '~/components/custom-print/primitives';
import {MIN_QTY, EMAIL_RE, money} from '~/lib/customScarfData';
import type {Tier} from '~/lib/customPrintData';

/* -------------------------------------------------------------------------- */
/* ScarfQuantityStep — step 2 of the custom-scarf wizard.                      */
/* Priced off the SCARF tier ladder (area × finish × material), passed in as     */
/* `tiers` so this stays presentational.                                          */
/* -------------------------------------------------------------------------- */

export function ScarfQuantityStep({
  qty,
  setQty,
  currencyCode,
  tiers,
  email,
  setEmail,
  deliveryAck,
  setDeliveryAck,
  terms,
  setTerms,
}: {
  qty: number;
  setQty: (v: number) => void;
  currencyCode: string;
  tiers: Tier[];
  email: string;
  setEmail: (v: string) => void;
  deliveryAck: boolean;
  setDeliveryAck: (v: boolean) => void;
  terms: boolean;
  setTerms: (v: boolean) => void;
}) {
  const [qtyInput, setQtyInput] = useState(String(qty));
  useEffect(() => setQtyInput(String(qty)), [qty]);
  const belowMin = qtyInput !== '' && Number(qtyInput) < MIN_QTY;

  const [emailTouched, setEmailTouched] = useState(false);
  const emailError =
    !EMAIL_RE.test(email) && (emailTouched || deliveryAck || terms);

  const sellTiers = tiers.filter((t) => t.min >= MIN_QTY);
  const activeMin = tiers.find(
    (t) => qty >= t.min && (t.max === null || qty <= t.max),
  )?.min;

  return (
    <div>
      <Field
        n={1}
        title="Quantity"
        hint={`Buy more, save more — minimum order ${MIN_QTY} pieces.`}
      >
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mint/50 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-semibold">Quantity</th>
                <th className="px-4 py-2 text-right font-semibold">Per piece</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sellTiers.map((t) => {
                const active = t.min === activeMin;
                return (
                  <tr key={t.min} className={active ? 'bg-mint/60' : ''}>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setQty(Math.max(t.min, MIN_QTY))}
                        className={`font-medium ${active ? 'text-ink' : 'text-ink/80 hover:text-ink'}`}
                      >
                        {t.label}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-ink">
                      {money(t.each, currencyCode)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted">Or enter a quantity</span>
          <input
            type="number"
            min={MIN_QTY}
            step={1}
            value={qtyInput}
            onChange={(e) => {
              const v = e.target.value;
              setQtyInput(v);
              const n = Math.floor(Number(v));
              if (Number.isFinite(n) && n >= MIN_QTY) setQty(n);
            }}
            onBlur={() => {
              const n = Math.floor(Number(qtyInput));
              const clamped = Number.isFinite(n) && n >= MIN_QTY ? n : MIN_QTY;
              setQty(clamped);
              setQtyInput(String(clamped));
            }}
            aria-label="Custom quantity"
            className="h-11 w-24 rounded-xl border border-black/15 px-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <span className="text-sm text-muted">pcs</span>
        </div>
        {belowMin ? (
          <p className="mt-2 text-xs font-semibold text-red-600">
            Minimum order is {MIN_QTY} pieces — we&apos;ll set it to {MIN_QTY}.
          </p>
        ) : null}
      </Field>

      <Field
        n={2}
        title="Email for your quote"
        required
        hint="We'll send your quote and design-intake link here."
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="you@company.com"
          aria-label="Email"
          aria-required="true"
          aria-invalid={emailError}
          className={`h-11 w-full rounded-xl border px-4 text-sm focus:outline-none ${
            emailError
              ? 'border-red-500 focus:border-red-500'
              : 'border-black/15 focus:border-brand-500'
          }`}
        />
        {emailError ? (
          <p className="mt-1.5 text-xs font-semibold text-red-600">
            Enter a valid email address.
          </p>
        ) : null}
      </Field>

      <div className="pl-7">
        <div className="rounded-2xl border border-black/10 bg-mint/60 p-5">
          <h3 className="eyebrow text-brand-700">Delivery time</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Standard production &amp; delivery is roughly 20–30 business days
            after your design is approved. Rush options may be available — ask
            our team.
          </p>
          <div className="my-4 border-t border-black/10" />
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
              <input
                type="checkbox"
                checked={deliveryAck}
                onChange={(e) => setDeliveryAck(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-600"
              />
              <span>I understand and acknowledge the estimated delivery time.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-600"
              />
              <span>
                I agree to the Terms &amp; Conditions and understand custom orders
                are non-refundable once production begins.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
