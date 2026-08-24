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

  // Seamless = a filled 3×3 grid of tiles (touching, thin gaps read as a grid),
  // NOT scattered dots. Triangle keeps only the lower-left cells (the fold).
  if (seamless) {
    const centers = [-60, 0, 60];
    const cell = 54;
    const cells: Array<{cx: number; cy: number}> = [];
    for (const cy of centers)
      for (const cx of centers) {
        if (triangle && cy < cx) continue; // keep the fold (lower-left)
        cells.push({cx, cy});
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
        {cells.map(({cx, cy}) => (
          <rect
            key={`${cx}-${cy}`}
            x={cx - cell / 2}
            y={cy - cell / 2}
            width={cell}
            height={cell}
            rx={rx}
            fill={dotFill}
            opacity={triangle ? 1 : 0.85}
          />
        ))}
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
