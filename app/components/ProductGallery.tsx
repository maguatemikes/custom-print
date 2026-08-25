import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';

type GalleryImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/** A transformable logo laid over the main image (personalize flow) — drag to
 *  move, drag a corner to resize, drag the top handle to rotate. */
type LogoOverlay = {
  src: string;
  pos: {x: number; y: number};
  scale: number;
  rotate: number;
  onPosChange: (p: {x: number; y: number}) => void;
  onScaleChange: (n: number) => void;
  onRotateChange: (deg: number) => void;
};

export function ProductGallery({
  images,
  title,
  activeImageUrl,
  logoOverlay,
}: {
  images: GalleryImage[];
  title: string;
  activeImageUrl?: string | null;
  logoOverlay?: LogoOverlay | null;
}) {
  const [active, setActive] = useState(0);
  // The main-image box — drag maths measure against this rect.
  const mainImgRef = useRef<HTMLDivElement | null>(null);

  // Attach window listeners for a pointer gesture; auto-cleans on pointerup.
  const runGesture = (onMove: (ev: PointerEvent) => void) => {
    const up = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', up);
  };
  // Screen-space centre of the logo (its % position within the main image box).
  const logoCentre = () => {
    const r = mainImgRef.current?.getBoundingClientRect();
    if (!r || !logoOverlay) return null;
    return {
      cx: r.left + (logoOverlay.pos.x / 100) * r.width,
      cy: r.top + (logoOverlay.pos.y / 100) * r.height,
      rect: r,
    };
  };

  // Move — the logo centre follows the pointer (clamped inside the box).
  const startMove = (e: React.PointerEvent) => {
    e.preventDefault();
    runGesture((ev) => {
      const r = mainImgRef.current?.getBoundingClientRect();
      if (!r || !r.width || !logoOverlay) return;
      const clamp = (n: number) => Math.min(95, Math.max(5, n));
      logoOverlay.onPosChange({
        x: clamp(((ev.clientX - r.left) / r.width) * 100),
        y: clamp(((ev.clientY - r.top) / r.height) * 100),
      });
    });
  };
  // Resize — scale by the ratio of pointer-distance-from-centre (rotation-safe).
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const c = logoCentre();
    if (!c || !logoOverlay) return;
    const startDist =
      Math.hypot(e.clientX - c.cx, e.clientY - c.cy) || 1;
    const startScale = logoOverlay.scale;
    runGesture((ev) => {
      const d = Math.hypot(ev.clientX - c.cx, ev.clientY - c.cy);
      const next = Math.min(95, Math.max(6, startScale * (d / startDist)));
      logoOverlay.onScaleChange(Math.round(next));
    });
  };
  // Rotate — angle from the centre to the pointer (0° = handle straight up).
  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    runGesture((ev) => {
      const c = logoCentre();
      if (!c || !logoOverlay) return;
      const ang =
        (Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx) * 180) / Math.PI + 90;
      logoOverlay.onRotateChange(Math.round(((ang % 360) + 360) % 360));
    });
  };

  // Refs to each rail *container* (desktop vertical / mobile horizontal). We
  // scroll the active child into view — a container ref avoids the shared-ref
  // pitfall of putting one ref on whichever button is active.
  const railRef = useRef<HTMLDivElement | null>(null);
  const mobileRailRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  // When the selected variant changes, jump the gallery to that variant's image.
  // Only re-runs when the variant image URL changes (not on every images rebuild),
  // so manually clicking a thumbnail isn't instantly overridden.
  useEffect(() => {
    if (!activeImageUrl) return;
    const idx = images.findIndex((img) => img.url === activeImageUrl);
    if (idx >= 0) setActive(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageUrl]);

  // Slide the rail so the active thumbnail is in view whenever the selection
  // changes (swatch, arrow, or thumb tap). Skips the first mount so it never
  // scrolls the page on load, and honours reduced-motion. Reacts to `active`
  // only — the variant→image logic above is left exactly as-is.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const opts: ScrollIntoViewOptions = {
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    };
    const reveal = (rail: HTMLDivElement | null) => {
      // Skip a rail that's display:none (offsetParent === null) — only the rail
      // for the current breakpoint should scroll, and calling scrollIntoView on a
      // hidden element is a no-op that can interfere with the visible one.
      if (!rail || rail.offsetParent === null) return;
      const idx = Math.min(active, rail.children.length - 1);
      (rail.children[idx] as HTMLElement | undefined)?.scrollIntoView(opts);
    };
    reveal(railRef.current);
    reveal(mobileRailRef.current);
  }, [active]);

  if (!images.length) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-3xl bg-mint text-brand-600">
        <span className="text-sm font-bold lowercase">custombandanas</span>
      </div>
    );
  }

  const safeActive = Math.min(active, images.length - 1);
  const main = images[safeActive];
  const go = (dir: number) =>
    setActive((i) => (i + dir + images.length) % images.length);

  return (
    <div>
      <div className="flex gap-4">
        {/* Vertical thumbnail rail (desktop) — always visible; a single-image
            product shows its main image as the one thumbnail. Caps at ~4 then
            scrolls (scrollbar hidden). */}
        <div
          ref={railRef}
          className="no-scrollbar hidden max-h-[356px] w-20 shrink-0 flex-col gap-3 overflow-y-auto md:flex"
        >
          {images.map((img, i) => (
              <button
                key={img.id ?? i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === safeActive}
                className={`aspect-square shrink-0 overflow-hidden rounded-xl border bg-mint transition ${
                  i === safeActive
                    ? 'border-black/40'
                    : 'border-black/10 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  data={img}
                  width={80}
                  height={80}
                  sizes="80px"
                  className="h-full w-full object-cover"
                  alt={img.altText || `${title} thumbnail ${i + 1}`}
                />
              </button>
          ))}
        </div>

        {/* Main image */}
        <div className="relative flex-1">
          <div
            ref={mainImgRef}
            className="relative aspect-square overflow-hidden rounded-3xl bg-mint"
          >
            <Image
              data={main}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="h-full w-full object-cover"
              alt={main.altText || title}
            />
            {/* Transformable personalize logo — move / resize / rotate */}
            {logoOverlay ? (
              <div
                className="absolute touch-none select-none"
                style={{
                  left: `${logoOverlay.pos.x}%`,
                  top: `${logoOverlay.pos.y}%`,
                  width: `${logoOverlay.scale}%`,
                  transform: `translate(-50%, -50%) rotate(${logoOverlay.rotate}deg)`,
                }}
              >
                {/* Logo — drag the body to move */}
                <img
                  src={logoOverlay.src}
                  alt="Your logo"
                  draggable={false}
                  onPointerDown={startMove}
                  className="block w-full cursor-move touch-none select-none object-contain drop-shadow-lg"
                />
                {/* Selection box */}
                <div className="pointer-events-none absolute inset-0 border-2 border-brand-500" />
                {/* Corner resize handles */}
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
                    style={{left: l, top: t}}
                    aria-label="Resize logo"
                    className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-brand-500 bg-white shadow ${cur}`}
                  />
                ))}
                {/* Rotate handle (above the box) */}
                <div className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-brand-500" />
                <span
                  onPointerDown={startRotate}
                  aria-label="Rotate logo"
                  style={{left: '50%', top: '-20px'}}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-brand-500 bg-white shadow active:cursor-grabbing"
                />
              </div>
            ) : null}
          </div>

          {images.length > 1 && (
            <>
              <GalleryArrow side="left" onClick={() => go(-1)} />
              <GalleryArrow side="right" onClick={() => go(1)} />
            </>
          )}
        </div>
      </div>

      {/* Horizontal thumbnails (mobile) */}
      {images.length > 1 && (
        <div
          ref={mobileRailRef}
          className="no-scrollbar mt-3 flex gap-3 overflow-x-auto md:hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.id ?? i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-mint ${
                i === safeActive ? 'border-black/40' : 'border-black/10 opacity-70'
              }`}
            >
              <Image
                data={img}
                width={64}
                height={64}
                sizes="64px"
                className="h-full w-full object-cover"
                alt={img.altText || `${title} thumbnail ${i + 1}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={`absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md transition hover:bg-mint ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
