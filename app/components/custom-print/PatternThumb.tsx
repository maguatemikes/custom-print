import {useId} from 'react';
import type {LogoMark} from '~/lib/customPrintData';

/** Mini thumbnail illustrating a logo layout (dots). */
export function PatternThumb({
  marks,
  triangle = false,
  active = false,
  seamless = false,
}: {
  marks: LogoMark[];
  triangle?: boolean;
  active?: boolean;
  seamless?: boolean;
}) {
  // Unique per instance so multiple chips' clip paths don't collide.
  const uid = useId();
  const s = triangle ? 1.05 : 1.45;
  // Triangle dots render on an ~80px SVG vs the square's 44px, so shrink them to
  // read at the same on-screen size (12/180×80 ≈ 22/180×44 ≈ 5.4px).
  const dot = triangle ? 12 : 22;
  const r = dot / 2;
  const rx = triangle ? 2 : 4;
  // Triangle chips ARE a solid triangle (no square frame): the triangle carries
  // the selected state (dark when active, muted grey otherwise), and the logo
  // dots punch through as white (the card behind the chip).
  const triFill = active ? '#0b1622' : '#cbd5e1';
  const dotFill = triangle ? '#ffffff' : 'currentColor';

  // Seamless = the design tiled edge-to-edge with no gaps. The triangle chip is
  // the solid fold overlaid with a fine white lattice CLIPPED to the triangle —
  // it reads as one tiled surface (a triangle, like every other chip) instead of
  // a handful of floating boxes. The square chip stays a filled 3×3 grid.
  if (seamless) {
    if (triangle) {
      const clip = `seam-${uid}`;
      const tri = 'M-87.5 -87.5 L-87.5 87.5 L87.5 87.5 Z';
      const divs = [-29, 29]; // 3×3 tiling, matching the seamless preview grid
      return (
        <svg viewBox="-90 -90 180 180" className="h-full w-full" aria-hidden="true">
          <defs>
            <clipPath id={clip}>
              <path d={tri} />
            </clipPath>
          </defs>
          <path d={tri} fill={triFill} />
          <g
            clipPath={`url(#${clip})`}
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
          >
            {divs.map((v) => (
              <line key={`v${v}`} x1={v} y1={-90} x2={v} y2={90} />
            ))}
            {divs.map((h) => (
              <line key={`h${h}`} x1={-90} y1={h} x2={90} y2={h} />
            ))}
          </g>
        </svg>
      );
    }
    const centers = [-60, 0, 60];
    const cell = 54;
    return (
      <svg viewBox="-90 -90 180 180" className="h-11 w-11" aria-hidden="true">
        {centers.flatMap((cy) =>
          centers.map((cx) => (
            <rect
              key={`${cx}-${cy}`}
              x={cx - cell / 2}
              y={cy - cell / 2}
              width={cell}
              height={cell}
              rx={rx}
              fill={dotFill}
              opacity={0.85}
            />
          )),
        )}
      </svg>
    );
  }

  return (
    <svg
      viewBox="-90 -90 180 180"
      className={triangle ? 'h-full w-full' : 'h-11 w-11'}
      aria-hidden="true"
    >
      {triangle ? (
        <path d="M-87.5 -87.5 L-87.5 87.5 L87.5 87.5 Z" fill={triFill} />
      ) : null}
      {marks.map((m) => (
        <rect
          key={`${m.x}-${m.y}-${m.rot}`}
          x={-r}
          y={-r}
          width={dot}
          height={dot}
          rx={rx}
          transform={`translate(${m.x * s} ${m.y * s}) rotate(${m.rot})`}
          fill={dotFill}
          opacity={triangle ? 1 : 0.85}
        />
      ))}
    </svg>
  );
}
