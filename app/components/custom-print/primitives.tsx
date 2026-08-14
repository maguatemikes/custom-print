import type React from 'react';
import {STEPS} from '~/lib/customPrintData';

/* -------------------------------------------------------------------------- */
/* Small shared presentational primitives for the custom-print wizard.        */
/* Each is <30 lines and stateless — grouped here to keep imports tidy.       */
/* -------------------------------------------------------------------------- */

export function ProgressBar({step}: {step: number}) {
  // Endowed-progress head start: the fill reaches the NEXT circle, so step 1
  // already looks underway (stops on circle 2) — a nudge to finish.
  const reached = Math.min(step + 1, STEPS.length - 1);
  const pct = Math.round((reached / (STEPS.length - 1)) * 100);
  // Flip the bar from brand-blue to green once the track is full — a
  // completion/"almost done" cue that nudges the shopper to finish.
  const complete = pct >= 100;
  // Whole progress is green (fill + completed circles) — inline so nothing (stale
  // dev CSS or Tailwind) can override it. The % label deepens to green-600 at 100%.
  const barColor = '#22c55e';
  return (
    <div
      className="mt-5"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Design progress"
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-ink">
          Step {step + 1} of {STEPS.length} ·{' '}
          <span className="text-muted">{STEPS[step]}</span>
        </span>
        <span
          className={complete ? '' : 'text-muted'}
          style={complete ? {color: '#16a34a'} : undefined}
        >
          {pct}%
        </span>
      </div>

      {/* Continuous filled track with step circles on top */}
      <div className="relative flex items-center justify-between">
        <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-mint" />
        <span
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full transition-[width] duration-300"
          style={{width: `${pct}%`, backgroundColor: barColor}}
        />
        {STEPS.map((label, i) => {
          const passed = i <= reached;
          return (
            <span
              key={label}
              className={`relative z-10 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ring-2 ring-paper ${
                passed ? 'text-white' : 'bg-mint text-muted'
              }`}
              style={passed ? {backgroundColor: barColor} : undefined}
            >
              {passed ? '✓' : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Numbered sub-field — mirrors the PDP "Personalize me" step element (ink number
 * badge + title + description line, content indented under it).
 */
export function Field({
  n,
  title,
  hint,
  children,
}: {
  n?: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        {n ? (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
            {n}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className={n ? 'pl-7' : ''}>{children}</div>
    </div>
  );
}

export function OptionCard({
  selected,
  onClick,
  children,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-black/10 bg-black/[0.04] text-muted'
          : selected
            ? 'border-ink bg-ink text-white'
            : 'border-black/15 bg-white text-ink hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Labelled range control with − / + nudge buttons flanking the slider — matches
 * the Rotate control's [button][slider][button] shape so Size, Column space, and
 * Row space read as one balanced set of editor controls.
 */
export function NudgeRow({
  label,
  value,
  min,
  max,
  step = 10,
  suffix = '%',
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const btn =
    'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-ink hover:border-ink';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink">
        <span>{label}</span>
        <span className="text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className={btn}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className="h-2 w-full accent-brand-600"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className={btn}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Shown in place of the Design step for a blank (solid-colour) bandana — there's
 * no artwork to configure, so we confirm the colour and let the shopper move
 * straight on to quantity.
 */
export function BlankDesignNotice({baseColor}: {baseColor: string}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-mint px-5 py-8 text-center">
      {/* Fabric-style colour swatch (a landscape chip, not a centered circle —
          a circle on a light card reads as a flag). */}
      <div className="mx-auto mb-4 inline-flex flex-col items-center">
        <span
          className="block h-16 w-24 rounded-xl shadow-sm ring-1 ring-inset ring-black/10"
          style={{backgroundColor: baseColor}}
          aria-hidden="true"
        />
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {baseColor.toUpperCase()}
        </span>
      </div>
      <p className="text-base font-bold text-ink">Solid colour — no printing</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        A plain, solid-colour bandana with no artwork to set up. Continue to
        choose your quantity.
      </p>
    </div>
  );
}
