import { ProBadge } from '@/components/ui/ProBadge';

/** The Teacher Pro marker on a round-end control, so a free teacher knows before the tap. */
export function ProPill({ label, className }: { label: string; className?: string }) {
  return <ProBadge data-testid="pro-pill" label={label} size="sm" className={className} />;
}

export default ProPill;
