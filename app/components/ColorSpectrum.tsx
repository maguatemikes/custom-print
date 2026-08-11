import {useEffect, useRef, useState} from 'react';

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
 * Parse a loosely-typed RGB string into [r,g,b]. Accepts "226, 59, 59",
 * "226,59,59", "226 59 59", or "rgb(226, 59, 59)" — any 3 numbers in 0–255.
 * Returns null if it can't (so partial typing doesn't fight the user).
 */
export function parseRgb(text: string): [number, number, number] | null {
  const nums = (text.match(/\d{1,3}/g) ?? []).map(Number);
  if (nums.length < 3) return null;
  const rgb = nums.slice(0, 3) as [number, number, number];
  return rgb.some((n) => n > 255) ? null : rgb;
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

/**
 * Full-spectrum colour picker — a saturation/value field + hue slider + hex
 * box, styled to the design system (no native popup). Drag the field or slider
 * (pointer events) or type a hex; reports the chosen colour up via
 * onChange(hex). Self-contained: owns its own h/s/v state.
 *
 * Shared by the PDP "Personalize me" flow and the /custom-print/design wizard
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
  const [hexText, setHexText] = useState(value);
  // RGB is editable too (pure conversion, no API): a user can paste their own
  // "r, g, b" and the spectrum jumps to it — the two-way twin of the hex box.
  const [rgbText, setRgbText] = useState(() => {
    const [ir, ig, ib] = hexToRgb(value) ?? [226, 59, 59];
    return `${ir}, ${ig}, ${ib}`;
  });
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const hex = rgbToHex(hsvToRgb(h, s, v));
  const [r, g, b] = hexToRgb(hex) ?? [0, 0, 0];

  // Report the chosen colour upward and keep the hex + rgb boxes in sync as the
  // field/slider move. (Runs on hex change only.)
  useEffect(() => {
    onChange(hex);
    setHexText(hex);
    setRgbText(`${r}, ${g}, ${b}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const dragSV = (clientX: number, clientY: number) => {
    const r = svRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    setS(r.width ? x / r.width : 0);
    setV(r.height ? 1 - y / r.height : 0);
  };
  const dragHue = (clientX: number) => {
    const r = hueRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    setH(r.width ? (x / r.width) * 360 : 0);
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

  return (
    <div className="flex max-w-md gap-3">
      {/* Spectrum: saturation/value field + hue slider */}
      <div className="min-w-0 flex-1">
        <div
          ref={svRef}
          onPointerDown={startDrag(dragSV)}
          className="relative h-40 w-full cursor-crosshair touch-none rounded-xl"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${h}, 100%, 50%)`,
          }}
        >
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              left: `${s * 100}%`,
              top: `${(1 - v) * 100}%`,
              background: hex,
            }}
          />
        </div>

        <div
          ref={hueRef}
          onPointerDown={startDrag((x) => dragHue(x))}
          className="relative mt-3 h-4 w-full cursor-pointer touch-none rounded-full"
          style={{
            background:
              'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              left: `${(h / 360) * 100}%`,
              background: `hsl(${h}, 100%, 50%)`,
            }}
          />
        </div>
      </div>

      {/* Preview swatch + labelled hex / rgb, beside the spectrum */}
      <div className="flex w-36 shrink-0 flex-col gap-2">
        <span
          className="h-16 w-full rounded-lg ring-1 ring-black/10"
          style={{background: hex}}
        />
        {/* HEX — editable, label beside */}
        <div className="flex items-center gap-1.5">
          <span className="w-7 shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
            Hex
          </span>
          <input
            value={hexText}
            onChange={(e) => {
              const t = e.target.value;
              setHexText(t);
              const rgb = hexToRgb(t);
              if (rgb) {
                const [nh, ns, nv] = rgbToHsv(rgb);
                setH(nh);
                setS(ns);
                setV(nv);
              }
            }}
            aria-label="Hex colour value"
            spellCheck={false}
            className="h-9 min-w-0 flex-1 rounded-lg border border-black/15 px-1 text-center text-xs uppercase focus:border-brand-500 focus:outline-none"
          />
        </div>
        {/* RGB — editable (paste your own "r, g, b"), label beside */}
        <div className="flex items-center gap-1.5">
          <span className="w-7 shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
            Rgb
          </span>
          <input
            value={rgbText}
            onChange={(e) => {
              const t = e.target.value;
              setRgbText(t);
              const rgb = parseRgb(t);
              if (rgb) {
                const [nh, ns, nv] = rgbToHsv(rgb);
                setH(nh);
                setS(ns);
                setV(nv);
              }
            }}
            aria-label="RGB colour value"
            spellCheck={false}
            inputMode="numeric"
            className="h-9 min-w-0 flex-1 rounded-lg border border-black/15 px-1 text-center text-[11px] tabular-nums focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
