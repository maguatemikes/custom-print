import {useEffect, useRef, useState} from 'react';

// The native EyeDropper API (Chromium only) isn't in TS's DOM lib yet.
declare global {
  interface Window {
    EyeDropper?: new () => {open: () => Promise<{sRGBHex: string}>};
  }
}

/* --- colour maths for the full-spectrum picker --- */
export function hsvToRgb(
  h: number,
  s: number,
  v: number,
): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Normalize a pasted/typed hex to a full `#rrggbb`, or null if it isn't one.
 * Accepts 3- or 6-digit, with or without the leading `#` (e.g. `0f0`, `#1E90FF`).
 * Used for the paste/blur commit so shorthand hex applies too.
 */
export function normalizeHex(raw: string): string | null {
  const t = raw.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(t)) {
    return `#${t
      .split('')
      .map((c) => c + c)
      .join('')}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t}`.toLowerCase();
  return null;
}

export function rgbToHsv([r, g, b]: [
  number,
  number,
  number,
]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

type Model = 'hex' | 'rgb' | 'cmyk' | 'pantone';

/**
 * Full-spectrum colour picker — a full-width saturation/value field with a
 * vertical hue slider beside it, and a segmented Hex / RGB / CMYK / Pantone
 * input row (with an inline eyedropper) below; CMYK + Pantone are coming soon.
 * No alpha: the base colour is opaque fabric.
 * Styled to the design system (no native popup); reports up via onChange(hex).
 * Self-contained: owns its own h/s/v state.
 *
 * Shared by the PDP "Personalize me" flow and the custom-print wizard
 * so both use an identical control.
 */
export function ColorSpectrum({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const init = rgbToHsv(hexToRgb(value) ?? [226, 59, 59]);
  const [h, setH] = useState(init[0]);
  const [s, setS] = useState(init[1]);
  const [v, setV] = useState(init[2]);
  const [model, setModel] = useState<Model>('hex');
  const [hexText, setHexText] = useState(value);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Native eyedropper (Chromium only) — detected after mount so SSR and the
  // first client render agree (window is absent on the server).
  const [eyeSupported, setEyeSupported] = useState(false);
  useEffect(() => {
    setEyeSupported(typeof window !== 'undefined' && 'EyeDropper' in window);
  }, []);

  const hex = rgbToHex(hsvToRgb(h, s, v));
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb;

  // Report the chosen colour upward and keep the hex box in sync as the
  // field / slider move. (Runs on hex change only.)
  useEffect(() => {
    onChange(hex);
    setHexText(hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  // The single apply-colour path every input funnels through.
  const applyRgb = ([nr, ng, nb]: [number, number, number]) => {
    const [nh, ns, nv] = rgbToHsv([nr, ng, nb]);
    setH(nh);
    setS(ns);
    setV(nv);
  };
  const applyHex = (hx: string) => {
    const parsed = hexToRgb(hx);
    if (parsed) applyRgb(parsed);
  };

  const dragSV = (clientX: number, clientY: number) => {
    const rect = svRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    setS(rect.width ? x / rect.width : 0);
    setV(rect.height ? 1 - y / rect.height : 0);
  };
  // Vertical hue: drag on the Y axis (top = red 0°, bottom = red 360°).
  const dragHue = (clientY: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    setH(rect.height ? (y / rect.height) * 360 : 0);
  };

  const startDrag =
    (fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
      e.preventDefault();
      fn(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => fn(ev.clientX, ev.clientY);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  const pickWithEyeDropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const {sRGBHex} = await new window.EyeDropper().open();
      applyHex(sRGBHex);
    } catch {
      /* user cancelled (AbortError) — leave the colour unchanged */
    }
  };

  // Compact labelled number box (R / G / B) for the numeric models.
  const NumBox = ({
    label,
    value: val,
    max,
    onCommit,
    suffix,
  }: {
    label: string;
    value: number;
    max: number;
    onCommit: (n: number) => void;
    suffix?: string;
  }) => (
    <label className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-[#f5f5f5] px-2.5 transition focus-within:ring-2 focus-within:ring-brand-500/30">
      <span className="shrink-0 text-xs font-semibold leading-none text-muted">
        {label}
      </span>
      <input
        value={Math.round(val)}
        inputMode="numeric"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d]/g, ''));
          if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(0, n)));
        }}
        aria-label={label}
        className="m-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-sm leading-none tabular-nums text-ink focus:outline-none focus:ring-0"
      />
      {suffix ? (
        <span className="shrink-0 text-xs leading-none text-muted">{suffix}</span>
      ) : null}
    </label>
  );

  const tabBtn = (m: Model) => (
    <button
      key={m}
      type="button"
      aria-pressed={model === m}
      onClick={() => setModel(m)}
      className={`h-8 rounded-lg text-xs font-bold uppercase tracking-wide transition ${
        model === m
          ? 'bg-white text-ink shadow-sm'
          : 'text-muted hover:text-ink'
      }`}
    >
      {m}
    </button>
  );

  return (
    <div className="w-full">
      {/* Saturation/value field + vertical hue slider */}
      <div className="flex gap-3">
        <div
          ref={svRef}
          onPointerDown={startDrag(dragSV)}
          className="relative h-56 min-w-0 flex-1 cursor-crosshair touch-none rounded-xl"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${h}, 100%, 50%)`,
          }}
        >
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex}}
          />
        </div>

        <div
          ref={hueRef}
          onPointerDown={startDrag((x, y) => dragHue(y))}
          className="relative w-5 shrink-0 cursor-pointer touch-none rounded-full"
          style={{
            background:
              'linear-gradient(to bottom, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          }}
        >
          {/* Handle insets by its own height so it stays inside the track. */}
          <span
            className="pointer-events-none absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              top: `calc((100% - 20px) * ${h / 360})`,
              background: `hsl(${h}, 100%, 50%)`,
            }}
          />
        </div>
      </div>

      {/* Model tabs — CMYK + Pantone are clickable but open a "coming soon"
          panel below (matching not built yet). */}
      <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-black/[0.05] p-1">
        {(['hex', 'rgb', 'cmyk', 'pantone'] as const).map(tabBtn)}
      </div>

      {/* Eyedropper + inputs for the selected model */}
      <div className="mt-2 flex items-center gap-2">
        {eyeSupported ? (
          <button
            type="button"
            onClick={pickWithEyeDropper}
            aria-label="Pick a colour from the screen"
            title="Eyedropper — pick a colour from the screen"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f5f5f5] text-ink transition hover:bg-black/[0.06]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m2 22 1-1h3l9-9" />
              <path d="M3 21v-3l9-9" />
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
            </svg>
          </button>
        ) : null}

        {model === 'hex' ? (
          <input
            value={hexText}
            onChange={(e) => {
              const t = e.target.value;
              setHexText(t);
              applyHex(t);
            }}
            onPaste={(e) => {
              // Apply a pasted hex directly — including 3-digit shorthand
              // (#0f0) that onChange's 6-digit parse would miss.
              const norm = normalizeHex(e.clipboardData.getData('text'));
              if (norm) {
                e.preventDefault();
                setHexText(norm);
                applyHex(norm);
              }
            }}
            onBlur={() => {
              // Commit shorthand / stray input on blur; revert to the current
              // colour if what's left in the box isn't a valid hex.
              const norm = normalizeHex(hexText);
              if (norm) {
                setHexText(norm);
                applyHex(norm);
              } else {
                setHexText(hex);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label="Hex colour value"
            spellCheck={false}
            className="m-0 h-9 min-w-0 flex-1 rounded-lg bg-[#f5f5f5] px-3 text-sm uppercase text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        ) : model === 'rgb' ? (
          <div className="flex min-w-0 flex-1 gap-1.5">
            <NumBox label="R" value={r} max={255} onCommit={(n) => applyRgb([n, g, b])} />
            <NumBox label="G" value={g} max={255} onCommit={(n) => applyRgb([r, n, b])} />
            <NumBox label="B" value={b} max={255} onCommit={(n) => applyRgb([r, g, n])} />
          </div>
        ) : (
          <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#f5f5f5] text-xs font-semibold text-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {model === 'cmyk' ? 'CMYK' : 'Pantone'} matching — coming soon
          </div>
        )}
      </div>
    </div>
  );
}
