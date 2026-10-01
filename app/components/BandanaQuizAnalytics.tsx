import {useEffect, useRef} from 'react';
import {pushDataLayer} from '~/lib/dataLayer';
import {unitPriceFor} from '~/lib/customPrintData';

/**
 * GTM instrumentation for the Bandana Quiz — fully isolated.
 *
 * Renders NOTHING and only *reads* the quiz's state through props, pushing to
 * the GTM `dataLayer` from an effect. It owns zero quiz logic: the quiz's
 * steps, validation, and FunnelKit webhook submission are untouched — mounting
 * or removing this component changes only what is tracked.
 *
 * Events:
 *  - `quiz_start`    once, when the shopper leaves the intro (step 0 → first Q)
 *  - `quiz_step`     each question advance/return
 *  - `generate_lead` once, on the email-step → result transition. That hop is
 *                    only reachable through `submitEmail()`, which fires the
 *                    quote webhook — so it is an exact, observational proxy for
 *                    "a quote lead was submitted" (the Google Ads conversion).
 *
 * No PII (email / name / phone) is ever put in the dataLayer — the server
 * action already forwards those to FunnelKit. Only quiz answers + an estimated
 * value ride along.
 */

export type BandanaQuizAnalyticsProps = {
  step: number;
  /** The email-capture step index (last question before the result). */
  emailStep: number;
  /** The result/quote step index. */
  resultStep: number;
  /** 1-based position within the question sequence, and its length. */
  qPos: number;
  qTotal: number;
  // answers / config
  useCase: string;
  useCaseOther: string;
  shape: string;
  size: string;
  qty: number;
  print: string;
  intent: string;
  layout: string;
  color: string;
  eventDate: string;
  currencyCode?: string;
};

export function BandanaQuizAnalytics(props: BandanaQuizAnalyticsProps) {
  const {
    step,
    emailStep,
    resultStep,
    qPos,
    qTotal,
    useCase,
    useCaseOther,
    shape,
    size,
    qty,
    print,
    intent,
    layout,
    color,
    eventDate,
    currencyCode = 'USD',
  } = props;

  const answers = {
    use_case: useCase === 'other' ? useCaseOther || 'other' : useCase,
    shape,
    size,
    print,
    intent,
    design_layout: layout,
    base_color: color ? color.toUpperCase() : undefined,
    quantity: qty,
    event_date: eventDate || undefined,
  };

  // Estimated quote value (same tiered pricing the quote email uses), for
  // value-based bidding on the lead conversion.
  const value = Math.round(unitPriceFor(qty, size, shape) * qty * 100) / 100;

  const mounted = useRef(false);
  const prevStep = useRef(step);
  const started = useRef(false);
  const leadFired = useRef(false);

  useEffect(() => {
    const prev = prevStep.current;
    prevStep.current = step;

    // Skip the initial mount — nothing has transitioned yet.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (prev === step) return;

    // Quiz started — shopper left the intro for the first question.
    if (prev === 0 && step !== 0 && !started.current) {
      started.current = true;
      pushDataLayer('quiz_start', {...answers});
    }

    // Lead submitted — the email step → result hop (only via submitEmail()).
    if (prev === emailStep && step === resultStep && !leadFired.current) {
      leadFired.current = true;
      pushDataLayer('generate_lead', {
        lead_type: 'quiz_quote',
        value,
        currency: currencyCode,
        ...answers,
      });
      return; // the conversion hop isn't also a generic step
    }

    // Any other navigation = a question step.
    pushDataLayer('quiz_step', {
      step_index: step,
      question_position: qPos,
      question_total: qTotal,
      ...answers,
    });
    // Only the step number drives this; other values are read live from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return null;
}
