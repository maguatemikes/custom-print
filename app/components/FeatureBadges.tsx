/**
 * Feature badges — a framed-grid strip (hairline dividers, hover tint, index
 * numbers): Quality Prints · Easy Editing · Fast Delivery · Multiple Print
 * Methods. Shared by the home page and the product detail page.
 */
export function FeatureBadges() {
  const sw = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-6 w-6',
    'aria-hidden': true,
  };
  const items = [
    {
      t: 'Quality Prints',
      d: 'Vibrant, durable results every time',
      icon: (
        <svg {...sw}>
          <path d="M12 3l7 2.5v5.5c0 4-3 6.8-7 8-4-1.2-7-4-7-8V5.5L12 3z" />
          <path d="m9 11.5 2 2 4-4" />
        </svg>
      ),
    },
    {
      t: 'Easy Editing',
      d: 'No need to be a graphic artist',
      icon: (
        <svg {...sw}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      t: 'Fast Delivery',
      d: 'Made to order & shipped fast',
      icon: (
        <svg {...sw}>
          <path d="M1 4h15v12H1zM16 8h4l3 3v5h-7" />
          <circle cx="5.5" cy="18.5" r="1.6" />
          <circle cx="18.5" cy="18.5" r="1.6" />
        </svg>
      ),
    },
    {
      t: 'Multiple Print Methods',
      d: 'DTG, sublimation & more',
      icon: (
        <svg {...sw}>
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      ),
    },
  ];
  return (
    <section className="bg-paper">
      <div className="ui-container py-14 md:py-20">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-black/10 ring-1 ring-black/10 sm:grid-cols-2 md:grid-cols-4">
          {items.map((f, i) => (
            <div
              key={f.t}
              className="group relative flex flex-col gap-5 bg-paper p-7 transition-colors duration-200 hover:bg-mint md:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-ink ring-1 ring-black/5 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                {f.icon}
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">{f.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {f.d}
                </p>
              </div>
              <span className="pointer-events-none absolute right-6 top-6 text-xs font-semibold tabular-nums text-black/15">
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
