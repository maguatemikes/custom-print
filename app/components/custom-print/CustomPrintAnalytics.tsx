import {useEffect, useRef} from 'react';
import {pushDataLayer} from '~/lib/dataLayer';

/**
 * GTM instrumentation for the custom-print editor — fully isolated.
 *
 * This component renders NOTHING and only *reads* the wizard's state through
 * props, pushing to the GTM `dataLayer` from `useEffect`s. It deliberately owns
 * zero wizard logic: the wizard's handlers, state, cart, and checkout are
 * untouched — mounting or removing this component changes only what is tracked,
 * never how the editor behaves.
 *
 * Events emitted (custom-print specific; standard `cart_updated` is already
 * emitted natively by Hydrogen's CartForm when the shopper adds to cart):
 *  - `view_item`                  once on mount — the custom product is "viewed"
 *  - `custom_print_step`          each time the shopper advances/returns a step
 *  - `custom_print_configure`     when a core option changes (size/material/…)
 *  - `custom_print_design`        when artwork is attached (per side)
 */

const STEP_NAMES = ['Bandana', 'Design', 'Quantity', 'Quote'] as const;

export type CustomPrintAnalyticsProps = {
  // identity / product
  shape: string;
  slug: string;
  productTitle: string;
  productHandle: string;
  variantId: string | null;
  currencyCode: string;
  // configuration
  step: number;
  size: string;
  material: string;
  baseHex: string;
  printSides: 'blank' | 'one' | 'two';
  printLabel: string;
  patternLabel: string;
  intentLabel: string;
  qty: number;
  unit: number;
  total: number;
  // design (front + optional back)
  designStatus: 'idle' | 'pending' | 'ready' | 'error';
  logoName: string | null;
  logoType: string | null;
  logoSize: number | null;
  logoUrl: string | null;
  isTwoSided: boolean;
  backLogoUrl: string | null;
};

export function CustomPrintAnalytics(props: CustomPrintAnalyticsProps) {
  const {
    shape,
    slug,
    productTitle,
    productHandle,
    variantId,
    currencyCode,
    step,
    size,
    material,
    baseHex,
    printSides,
    printLabel,
    patternLabel,
    intentLabel,
    qty,
    unit,
    total,
    designStatus,
    logoName,
    logoType,
    logoSize,
    logoUrl,
    isTwoSided,
    backLogoUrl,
  } = props;

  // Snapshot of the full configuration, rebuilt each render. Shared by every
  // event so GTM/GA4 always sees the complete editor state at the moment fired.
  const config = {
    shape,
    slug,
    size,
    material,
    base_color: baseHex.toUpperCase(),
    print: printLabel,
    print_sides: printSides,
    design_layout: patternLabel,
    intent: intentLabel,
    quantity: qty,
    unit_price: Math.round(unit * 100) / 100,
    total_price: Math.round(total * 100) / 100,
    currency: currencyCode,
  };

  // --- view_item (once) ----------------------------------------------------
  // Mirrors the catalog PDP's native view_item shape (a `products` array) so
  // GTM variables map both the same way, then adds the custom-print config.
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    pushDataLayer('view_item', {
      products: [
        {
          id: productHandle,
          title: productTitle,
          price: String(unit),
          vendor: 'Custom Bandanas',
          variantId: variantId ?? undefined,
          variantTitle: size,
          quantity: qty,
        },
      ],
      custom_print: config,
    });
    // Fire exactly once on mount — later changes ride the events below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- custom_print_step ---------------------------------------------------
  const stepMounted = useRef(false);
  useEffect(() => {
    if (!stepMounted.current) {
      stepMounted.current = true;
      return; // skip the initial step (covered by view_item)
    }
    pushDataLayer('custom_print_step', {
      step_index: step,
      step_name: STEP_NAMES[step] ?? `Step ${step + 1}`,
      ...config,
    });
    // Only the step number drives this event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // --- custom_print_configure ---------------------------------------------
  // One event per meaningful option change, carrying the whole snapshot.
  const cfgMounted = useRef(false);
  useEffect(() => {
    if (!cfgMounted.current) {
      cfgMounted.current = true;
      return;
    }
    pushDataLayer('custom_print_configure', {...config});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, material, baseHex, printSides, patternLabel, intentLabel, qty]);

  // --- custom_print_design (per side) -------------------------------------
  // Fire when a hosted artwork URL first appears for a side (= upload done).
  // dataUrl/base64 is intentionally never sent — only safe file metadata.
  const frontSent = useRef(false);
  useEffect(() => {
    if (logoUrl && !frontSent.current) {
      frontSent.current = true;
      pushDataLayer('custom_print_design', {
        side: 'front',
        design_status: designStatus,
        file_name: logoName ?? undefined,
        file_type: logoType ?? undefined,
        file_size: logoSize ?? undefined,
        design_url: logoUrl,
        ...config,
      });
    }
    if (!logoUrl) frontSent.current = false; // allow re-fire if artwork is replaced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl, designStatus]);

  const backSent = useRef(false);
  useEffect(() => {
    if (isTwoSided && backLogoUrl && !backSent.current) {
      backSent.current = true;
      pushDataLayer('custom_print_design', {
        side: 'back',
        design_status: designStatus,
        design_url: backLogoUrl,
        ...config,
      });
    }
    if (!backLogoUrl) backSent.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backLogoUrl, isTwoSided, designStatus]);

  return null;
}
