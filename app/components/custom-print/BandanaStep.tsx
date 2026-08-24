import type React from 'react';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {SelectMenu} from '~/components/SelectMenu';
import {MATERIALS} from '~/lib/customPrintData';
import {Field} from './primitives';

export function BandanaStep({
  sizes,
  size,
  setSize,
  material,
  setMaterial,
  baseHex,
  setBaseHex,
  printSides,
  setPrintSides,
}: {
  // Size options come from the product's Shopify variants (see the route).
  sizes: string[];
  size: string;
  setSize: (v: string) => void;
  material: string;
  setMaterial: (v: string) => void;
  baseHex: string;
  setBaseHex: (v: string) => void;
  printSides: 'blank' | 'one' | 'two';
  setPrintSides: (v: 'blank' | 'one' | 'two') => void;
}) {
  const PRINT_OPTIONS: Array<{
    value: 'blank' | 'one' | 'two';
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'one',
      label: 'Single side print',
      // Framed artwork = printed image on one face.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <circle cx="9.5" cy="9.5" r="1.4" />
          <path d="M5 16l4-4 3 3 3-4 4 5" />
        </svg>
      ),
    },
    {
      value: 'two',
      label: 'Double sided print',
      // Two stacked panels = front + back.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="8" y="4" width="12" height="12" rx="2.5" />
          <path d="M16 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
        </svg>
      ),
    },
    {
      value: 'blank',
      label: 'No print, solid colour',
      // Empty panel, crossed = plain fabric, no artwork.
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M6 18L18 6" />
        </svg>
      ),
    },
  ];
  return (
    <div>
      <Field
        n={1}
        title="Print option"
        hint="Print your artwork on one or both sides, or keep it plain (no print)."
      >
        <div className="grid grid-cols-3 gap-2">
          {PRINT_OPTIONS.map((o) => {
            const on = printSides === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setPrintSides(o.value)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-semibold leading-tight transition [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 ${
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-black/15 bg-white text-ink hover:border-ink'
                }`}
              >
                {o.icon}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        n={2}
        title="Base colour"
        hint="Pick any colour from the spectrum."
      >
        <ColorSpectrum value={baseHex} onChange={setBaseHex} />
      </Field>

      <Field n={3} title="Bandana size" hint="Pick a finished size.">
        <SelectMenu
          ariaLabel="Bandana size"
          value={size}
          onChange={setSize}
          options={sizes.map((name) => ({value: name, label: `${name} in`}))}
        />
      </Field>

      <Field n={4} title="Material" hint="Choose the fabric we print on.">
        <SelectMenu
          ariaLabel="Material"
          value={material}
          onChange={setMaterial}
          options={MATERIALS.map((m) => ({
            value: m.name,
            label: m.name,
            meta: m.note,
          }))}
        />
      </Field>
    </div>
  );
}
