'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** Holds the name's place while the template is split. Never part of a display name. */
const SLOT = '⁣';

/**
 * "Host: {{name}}" for an arena row and the join ticket. The name truncates in
 * a box of its own direction, so a Latin host in a Hebrew row loses its end
 * ("Cosmic Avoc…"), not its start ("…smic Avocado"). The words around it come
 * from the one hostedBy template, split at the name, whatever the word order.
 */
export function HostedBy({ name, className }: { name: string; className?: string }) {
  const { t } = useLanguage();
  const [before = '', after = ''] = t('mpUi.entry.hostedBy', { name: SLOT }).split(SLOT);
  return (
    <span className={cn('flex min-w-0 items-baseline gap-1 whitespace-nowrap', className)}>
      {before}
      <bdi dir="auto" className="min-w-0 truncate">
        {name}
      </bdi>
      {after}
    </span>
  );
}
