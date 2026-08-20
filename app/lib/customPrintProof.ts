/* -------------------------------------------------------------------------- */
/* Proof pipeline (client-only) — rasterize the live preview SVG to a PNG and  */
/* upload it to Shopify Files. Called from the wizard's proof effect; the      */
/* function bodies touch browser APIs (document/Image/canvas) so only ever run */
/* in the browser.                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Downscale a raster data URL to fit within `maxDim` px on its longest side.
 * Used for the on-screen preview + proof so the wizard never renders/rasterizes
 * a full-resolution image — which the SVG re-samples up to 9–36× PER FRAME while
 * scaling/rotating/tiling, causing mobile lag/OOM. The preview only displays at
 * ~400px and the proof rasterizes at 600px, so ~800px is ample and keeps the
 * paint cost tiny. The ORIGINAL data URL is kept separately for the print
 * upload, so print quality is unchanged.
 *
 * `mime` should be 'image/png' for artwork with transparency (logos) and
 * 'image/jpeg' for photos — JPEG keeps the in-memory string far smaller.
 * Returns the input unchanged if it's already within `maxDim`, or on any error.
 */
export function downscaleDataUrl(
  dataUrl: string,
  maxDim = 800,
  mime: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      if (!longest || longest <= maxDim) return resolve(dataUrl);
      const scale = maxDim / longest;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL(mime, quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** POST a data URL to the upload route → Shopify Files CDN URL (null on fail). */
export async function uploadImage(
  dataUrl: string,
  filename: string,
): Promise<string | null> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({dataUrl, filename}),
    });
    const json = (await res.json()) as {url?: string};
    return json.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Rasterize the live preview SVG to a PNG data URL (the composite proof).
 * For the triangle the proof stays transparent outside the fold (clipped to
 * the right-triangle) so it reads as a triangle, not a white square; the
 * square keeps an opaque white backing.
 */
export function svgToPng(
  svg: SVGSVGElement,
  size = 600,
  triangle = false,
): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  // The on-screen white overflow-mask must not bake into the PNG — the raster
  // clips to the triangle itself, so drop the mask to avoid a white seam.
  if (triangle) {
    clone
      .querySelectorAll('[data-tri-mask]')
      .forEach((el) => el.remove());
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas context'));
      // Square: opaque white backing. Triangle: leave the canvas transparent.
      if (!triangle) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }
      ctx.drawImage(img, 0, 0, size, size);
      if (triangle) {
        // Keep only the right-triangle fold (top-left → bottom-left →
        // bottom-right); everything outside becomes transparent.
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(size, size);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('svg render failed'));
    img.src = src;
  });
}
