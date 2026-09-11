import {useEffect, useRef} from 'react';

/**
 * Full-width infinite-loop carousel — EQUAL-size cards that auto-scroll forever
 * and wrap seamlessly (the list is tripled so there's always content to loop
 * into). Drag/swipe to move, hover to pause. Wide page-coloured ovals crop the
 * strip top & bottom along an arc, so the flat row reads as if it curves on a
 * cylinder. Shared by the homepage hero gallery and the calculator page.
 *
 * `cards` are the tile contents (each already the rounded card); the carousel
 * handles the equal-width wrapper, looping, drag, and the arc mask. `arcClassName`
 * is the colour of the cropping ovals — match the section behind the carousel.
 */
export function CurveCarousel({
  cards,
  arcClassName = 'bg-paper',
  itemClassName = 'w-56 shrink-0 md:w-[300px]',
  curve = true,
}: {
  cards: React.ReactNode[];
  arcClassName?: string;
  // Per-card wrapper width — drives the card (and slider) size. Override to make
  // the tiles bigger/taller on a given page; the homepage keeps the default.
  itemClassName?: string;
  // The cylinder "curve" arc crop on top & bottom. Off => flat full cards show.
  curve?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const st = useRef({
    offset: 0,
    setW: 0,
    paused: false,
    dragging: false,
    startX: 0,
    startOffset: 0,
  });
  const items = [...cards, ...cards, ...cards];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      st.current.setW = track.scrollWidth / 3; // width of ONE set of cards
    };
    measure();
    window.addEventListener('resize', measure);
    let raf = 0;
    const speed = 0.5; // px per frame
    const tick = () => {
      const s = st.current;
      if (!s.paused && !s.dragging) s.offset += speed;
      if (s.setW) {
        if (s.offset >= s.setW) s.offset -= s.setW; // seamless wrap forward
        else if (s.offset < 0) s.offset += s.setW; // and backward (drag)
      }
      track.style.transform = `translate3d(${-s.offset}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startOffset = s.offset;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.dragging) return;
    s.offset = s.startOffset - (e.clientX - s.startX);
  };
  const endDrag = () => {
    st.current.dragging = false;
  };

  return (
    <div className="relative mt-4 overflow-hidden md:mt-8">
      <div
        className="overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onMouseEnter={() => (st.current.paused = true)}
        onMouseLeave={() => (st.current.paused = false)}
      >
        <div
          ref={trackRef}
          className="flex w-max cursor-grab select-none gap-5 py-5 will-change-transform active:cursor-grabbing"
        >
          {items.map((card, i) => (
            // Static marquee, never reordered — index is a stable key.
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className={itemClassName}>
              {card}
            </div>
          ))}
        </div>
      </div>

      {/* Oblong top & bottom — wide ovals crop the strip along an arc so the flat
          row reads as if it curves on a cylinder. */}
      {curve ? (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-0 h-[65%] w-[150%] -translate-x-1/2 -translate-y-[76%] rounded-[50%] ${arcClassName}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-0 left-1/2 h-[65%] w-[150%] -translate-x-1/2 translate-y-[76%] rounded-[50%] ${arcClassName}`}
          />
        </>
      ) : null}
    </div>
  );
}
