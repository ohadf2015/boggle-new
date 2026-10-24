/**
 * Fire-and-forget server twin for a Teacher Pro CTA tap (see
 * app/api/education/pro-cta-click). `keepalive` lets it finish while the
 * link navigates away. Never throws.
 */
export function reportProCtaClick(args: { placement: string; locale: string; cta: string }): void {
  try {
    if (typeof fetch !== 'function') return;
    void fetch('/api/education/pro-cta-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    /* analytics must never block */
  }
}
