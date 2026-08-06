/**
 * Shared building blocks for the customer Account UI (settings-style layout).
 * Presentation only — no data, no auth. Built with Tailwind utilities to match
 * the rest of the storefront (buttons reuse the project's `.btn-*` primitives).
 */

export const money = (amount: string, currencyCode = 'USD') => {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(n);
  } catch {
    return '$' + n.toFixed(2);
  }
};

/** "IN_PROGRESS" -> "In progress" */
export function prettyStatus(s: string) {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function chipTone(label?: string | null) {
  const s = (label ?? '').toLowerCase();
  if (s.includes('paid') || s.includes('fulfilled') || s.includes('success'))
    return 'bg-mint text-brand-700';
  if (
    s.includes('progress') ||
    s.includes('pending') ||
    s.includes('partial') ||
    s.includes('unfulfilled')
  )
    return 'bg-amber-100 text-amber-700';
  return 'bg-neutral-100 text-neutral-600';
}

/** Small semantic status pill (green / amber / grey). */
export function StatusChip({children}: {children: React.ReactNode}) {
  const label = String(children);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${chipTone(
        label,
      )}`}
    >
      {prettyStatus(label)}
    </span>
  );
}

/** Reusable form field classes (match the storefront input style). */
export const ACCOUNT_LABEL = 'mb-1.5 block text-sm font-medium text-ink';
export const ACCOUNT_INPUT =
  'w-full rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

/** Card shell: header (icon + title + optional action) over a body. */
export function AccountCard({
  icon,
  title,
  action,
  children,
  flush,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="overflow-visible rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4 md:px-6">
        {icon ? <span className="text-brand-700">{icon}</span> : null}
        <h2 className="text-[15px] font-semibold tracking-tight text-ink md:text-base">
          {title}
        </h2>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className={flush ? '' : 'p-5 md:p-6'}>{children}</div>
    </div>
  );
}

/** Pending placeholder shown in the content slot while a tab's loader fetches,
 *  so switching tabs gives instant feedback instead of a dead beat. */
export function AccountSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4 md:px-6">
        <div className="h-[18px] w-[18px] animate-pulse rounded bg-black/10" />
        <div className="h-4 w-28 animate-pulse rounded bg-black/10" />
      </div>
      <div className="divide-y divide-black/10">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 md:px-6">
            <div className="h-[42px] w-[42px] flex-none animate-pulse rounded-[11px] bg-black/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-black/10" />
              <div className="h-3 w-44 max-w-full animate-pulse rounded bg-black/[0.07]" />
            </div>
            <div className="hidden h-5 w-24 flex-none animate-pulse rounded-full bg-black/[0.07] sm:block" />
            <div className="h-3.5 w-12 flex-none animate-pulse rounded bg-black/[0.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Icons --------------------------------- */
const sp = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-[18px] w-[18px]',
  'aria-hidden': true,
};
export function IconBag() {
  return (
    <svg {...sp}>
      <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4Z" />
      <path d="M4 6h16M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
export function IconUser() {
  return (
    <svg {...sp}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
export function IconPin() {
  return (
    <svg {...sp}>
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
export function IconTruck() {
  return (
    <svg {...sp}>
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="1.8" />
      <circle cx="18.5" cy="18.5" r="1.8" />
    </svg>
  );
}
export function IconSignOut() {
  return (
    <svg {...sp}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function IconKebab() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}
