import {memo} from 'react';
import type {LogoMark} from '~/lib/customPrintData';

function BandanaPreviewImpl({
  shape,
  baseColor,
  logoPreview,
  marks,
  fullDesign,
  seamless = false,
  logoRotate,
  logoScale,
  colSpace = 100,
  rowSpace = 100,
  compact,
  blank = false,
  badge = null,
  proofLabel = null,
  flipSide = null,
  onFlip,
}: {
  shape: string;
  baseColor: string;
  logoPreview: string | null;
  marks: LogoMark[];
  fullDesign: boolean;
  seamless?: boolean;
  logoRotate: number;
  logoScale: number;
  colSpace?: number;
  rowSpace?: number;
  compact?: boolean;
  blank?: boolean;
  badge?: string | null;
  proofLabel?: string | null;
  flipSide?: 'front' | 'back' | null;
  onFlip?: (side: 'front' | 'back') => void;
}) {
  const isTriangle = shape === 'Triangle';
  // Column / row spacing spreads the repeating logos apart FROM THEIR OWN group
  // centre (so the arrangement stays put and just expands), not the canvas
  // centre. Single-logo layouts have their centre on the logo, so it's a no-op.
  const gcx = marks.length
    ? marks.reduce((a, m) => a + m.x, 0) / marks.length
    : 0;
  const gcy = marks.length
    ? marks.reduce((a, m) => a + m.y, 0) / marks.length
    : 0;
  const spacedMarks = marks.map((m) => ({
    ...m,
    x: gcx + (m.x - gcx) * (colSpace / 100),
    y: gcy + (m.y - gcy) * (rowSpace / 100),
  }));
  // Right-triangle fold (right angle bottom-left, hypotenuse top-left→bottom-
  // right) — the real shape of a corner-folded bandana. Fills the canvas; the
  // top-right (outside) is masked so artwork never spills past the fold.
  const triPath = 'M-200 -200 L-200 200 L200 200 Z';
  // Masks everything outside the triangle (the top-right half) with the tile
  // colour — rasterization-safe (a plain polygon, unlike an SVG clip-path).
  const triMask = 'M-200 -200 L200 -200 L200 200 Z';
  const art = `rotate(${logoRotate}) scale(${logoScale / 100})`;

  // Placeholder ink flips to light on dark bases so it stays visible on any
  // base colour (adaptive contrast rather than a fixed dark tone).
  const lum = (() => {
    const h = baseColor.replace('#', '');
    if (h.length < 6) return 1;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  })();
  const onDark = lum < 0.5;
  const phStroke = onDark ? 'rgba(255,255,255,0.8)' : 'rgba(16,20,16,0.3)';
  const phText = onDark ? 'rgba(255,255,255,0.92)' : 'rgba(16,20,16,0.45)';
  return (
    <div>
      <div
        className={`relative aspect-square w-full overflow-hidden ${
          isTriangle ? 'bg-transparent' : 'bg-mint'
        }`}
      >
        {!compact ? (
          // Adaptive contrast like the artwork placeholder — blends into the
          // base colour (light on dark bases, subtle dark on light bases)
          // instead of a fixed brand-blue label.
          <span
            className="eyebrow absolute left-5 top-5 z-10"
            style={{color: phText}}
          >
            Preview
          </span>
        ) : null}

        {badge && !compact ? (
          <span className="absolute bottom-4 left-5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : null}

        {flipSide && !compact ? (
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-white/90 p-0.5 shadow">
            {(['front', 'back'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={flipSide === s}
                onClick={() => onFlip?.(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${
                  flipSide === s ? 'bg-ink text-white' : 'text-ink/70'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${shape || 'Bandana'} ${proofLabel ?? 'preview'}`}
        >
          <g transform="translate(200 200)">
            {/* Clean bandana filling the canvas (square) or folded triangle. */}
            {isTriangle ? (
              <path d={triPath} fill={baseColor} />
            ) : (
              <rect
                x="-200"
                y="-200"
                width="400"
                height="400"
                fill={baseColor}
              />
            )}

            {/* Blank = solid colour only: no artwork, no placeholder. */}
            {!blank &&
              (seamless ? (
                /* Seamless — the design tiled edge-to-edge as a 3×3 grid, no
                   gaps (slice-fills each cell). Triangle is clipped by triMask. */
                logoPreview ? (
                  <>
                    {[0, 1, 2].flatMap((j) =>
                      [0, 1, 2].map((i) => (
                        <image
                          key={`s-${i}-${j}`}
                          href={logoPreview}
                          x={-200 + (i * 400) / 3}
                          y={-200 + (j * 400) / 3}
                          width={400 / 3 + 0.5}
                          height={400 / 3 + 0.5}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      )),
                    )}
                  </>
                ) : (
                  <>
                    {[-200 / 3, 200 / 3].map((c) => (
                      <line
                        key={`sv-${c}`}
                        x1={c}
                        y1={-200}
                        x2={c}
                        y2={200}
                        stroke={phStroke}
                        strokeWidth="2"
                        strokeDasharray="9 9"
                      />
                    ))}
                    {[-200 / 3, 200 / 3].map((c) => (
                      <line
                        key={`sh-${c}`}
                        x1={-200}
                        y1={c}
                        x2={200}
                        y2={c}
                        stroke={phStroke}
                        strokeWidth="2"
                        strokeDasharray="9 9"
                      />
                    ))}
                    <text
                      x="0"
                      y="6"
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="700"
                      fill={phText}
                      letterSpacing="1.5"
                    >
                      SEAMLESS
                    </text>
                  </>
                )
              ) : fullDesign ? (
              /* Full print — your edge-to-edge design, clipped to the shape */
              logoPreview ? (
                /* Full print — centre the design on the triangle's centroid
                   (−67, 67) so it sits in the middle of the fold, not on the
                   hypotenuse; the square keeps canvas-centre. */
                <g
                  transform={`${isTriangle ? 'translate(-67 67) ' : ''}${art}`}
                >
                  <image
                    href={logoPreview}
                    x="-200"
                    y="-200"
                    width="400"
                    height="400"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              ) : isTriangle ? (
                <>
                  {/* Placeholder outline sits inside the right triangle. */}
                  <path
                    d="M-170 -125 L-170 170 L125 170 Z"
                    fill="none"
                    stroke={phStroke}
                    strokeWidth="2"
                    strokeDasharray="9 9"
                  />
                  <text
                    x="-58"
                    y="82"
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="700"
                    fill={phText}
                    letterSpacing="1.5"
                  >
                    YOUR DESIGN
                  </text>
                </>
              ) : (
                <>
                  <rect
                    x="-165"
                    y="-165"
                    width="330"
                    height="330"
                    fill="none"
                    stroke={phStroke}
                    strokeWidth="2"
                    strokeDasharray="9 9"
                  />
                  <text
                    x="0"
                    y="6"
                    textAnchor="middle"
                    fontSize="19"
                    fontWeight="700"
                    fill={phText}
                    letterSpacing="1.5"
                  >
                    YOUR DESIGN
                  </text>
                </>
              )
            ) : (
              /* Logo layout — uploaded artwork or a placeholder (spaced) */
              spacedMarks.map((m) => (
                <g
                  key={`${m.x}-${m.y}-${m.rot}`}
                  transform={`translate(${m.x * 2.4} ${m.y * 2.4}) rotate(${m.rot})`}
                >
                  {logoPreview ? (
                    <image
                      href={logoPreview}
                      x="-20"
                      y="-20"
                      width="40"
                      height="40"
                      transform={art}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : (
                    <>
                      <rect
                        x="-20"
                        y="-20"
                        width="40"
                        height="40"
                        rx="6"
                        fill="none"
                        stroke={phStroke}
                        strokeWidth="1.4"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill={phText}
                        letterSpacing="0.5"
                      >
                        LOGO
                      </text>
                    </>
                  )}
                </g>
              ))
              ))}

            {/* Mask the top-right (outside the fold) with the page colour so the
                triangle stands alone (no grey square) and artwork never spills.
                Tagged so svgToPng can drop it — the PNG clips to the triangle
                and stays transparent outside instead of baking a white square. */}
            {isTriangle ? (
              <path d={triMask} fill="#ffffff" data-tri-mask="1" />
            ) : null}
          </g>
        </svg>
      </div>

      {!compact ? (
        <p className="mt-2 text-xs text-muted">
          Representative mockup — upload your real artwork after checkout.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Memoised: the wizard re-renders on lots of state the preview doesn't draw
 * (email keystrokes, quantity, material, size, upload/proof status…). memo's
 * shallow prop check skips a full SVG re-layout unless a real preview prop
 * (colour, logo, pattern, rotation, spacing, side) actually changes. Every prop
 * passed in is a primitive, a module-constant array (`marks`), or a stable
 * callback (`onFlip` = a setState setter), so the comparison bites.
 */
export const BandanaPreview = memo(BandanaPreviewImpl);
