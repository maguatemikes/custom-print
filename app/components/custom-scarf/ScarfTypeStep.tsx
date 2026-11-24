import type React from 'react';
import {Field, OptionCard} from '~/components/custom-print/primitives';
import {ColorSpectrum} from '~/components/ColorSpectrum';
import {
  SCARF_FINISHES,
  SCARF_TYPE_LIST,
  MATERIALS,
  defaultSizeFor,
  type ScarfSize,
} from '~/lib/customScarfData';

/* -------------------------------------------------------------------------- */
/* ScarfTypeStep — step 0 of the custom-scarf wizard.                          */
/* Pick the scarf TYPE (square / oblong / shawl), then a preset SIZE, edge       */
/* finish, material, base colour, and whether it's printed or solid.             */
/* -------------------------------------------------------------------------- */

/** Mini proportioned SVG scarf for a type (body + outline + dashed hem). */
function TypeGlyph({size}: {size: ScarfSize}): React.ReactElement {
  const aspect = size.w / size.h;
  let w = 32;
  let h = 32;
  if (aspect >= 1) h = 32 / aspect;
  else w = 32 * aspect;
  const x = (40 - w) / 2;
  const y = (40 - h) / 2;
  const inset = 3;
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} fill="currentColor" opacity={0.18} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, w - inset * 2)}
        height={Math.max(0, h - inset * 2)}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.8}
        strokeDasharray="3 2"
        opacity={0.7}
      />
    </svg>
  );
}

export function ScarfTypeStep({
  typeSlug,
  onSelectType,
  sizes,
  sizeName,
  onSelectSize,
  finish,
  setFinish,
  material,
  setMaterial,
  baseHex,
  setBaseHex,
}: {
  typeSlug: string;
  onSelectType: (slug: string) => void;
  sizes: ScarfSize[];
  sizeName: string;
  onSelectSize: (name: string) => void;
  finish: string;
  setFinish: (v: string) => void;
  material: string;
  setMaterial: (v: string) => void;
  baseHex: string;
  setBaseHex: (v: string) => void;
}) {
  return (
    <div>
      <Field n={1} title="Scarf type" required hint="Square, oblong, or a shawl/wrap.">
        <div className="grid grid-cols-3 gap-2">
          {SCARF_TYPE_LIST.map((t) => {
            const active = t.slug === typeSlug;
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectType(t.slug)}
                title={t.label}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-[11px] font-semibold transition ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-black/15 bg-white text-ink hover:border-ink'
                }`}
              >
                <TypeGlyph size={defaultSizeFor(t)} />
                <span className="leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field n={2} title="Size" required hint="Finished size, in inches.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sizes.map((s) => (
            <OptionCard
              key={s.name}
              selected={sizeName === s.name}
              onClick={() => onSelectSize(s.name)}
            >
              {s.name}″
            </OptionCard>
          ))}
        </div>
      </Field>

      <Field n={3} title="Edge finish" hint="How the scarf edge is finished.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SCARF_FINISHES.map((f) => (
            <OptionCard
              key={f.value}
              selected={finish === f.value}
              onClick={() => setFinish(f.value)}
            >
              {f.label}
            </OptionCard>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {SCARF_FINISHES.find((f) => f.value === finish)?.note}
        </p>
      </Field>

      <Field n={4} title="Material">
        <div className="grid grid-cols-2 gap-2">
          {MATERIALS.map((m) => (
            <OptionCard
              key={m.name}
              selected={material === m.name}
              onClick={() => setMaterial(m.name)}
            >
              {m.name}
            </OptionCard>
          ))}
        </div>
      </Field>

      <Field n={5} title="Base colour" hint="Pick any colour from the spectrum.">
        <ColorSpectrum value={baseHex} onChange={setBaseHex} />
      </Field>
    </div>
  );
}
