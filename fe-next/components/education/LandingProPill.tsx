import { ProBadge } from '@/components/ui/ProBadge';

/**
 * The one "Pro" mark: the gold-foil crown badge shown on anything a free teacher cannot
 * use, before they click it. Server-safe (no hooks) so server copy and client buttons share it.
 */
export function LandingProPill({ label = 'Pro', className }: { label?: string; className?: string }) {
  return <ProBadge data-testid="pro-pill" label={label} size="sm" className={className} />;
}

export default LandingProPill;
