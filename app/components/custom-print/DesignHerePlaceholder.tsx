import {memo} from 'react';

/**
 * Square "YOUR DESIGN HERE" bandana mock — the marketing-style placeholder for the
 * square print step, matched to the triangle template (TriangleDesignHere): the
 * bandana body follows the shopper's chosen fabric colour (a soft radial derived
 * from it), and the stitch frame / spec text / footer / divider auto-contrast
 * (white on dark fabric, ink on light). The YOUR/DESIGN/HERE badges keep their
 * fixed colours — their dark outlines keep them legible on any fabric.
 *
 * Self-contained SVG (viewBox 0 0 800 800, from the store's own artwork) so it
 * scales cleanly, rasterizes, and can be mirrored (double-sided "back" face) via
 * a `-scale-x-100` on `className`.
 */
function buildSvg(color: string): string {
  const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#5a2fe6';
  const hex = safe.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const dark = lum < 0.55;

  // Derive a soft radial from the fabric colour: lighter centre → colour → a
  // touch darker at the edges, so the square reads as fabric, not a flat fill.
  const toWhite = (c: number, t: number) => Math.round(c + (255 - c) * t);
  const toBlack = (c: number, t: number) => Math.round(c * (1 - t));
  const rgb = (fn: (c: number, t: number) => number, t: number) =>
    `rgb(${fn(r, t)},${fn(g, t)},${fn(b, t)})`;
  const cCenter = rgb(toWhite, 0.14);
  const cEdge = rgb(toBlack, 0.16);

  // Contrast-aware accents (stitching, spec text, footer, divider dot).
  const stitch = dark ? 'rgba(255,255,255,0.9)' : 'rgba(16,20,16,0.5)';
  const lbl = dark ? '#ffffff' : '#101410';

  return `<svg viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Square custom print bandana - your design here">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${cCenter}"/>
      <stop offset="70%" stop-color="${safe}"/>
      <stop offset="100%" stop-color="${cEdge}"/>
    </radialGradient>
    <style>
      .lbl{font-family:Arial,Helvetica,sans-serif;font-weight:700;fill:${lbl};letter-spacing:4px;}
      .word{font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-weight:900;fill:#fff;
            paint-order:stroke;stroke:#15121f;stroke-width:4px;stroke-linejoin:round;}
    </style>
  </defs>

  <!-- Bandana field — sharp corners (bandanas aren't rounded) -->
  <rect x="0" y="0" width="800" height="800" fill="url(#bg)"/>

  <!-- Dashed stitch frame -->
  <rect x="40" y="40" width="720" height="720" fill="none"
        stroke="${stitch}" stroke-width="2.5" stroke-dasharray="3 9"/>
  <!-- Corner brackets -->
  <g fill="none" stroke="${stitch}" stroke-width="3" stroke-linecap="round">
    <path d="M64 92 L64 64 L92 64"/>
    <path d="M736 92 L736 64 L708 64"/>
    <path d="M64 708 L64 736 L92 736"/>
    <path d="M736 708 L736 736 L708 736"/>
  </g>

  <!-- YOUR -->
  <g transform="rotate(-4 400 205)">
    <rect x="243" y="163" width="314" height="88" rx="14" fill="#000" opacity="0.3" transform="translate(0 11)"/>
    <rect x="243" y="163" width="314" height="88" rx="14" fill="#9aa0a6"/>
    <text class="word" x="400" y="233" text-anchor="middle" font-size="72">YOUR</text>
  </g>
  <!-- DESIGN -->
  <g transform="rotate(1.5 400 296)">
    <rect x="205" y="252" width="390" height="90" rx="14" fill="#000" opacity="0.3" transform="translate(0 11)"/>
    <rect x="205" y="252" width="390" height="90" rx="14" fill="#2f9fe0"/>
    <text class="word" x="400" y="322" text-anchor="middle" font-size="70">DESIGN</text>
  </g>
  <!-- HERE -->
  <g transform="rotate(-2.5 400 386)">
    <rect x="279" y="344" width="242" height="84" rx="14" fill="#000" opacity="0.3" transform="translate(0 11)"/>
    <rect x="279" y="344" width="242" height="84" rx="14" fill="#17181c"/>
    <text class="word" x="400" y="410" text-anchor="middle" font-size="66">HERE</text>
  </g>

  <!-- Divider dot -->
  <circle cx="400" cy="452" r="4" fill="${stitch}"/>

  <!-- Specs -->
  <text class="lbl" x="400" y="486" text-anchor="middle" font-size="21">ANY COLOR &#8226; DIGITALLY PRINTED</text>
  <text class="lbl" x="400" y="516" text-anchor="middle" font-size="21">100% COTTON</text>

  <!-- Color swatch strip -->
  <g transform="translate(268 548)">
    <rect x="-12" y="-12" width="288" height="98" rx="12" fill="${
      dark ? '#ffffff' : '#101410'
    }" opacity="0.14"/>
    <!-- Row 1 -->
    <g>
      <rect x="0"   y="0" width="18" height="18" rx="3" fill="#e74c3c"/>
      <rect x="22"  y="0" width="18" height="18" rx="3" fill="#e67e22"/>
      <rect x="44"  y="0" width="18" height="18" rx="3" fill="#f1c40f"/>
      <rect x="66"  y="0" width="18" height="18" rx="3" fill="#2ecc71"/>
      <rect x="88"  y="0" width="18" height="18" rx="3" fill="#1abc9c"/>
      <rect x="110" y="0" width="18" height="18" rx="3" fill="#3498db"/>
      <rect x="132" y="0" width="18" height="18" rx="3" fill="#9b59b6"/>
      <rect x="154" y="0" width="18" height="18" rx="3" fill="#34495e"/>
      <rect x="176" y="0" width="18" height="18" rx="3" fill="#e84393"/>
      <rect x="198" y="0" width="18" height="18" rx="3" fill="#fd79a8"/>
      <rect x="220" y="0" width="18" height="18" rx="3" fill="#00cec9"/>
      <rect x="242" y="0" width="18" height="18" rx="3" fill="#6c5ce7"/>
    </g>
    <!-- Row 2 -->
    <g transform="translate(0 22)">
      <rect x="0"   y="0" width="18" height="18" rx="3" fill="#c0392b"/>
      <rect x="22"  y="0" width="18" height="18" rx="3" fill="#d35400"/>
      <rect x="44"  y="0" width="18" height="18" rx="3" fill="#f39c12"/>
      <rect x="66"  y="0" width="18" height="18" rx="3" fill="#27ae60"/>
      <rect x="88"  y="0" width="18" height="18" rx="3" fill="#16a085"/>
      <rect x="110" y="0" width="18" height="18" rx="3" fill="#2980b9"/>
      <rect x="132" y="0" width="18" height="18" rx="3" fill="#8e44ad"/>
      <rect x="154" y="0" width="18" height="18" rx="3" fill="#2c3e50"/>
      <rect x="176" y="0" width="18" height="18" rx="3" fill="#d63031"/>
      <rect x="198" y="0" width="18" height="18" rx="3" fill="#e17055"/>
      <rect x="220" y="0" width="18" height="18" rx="3" fill="#0984e3"/>
      <rect x="242" y="0" width="18" height="18" rx="3" fill="#a29bfe"/>
    </g>
    <!-- Row 3 -->
    <g transform="translate(0 44)">
      <rect x="0"   y="0" width="18" height="18" rx="3" fill="#ffffff"/>
      <rect x="22"  y="0" width="18" height="18" rx="3" fill="#dfe6e9"/>
      <rect x="44"  y="0" width="18" height="18" rx="3" fill="#b2bec3"/>
      <rect x="66"  y="0" width="18" height="18" rx="3" fill="#636e72"/>
      <rect x="88"  y="0" width="18" height="18" rx="3" fill="#2d3436"/>
      <rect x="110" y="0" width="18" height="18" rx="3" fill="#111111"/>
      <rect x="132" y="0" width="18" height="18" rx="3" fill="#ff7675"/>
      <rect x="154" y="0" width="18" height="18" rx="3" fill="#fab1a0"/>
      <rect x="176" y="0" width="18" height="18" rx="3" fill="#55efc4"/>
      <rect x="198" y="0" width="18" height="18" rx="3" fill="#74b9ff"/>
      <rect x="220" y="0" width="18" height="18" rx="3" fill="#ffeaa7"/>
      <rect x="242" y="0" width="18" height="18" rx="3" fill="#fdcb6e"/>
    </g>
  </g>

  <!-- Footer -->
  <text class="lbl" x="400" y="726" text-anchor="middle" font-size="13" opacity="0.7">WHOLESALE FOR EVERYONE &#8226; CUSTOM PRINT BANDANA</text>
</svg>`;
}

function DesignHerePlaceholderImpl({
  color,
  className = 'h-full w-full',
}: {
  color: string;
  /** Accepted for call-site compatibility; the store template has no size labels. */
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{__html: buildSvg(color)}}
    />
  );
}

export const DesignHerePlaceholder = memo(DesignHerePlaceholderImpl);
