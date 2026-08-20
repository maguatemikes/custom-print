import {useEffect, useState} from 'react';
import {MIN_QTY} from '~/lib/customPrintData';
import {Field} from './primitives';
import {TierTable} from './TierTable';

export function QuantityStep({
  qty,
  setQty,
  currencyCode,
  shape,
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
  shape: string;
  email: string;
  setEmail: (v: string) => void;
  deliveryAck: boolean;
  setDeliveryAck: (v: boolean) => void;
  terms: boolean;
  setTerms: (v: boolean) => void;
}) {
  // Local text mirror so the field can be cleared / typed freely (e.g. clear
  // then type "18"). The parent `qty` only ever holds a valid integer ≥ MIN_QTY;
  // we update it live when the typed value is valid and clamp on blur. Kept in
  // sync when qty changes elsewhere (e.g. picking a tier row).
  const [qtyInput, setQtyInput] = useState(String(qty));
  useEffect(() => {
    setQtyInput(String(qty));
  }, [qty]);
  const belowMin = qtyInput !== '' && Number(qtyInput) < MIN_QTY;

  return (
    <div>
      <Field
        n={1}
        title="Quantity"
        hint={`Buy more, save more — minimum order ${MIN_QTY} pieces; the more you order, the lower the unit price.`}
      >
        <TierTable
          qty={qty}
          setQty={setQty}
          currencyCode={currencyCode}
          shape={shape}
        />
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
              // Only push a VALID integer up to the parent; below-min/blank
              // stays local so the parent qty (price + cart) is never invalid.
              if (Number.isFinite(n) && n >= MIN_QTY) setQty(n);
            }}
            onBlur={() => {
              const n = Math.floor(Number(qtyInput));
              const clamped =
                Number.isFinite(n) && n >= MIN_QTY ? n : MIN_QTY;
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
        hint="We'll send your quote and design-intake link here."
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email"
          className="h-11 w-full rounded-xl border border-black/15 px-4 text-sm focus:border-brand-500 focus:outline-none"
        />
      </Field>

      <div className="rounded-2xl border border-black/10 bg-mint/60 p-5">
        {/* Info — the context */}
        <h3 className="eyebrow text-brand-700">Delivery time</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Standard production &amp; delivery is roughly 20–30 business days after
          your design is approved. Rush options may be available — ask our team.
        </p>

        {/* Separate the context from the actions */}
        <div className="my-4 border-t border-black/10" />

        {/* Acknowledgments — the actions, grouped and evenly spaced */}
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
  );
}
