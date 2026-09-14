import {memo} from 'react';

/**
 * Triangle "YOUR DESIGN HERE" bandana mock — the marketing-style placeholder for
 * the triangle print step, mirroring the square DesignHerePlaceholder's role AND
 * behaviour: the bandana body follows the shopper's chosen fabric colour (a soft
 * radial derived from it), and the stitch frame / spec text / footer auto-contrast
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
  // touch darker at the edges, so the triangle reads as fabric, not a flat fill.
  const toWhite = (c: number, t: number) => Math.round(c + (255 - c) * t);
  const toBlack = (c: number, t: number) => Math.round(c * (1 - t));
  const rgb = (fn: (c: number, t: number) => number, t: number) =>
    `rgb(${fn(r, t)},${fn(g, t)},${fn(b, t)})`;
  const cCenter = rgb(toWhite, 0.14);
  const cEdge = rgb(toBlack, 0.16);

  // Contrast-aware accents (stitching, spec text, footer, divider dot).
  const stitch = dark ? 'rgba(255,255,255,0.9)' : 'rgba(16,20,16,0.5)';
  const lbl = dark ? '#ffffff' : '#101410';

  return `<svg viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Triangle custom print bandana - your design here">
  <defs>
    <radialGradient id="bgT" cx="50%" cy="38%" r="82%">
      <stop offset="0%" stop-color="${cCenter}"/>
      <stop offset="70%" stop-color="${safe}"/>
      <stop offset="100%" stop-color="${cEdge}"/>
    </radialGradient>
    <style>
      .lblT{font-family:Arial,Helvetica,sans-serif;font-weight:700;fill:${lbl};letter-spacing:2px;}
      .wordT{font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-weight:900;fill:#fff;
             paint-order:stroke;stroke:#15121f;stroke-width:4px;stroke-linejoin:round;}
    </style>
  </defs>

  <!-- Bandana body (triangle) -->
  <polygon points="18,180 782,180 400,700" fill="url(#bgT)"/>

  <!-- Dashed stitch frame (inset triangle) -->
  <polygon points="41,194 759,194 400,672" fill="none"
           stroke="${stitch}" stroke-width="2.5"
           stroke-dasharray="3 9" stroke-linejoin="round"/>
  <!-- Corner brackets — each follows the two edges meeting at that corner -->
  <g fill="none" stroke="${stitch}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M71 194 L41 194 L59 218"/>
    <path d="M729 194 L759 194 L741 218"/>
    <path d="M382 648 L400 672 L418 648"/>
  </g>

  <!-- All inner content, scaled 0.86 toward centre so it clears the edges -->
  <g transform="matrix(0.86,0,0,0.86,56,49)">
  <!-- YOUR -->
  <g transform="rotate(-4 400 250)">
    <rect x="256" y="212" width="288" height="78" rx="13" fill="#000" opacity="0.3" transform="translate(0 10)"/>
    <rect x="256" y="212" width="288" height="78" rx="13" fill="#9aa0a6"/>
    <text class="wordT" x="400" y="273" text-anchor="middle" font-size="62">YOUR</text>
  </g>
  <!-- DESIGN -->
  <g transform="rotate(1.5 400 324)">
    <rect x="228" y="286" width="344" height="78" rx="13" fill="#000" opacity="0.3" transform="translate(0 10)"/>
    <rect x="228" y="286" width="344" height="78" rx="13" fill="#2f9fe0"/>
    <text class="wordT" x="400" y="347" text-anchor="middle" font-size="60">DESIGN</text>
  </g>
  <!-- HERE -->
  <g transform="rotate(-2.5 400 396)">
    <rect x="300" y="360" width="200" height="72" rx="13" fill="#000" opacity="0.3" transform="translate(0 10)"/>
    <rect x="300" y="360" width="200" height="72" rx="13" fill="#17181c"/>
    <text class="wordT" x="400" y="416" text-anchor="middle" font-size="56">HERE</text>
  </g>

  <!-- Divider dot -->
  <circle cx="400" cy="440" r="4" fill="${stitch}"/>

  <!-- Specs (sized to fit the triangle width at this height) -->
  <text class="lblT" x="400" y="464" text-anchor="middle" font-size="15" letter-spacing="2">ANY COLOR &#8226; DIGITALLY PRINTED</text>
  <text class="lblT" x="400" y="486" text-anchor="middle" font-size="14" letter-spacing="1.5">100% COTTON</text>

  <!-- Color swatch strip (10 x 3, centered, fits within the taper) -->
  <g transform="translate(319 504)">
    <rect x="-8" y="-8" width="163" height="60" rx="9" fill="${
      dark ? '#ffffff' : '#101410'
    }" opacity="0.14"/>
    <g>
      <rect x="0"   y="0" width="12" height="12" rx="2" fill="#e74c3c"/>
      <rect x="15"  y="0" width="12" height="12" rx="2" fill="#e67e22"/>
      <rect x="30"  y="0" width="12" height="12" rx="2" fill="#f1c40f"/>
      <rect x="45"  y="0" width="12" height="12" rx="2" fill="#2ecc71"/>
      <rect x="60"  y="0" width="12" height="12" rx="2" fill="#1abc9c"/>
      <rect x="75"  y="0" width="12" height="12" rx="2" fill="#3498db"/>
      <rect x="90"  y="0" width="12" height="12" rx="2" fill="#9b59b6"/>
      <rect x="105" y="0" width="12" height="12" rx="2" fill="#e84393"/>
      <rect x="120" y="0" width="12" height="12" rx="2" fill="#00cec9"/>
      <rect x="135" y="0" width="12" height="12" rx="2" fill="#6c5ce7"/>
    </g>
    <g transform="translate(0 15)">
      <rect x="0"   y="0" width="12" height="12" rx="2" fill="#c0392b"/>
      <rect x="15"  y="0" width="12" height="12" rx="2" fill="#d35400"/>
      <rect x="30"  y="0" width="12" height="12" rx="2" fill="#f39c12"/>
      <rect x="45"  y="0" width="12" height="12" rx="2" fill="#27ae60"/>
      <rect x="60"  y="0" width="12" height="12" rx="2" fill="#16a085"/>
      <rect x="75"  y="0" width="12" height="12" rx="2" fill="#2980b9"/>
      <rect x="90"  y="0" width="12" height="12" rx="2" fill="#8e44ad"/>
      <rect x="105" y="0" width="12" height="12" rx="2" fill="#d63031"/>
      <rect x="120" y="0" width="12" height="12" rx="2" fill="#0984e3"/>
      <rect x="135" y="0" width="12" height="12" rx="2" fill="#a29bfe"/>
    </g>
    <g transform="translate(0 30)">
      <rect x="0"   y="0" width="12" height="12" rx="2" fill="#ffffff"/>
      <rect x="15"  y="0" width="12" height="12" rx="2" fill="#b2bec3"/>
      <rect x="30"  y="0" width="12" height="12" rx="2" fill="#636e72"/>
      <rect x="45"  y="0" width="12" height="12" rx="2" fill="#2d3436"/>
      <rect x="60"  y="0" width="12" height="12" rx="2" fill="#111111"/>
      <rect x="75"  y="0" width="12" height="12" rx="2" fill="#ff7675"/>
      <rect x="90"  y="0" width="12" height="12" rx="2" fill="#55efc4"/>
      <rect x="105" y="0" width="12" height="12" rx="2" fill="#74b9ff"/>
      <rect x="120" y="0" width="12" height="12" rx="2" fill="#ffeaa7"/>
      <rect x="135" y="0" width="12" height="12" rx="2" fill="#fdcb6e"/>
    </g>
  </g>

  <!-- Footer -->
  <text class="lblT" x="400" y="580" text-anchor="middle" font-size="10" letter-spacing="2" opacity="0.65">WHOLESALE FOR EVERYONE</text>
  </g>
</svg>`;
}

function TriangleDesignHereImpl({
  color,
  className = 'h-full w-full',
}: {
  color: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{__html: buildSvg(color)}}
    />
  );
}

export const TriangleDesignHere = memo(TriangleDesignHereImpl);
