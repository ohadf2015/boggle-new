/** Rasterize the stage's avatar SVG to a 512px PNG and download it. */
export function downloadAvatarPng(container: HTMLElement | null, filename = 'my-avatar.png'): void {
  const svgEl = container?.querySelector('svg');
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGElement;
  clone.setAttribute('width', '512');
  clone.setAttribute('height', '512');
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    URL.revokeObjectURL(url);
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
