/**
 * Rasterize a live avatar SVG to PNG so Higgsfield can anchor a glow-up to the
 * user's OWN avatar (passed as the `--image` reference).
 *
 * Design: operate on the already-rendered DOM `<svg>` (the avatar is on screen
 * when the user taps "Glow Up"), not a server-side re-render — this avoids
 * re-instantiating AvatarRenderer's context hooks in a headless environment.
 *
 * `serializeAvatarSvg` is pure and testable; `rasterizeSvgToPngBlob` needs the
 * browser canvas and is guarded for non-browser contexts.
 *
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Serialize a rendered avatar `<svg>` into standalone markup:
 *  - clones (never mutates the live element),
 *  - ensures the SVG xmlns (required for standalone parsing / Image src),
 *  - strips baked `<animate>` so the snapshot is a single static frame.
 */
export function serializeAvatarSvg(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', SVG_NS);
  }

  clone.querySelectorAll('animate, animateTransform, animateMotion').forEach((node) => {
    node.parentNode?.removeChild(node);
  });

  return new XMLSerializer().serializeToString(clone);
}

/** True only in a browser with canvas available. */
function canRasterize(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof Image !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Rasterize serialized SVG markup to a PNG Blob at `size`×`size`.
 * Browser-only — throws in non-browser contexts.
 */
export async function rasterizeSvgToPngBlob(
  svgString: string,
  size = 512,
): Promise<Blob> {
  if (!canRasterize()) {
    throw new Error('rasterizeSvgToPngBlob requires a browser canvas context');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context unavailable');
    ctx.drawImage(img, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load SVG into Image for rasterization'));
    img.src = src;
  });
}

/**
 * Convenience: serialize + rasterize a rendered avatar element to a PNG Blob.
 * Pass the inner `<svg>` (e.g. from `container.querySelector('svg')`).
 */
export async function rasterizeAvatarElement(
  svgEl: SVGSVGElement,
  size = 512,
): Promise<Blob> {
  return rasterizeSvgToPngBlob(serializeAvatarSvg(svgEl), size);
}
