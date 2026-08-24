import {useEffect, useRef, useState} from 'react';

export type SelectOption = {value: string; label: string; meta?: string};

/**
 * Accessible custom dropdown (listbox) — replaces the native <select> so the
 * floating menu can match the design system (rounded panel, soft shadow,
 * hover/selected states). Closes on outside-click, Escape, or selection;
 * supports ↑/↓/Enter/Home/End keyboard navigation.
 *
 * Shared by the PDP "Personalize me" flow and the custom-print wizard.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, options, value]);

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-black/15 bg-white pl-4 pr-3 text-sm font-semibold text-ink transition hover:border-ink focus:border-brand-500 focus:outline-none"
      >
        <span className="truncate">
          {current?.label}
          {current?.meta ? (
            <span className="font-normal text-muted"> — {current.meta}</span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-xl ring-1 ring-black/5"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            const highlighted = i === active;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  highlighted ? 'bg-mint' : ''
                } ${selected ? 'font-semibold text-ink' : 'text-ink'}`}
              >
                <span>
                  {o.label}
                  {o.meta ? (
                    <span
                      className={
                        selected ? 'font-normal text-muted' : 'text-muted'
                      }
                    >
                      {' '}
                      — {o.meta}
                    </span>
                  ) : null}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 shrink-0 text-ink ${
                    selected ? 'opacity-100' : 'opacity-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
