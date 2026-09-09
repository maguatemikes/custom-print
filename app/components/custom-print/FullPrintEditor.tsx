import {useRef} from 'react';
import {FULL_PRINT_FILL} from '~/lib/customPrintData';

/**
 * Wraps the wizard's main preview and, for the Full-print layout, lets the
 * customer position the edge-to-edge design by mouse — drag to move, corner
 * handles to resize, top handle to rotate. The selection box transforms WITH the
 * design (positioned at `pos`, sized to `scale`, rotated to `rotate`), exactly
 * like the PDP overlay. When `active` is false it renders the preview untouched
 * (repeating/seamless layouts position by their marks — nothing to drag).
 *
 * The overlay sits BELOW the preview's own z-10 controls (Preview label, badge,
 * front/back toggle) so those stay clickable. `pos` is canvas % (50/50 =
 * centred) — the same space BandanaPreview maps to its Full-print offset, so the
 * box and the rendered design stay locked together.
 */
export function FullPrintEditor({
  active,
  pos = {x: 50, y: 50},
  onPosChange,
  scale,
  onScaleChange,
  rotate,
  onRotateChange,
  anchor = {x: 0, y: 0},
  children,
}: {
  active: boolean;
  pos: {x: number; y: number};
  onPosChange: (p: {x: number; y: number}) => void;
  scale: number;
  onScaleChange: (n: number) => void;
  rotate: number;
  onRotateChange: (deg: number) => void;
  // Where `pos` maps on the canvas, in canvas % added to `pos` — the shape's
  // design centre. Square centres on the canvas (0,0); the triangle's design is
  // drawn on its centroid, so its anchor shifts the box to match (mirrors the
  // BandanaPreview transform). `pos` stays the pan value the preview reads.
  anchor?: {x: number; y: number};
  children: React.ReactNode;
}) {
  // The preview-area box — all gesture maths measure against this rect.
  const boxRef = useRef<HTMLDivElement>(null);
  // Screen position of the design centre in canvas % (pan + shape anchor).
  const px = pos.x + anchor.x;
  const py = pos.y + anchor.y;

  const runGesture = (onMove: (ev: PointerEvent) => void) => {
    const up = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', up);
  };

  // Screen-space centre of the design (its % position within the preview box).
  const centre = () => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      cx: r.left + (px / 100) * r.width,
      cy: r.top + (py / 100) * r.height,
    };
  };

  // Move — grab-relative: the design shifts by the pointer's delta from where the
  // drag began, so the exact point you grabbed stays under the cursor (no jump to
  // centre). Clamped so the design centre can't leave the canvas.
  const startMove = (e: React.PointerEvent) => {
    e.preventDefault();
    const r = boxRef.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = {...pos};
    const clamp = (n: number) => Math.min(95, Math.max(5, n));
    runGesture((ev) => {
      onPosChange({
        x: clamp(start.x + ((ev.clientX - startX) / r.width) * 100),
        y: clamp(start.y + ((ev.clientY - startY) / r.height) * 100),
      });
    });
  };

  // Resize — scale by the ratio of pointer-distance-from-centre. PDP.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const c = centre();
    if (!c) return;
    const startDist = Math.hypot(e.clientX - c.cx, e.clientY - c.cy) || 1;
    const startScale = scale;
    runGesture((ev) => {
      const d = Math.hypot(ev.clientX - c.cx, ev.clientY - c.cy);
      onScaleChange(
        Math.min(300, Math.max(30, Math.round(startScale * (d / startDist)))),
      );
    });
  };

  // Rotate — angle from the design centre to the pointer (0° = handle up). PDP.
  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    runGesture((ev) => {
      const c = centre();
      if (!c) return;
      const ang =
        (Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx) * 180) / Math.PI + 90;
      onRotateChange(Math.round(((ang % 360) + 360) % 360));
    });
  };

  return (
    <div className="relative">
      {children}
      {active ? (
        <div
          ref={boxRef}
          className="absolute inset-x-0 top-0 z-[5] aspect-square touch-none select-none overflow-hidden"
        >
          {/* The design's bounding box — moves / scales / rotates WITH the design. */}
          <div
            className="absolute"
            style={{
              left: `${px}%`,
              top: `${py}%`,
              width: `${scale * FULL_PRINT_FILL}%`,
              height: `${scale * FULL_PRINT_FILL}%`,
              transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
            }}
          >
            {/* Drag the body to move. */}
            <div
              onPointerDown={startMove}
              className="absolute inset-0 cursor-move"
              aria-label="Drag to move the design"
            />
            {/* Selection box. */}
            <div className="pointer-events-none absolute inset-0 border-2 border-brand-500" />
            {/* Corner resize handles. */}
            {(
              [
                ['0%', '0%', 'cursor-nwse-resize'],
                ['100%', '0%', 'cursor-nesw-resize'],
                ['0%', '100%', 'cursor-nesw-resize'],
                ['100%', '100%', 'cursor-nwse-resize'],
              ] as const
            ).map(([l, t, cur]) => (
              <span
                key={`${l}-${t}`}
                onPointerDown={startResize}
                aria-label="Resize the design"
                style={{left: l, top: t}}
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-brand-500 bg-white shadow ${cur}`}
              />
            ))}
            {/* Rotate handle (above the box) + its stalk. */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 -translate-y-full bg-brand-500" />
            <button
              type="button"
              onPointerDown={startRotate}
              aria-label="Rotate the design"
              style={{left: '50%', top: '-28px'}}
              className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border border-brand-500 bg-white text-brand-600 shadow active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36M21 3v4h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Hint */}
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
            Drag to move · corners to resize · handle to rotate
          </span>
        </div>
      ) : null}
    </div>
  );
}
