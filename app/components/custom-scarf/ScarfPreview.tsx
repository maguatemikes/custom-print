import {useEffect, useId, useRef, useState} from 'react';
import type React from 'react';
import {FULL_PRINT_FILL} from '~/lib/customPrintData';
import {SCARF_REF_DIM} from '~/lib/customScarfData';

/* -------------------------------------------------------------------------- */
/* ScarfPreview — the live preview + proof surface for the custom-scarf wizard. */
/*                                                                            */
/* Draws the scarf as a correctly-PROPORTIONED rectangle in a SOLID base colour, */
/* clips the uploaded design to it, and runs a dashed STITCH line just inside the */
/* edge. The rectangle scales against the LARGEST catalogue dimension, so a 51×51  */
/* visibly renders bigger than an 18×18 — the size change is obvious. Square         */
/* corners (no border-radius). Renders in the shared 0..400 canvas space.           */
/* -------------------------------------------------------------------------- */

const CANVAS = 400;
const AVAIL = 360;

export function ScarfPreview({
  w,
  h,
  baseColor,
  logoPreview,
  logoRotate = 0,
  logoScale = 100,
  posX = 50,
  posY = 50,
  blank = false,
  compact = false,
  badge,
  proofLabel,
  finish = 'hem',
  showDims = false,
}: {
  w: number;
  h: number;
  baseColor: string;
  logoPreview: string | null;
  logoRotate?: number;
  logoScale?: number;
  posX?: number;
  posY?: number;
  blank?: boolean;
  compact?: boolean;
  badge?: React.ReactNode;
  proofLabel?: string;
  /** Edge finish — drives the stitch/edge rendering (hem | rolled | fringe). */
  finish?: string;
  /** Show technical inch dimension lines on the bottom + left edges. */
  showDims?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `scarf-clip-${uid}`;

  // Smoothly tween the drawn size when the shopper switches sizes. The LABELS
  // show the real target size immediately; only the drawing animates (respects
  // reduced-motion).
  const [dw, setDw] = useState(w);
  const [dh, setDh] = useState(h);
  const fromRef = useRef({w, h});
  useEffect(() => {
    fromRef.current = {w: dw, h: dh};
  });
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDw(w);
      setDh(h);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const dur = 300;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDw(from.w + (w - from.w) * e);
      setDh(from.h + (h - from.h) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);

  // Accurate scaling: the reference size (largest square) fills the frame, and
  // every size renders true-to-ratio from it (18×18 is exactly 18/51 of 51×51).
  // Sizes whose longest side exceeds the reference (shawls / long oblongs) are
  // clamped to fit the frame. Aspect ratio always preserved.
  // Leave a gutter for the dimension lines when they're shown. Geometry uses the
  // tweened dw/dh so the box animates; the dimension LABELS use the real w/h.
  const avail = showDims ? 318 : AVAIL;
  const perInch = avail / SCARF_REF_DIM;
  let rw = dw * perInch;
  let rh = dh * perInch;
  const longest = Math.max(rw, rh);
  if (longest > avail) {
    const k = avail / longest;
    rw *= k;
    rh *= k;
  }
  const rx0 = (CANVAS - rw) / 2;
  const ry0 = (CANVAS - rh) / 2;

  // Stitch inset (canvas px), scaled down a touch for tiny scarves.
  const inset = Math.max(4, Math.min(10, Math.min(rw, rh) * 0.06));

  // Design placement — scaled to the scarf's shorter side, panned by posX/posY.
  const fill = FULL_PRINT_FILL * (logoScale / 100);
  const imgDim = Math.min(rw, rh) * fill;
  const cx = rx0 + rw / 2 + ((posX - 50) / 100) * rw;
  const cy = ry0 + rh / 2 + ((posY - 50) / 100) * rh;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        className="h-full w-full"
        data-proof={proofLabel ?? undefined}
        role="img"
        aria-label="Custom scarf preview"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={rx0} y={ry0} width={rw} height={rh} />
          </clipPath>
        </defs>

        {/* Fabric fill (SOLID base colour), clipped to the scarf rectangle. */}
        <g clipPath={`url(#${clipId})`}>
          <rect x={rx0} y={ry0} width={rw} height={rh} fill={baseColor} />
          {!blank && logoPreview ? (
            <image
              href={logoPreview}
              x={cx - imgDim / 2}
              y={cy - imgDim / 2}
              width={imgDim}
              height={imgDim}
              transform={`rotate(${logoRotate} ${cx} ${cy})`}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : null}
        </g>

        {/* Edge line (square corners). */}
        <rect
          x={rx0}
          y={ry0}
          width={rw}
          height={rh}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={1.2}
        />

        {/* Edge finish treatment — DYNAMIC by `finish`. mix-blend-mode keeps it
            visible on any base colour. */}
        <EdgeFinish
          finish={finish}
          x={rx0}
          y={ry0}
          w={rw}
          h={rh}
          inset={inset}
        />

        {/* Technical inch dimension lines (height on the left, width on the
            bottom) — clean extension lines + arrows + inline label. */}
        {showDims ? (
          <DimLines x={rx0} y={ry0} w={rw} h={rh} wIn={w} hIn={h} />
        ) : null}
      </svg>

      {badge ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          {badge}
        </div>
      ) : null}
    </div>
  );
}

/** The edge treatment, chosen by the finish:
 *  - hem    → a dashed stitch line, inset from the edge
 *  - rolled → a fine double line hugging the edge (narrow rolled hem)
 *  - fringe → short perpendicular ticks all around the perimeter
 * All use mix-blend-mode so they stay visible on any base colour. */
function EdgeFinish({
  finish,
  x,
  y,
  w,
  h,
  inset,
}: {
  finish: string;
  x: number;
  y: number;
  w: number;
  h: number;
  inset: number;
}): React.ReactElement {
  const blend = {mixBlendMode: 'difference' as const};
  const white = '#ffffff';

  if (finish === 'fringe') {
    // A hairy fringed edge = dense, fine, wispy loose threads hanging OUTWARD
    // off every edge (no bound border line). Length + angle vary per strand
    // (deterministic, so no re-render jitter) for an uneven, hair-like look.
    const step = 3.2; // very dense
    const len = Math.max(7, Math.min(14, Math.min(w, h) * 0.15));
    const strands: Array<[number, number, number, number]> = [];
    // Deterministic pseudo-variation from the index.
    const vlen = (i: number) => len * (0.7 + 0.3 * ((Math.sin(i * 12.9898) + 1) / 2));
    const jit = (i: number) => (Math.sin(i * 78.233) * 2.2); // lateral drift at the tip
    let i = 0;
    for (let px = x + step / 2; px < x + w - 1; px += step, i++) {
      const l = vlen(i);
      const j = jit(i);
      strands.push([px, y, px + j, y - l]); // top
      strands.push([px, y + h, px + j, y + h + l]); // bottom
    }
    for (let py = y + step / 2; py < y + h - 1; py += step, i++) {
      const l = vlen(i);
      const j = jit(i);
      strands.push([x, py, x - l, py + j]); // left
      strands.push([x + w, py, x + w + l, py + j]); // right
    }
    return (
      <g stroke={white} strokeWidth={1} strokeLinecap="round" opacity={0.85} style={blend}>
        {strands.map((s, k) => (
          <line key={k} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
        ))}
      </g>
    );
  }

  if (finish === 'rolled') {
    // A rolled hem is whip-stitched: short SLANTED stitches running along the
    // folded edge. Render diagonal stitch marks just inside each side.
    const band = Math.max(3, Math.min(5, inset * 0.5));
    const step = 9; // keep the stitches close together
    const d = 1.6; // short slanted stitch — minimal line length
    const segs: Array<[number, number, number, number]> = [];
    for (let px = x + step; px < x + w - 2; px += step) {
      segs.push([px - d, y + band + d, px + d, y + band - d]); // top
      segs.push([px - d, y + h - band + d, px + d, y + h - band - d]); // bottom
    }
    for (let py = y + step; py < y + h - 2; py += step) {
      segs.push([x + band - d, py - d, x + band + d, py + d]); // left
      segs.push([x + w - band - d, py - d, x + w - band + d, py + d]); // right
    }
    return (
      <g
        stroke={white}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.6}
        style={blend}
      >
        {segs.map((s, i) => (
          <line key={i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
        ))}
      </g>
    );
  }

  // Default: hemmed edge — dashed stitch line.
  return (
    <rect
      x={x + inset}
      y={y + inset}
      width={Math.max(0, w - inset * 2)}
      height={Math.max(0, h - inset * 2)}
      fill="none"
      stroke={white}
      strokeWidth={1.4}
      strokeDasharray="6 4"
      style={blend}
    />
  );
}

/** Technical dimension lines: height on the left, width on the bottom — extension
 * lines + arrowheads + an inline inch label that breaks the dimension line. */
function DimLines({
  x,
  y,
  w,
  h,
  wIn,
  hIn,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  wIn: number;
  hIn: number;
}): React.ReactElement {
  const GUIDE = 'rgba(16,20,16,0.6)';
  const INK = '#101410';
  const off = 14; // distance of the dimension line from the edge
  const ah = 4.5; // arrowhead size
  const cxm = x + w / 2;
  const cym = y + h / 2;
  const Xd = x - off;
  const Yd = y + h + off;
  const wLabel = `${wIn}"`;
  const hLabel = `${hIn}"`;
  const gapH = wLabel.length * 6;
  const gapV = hLabel.length * 6;
  const text = {
    fontSize: 15,
    fontWeight: 700,
    fill: INK,
    fontFamily: 'inherit',
  } as const;
  const ext = {stroke: GUIDE, strokeWidth: 0.8} as const;
  const dimLine = {stroke: GUIDE, strokeWidth: 1} as const;
  return (
    <g>
      {/* Height — left side */}
      <line x1={x - 2} y1={y} x2={Xd - 6} y2={y} {...ext} />
      <line x1={x - 2} y1={y + h} x2={Xd - 6} y2={y + h} {...ext} />
      <line x1={Xd} y1={y} x2={Xd} y2={cym - gapV} {...dimLine} />
      <line x1={Xd} y1={cym + gapV} x2={Xd} y2={y + h} {...dimLine} />
      <polygon points={`${Xd},${y} ${Xd - ah},${y + ah * 1.8} ${Xd + ah},${y + ah * 1.8}`} fill={GUIDE} />
      <polygon points={`${Xd},${y + h} ${Xd - ah},${y + h - ah * 1.8} ${Xd + ah},${y + h - ah * 1.8}`} fill={GUIDE} />
      <text x={Xd} y={cym} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${Xd} ${cym})`} {...text}>
        {hLabel}
      </text>

      {/* Width — bottom */}
      <line x1={x} y1={y + h + 2} x2={x} y2={Yd + 6} {...ext} />
      <line x1={x + w} y1={y + h + 2} x2={x + w} y2={Yd + 6} {...ext} />
      <line x1={x} y1={Yd} x2={cxm - gapH} y2={Yd} {...dimLine} />
      <line x1={cxm + gapH} y1={Yd} x2={x + w} y2={Yd} {...dimLine} />
      <polygon points={`${x},${Yd} ${x + ah * 1.8},${Yd - ah} ${x + ah * 1.8},${Yd + ah}`} fill={GUIDE} />
      <polygon points={`${x + w},${Yd} ${x + w - ah * 1.8},${Yd - ah} ${x + w - ah * 1.8},${Yd + ah}`} fill={GUIDE} />
      <text x={cxm} y={Yd} textAnchor="middle" dominantBaseline="central" {...text}>
        {wLabel}
      </text>
    </g>
  );
}
