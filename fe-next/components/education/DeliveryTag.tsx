'use client';

import { MonitorPlay, MonitorSmartphone, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deliveryKey, type ModeDelivery } from './ClassroomModeCatalogueData';

const ICON = { projector: MonitorPlay, phones: Smartphone, both: MonitorSmartphone } as const;

/** Where a mode is played — one chip shape for Home and the host picker. */
export function DeliveryTag({
  delivery,
  t,
  className,
}: {
  delivery: ModeDelivery;
  t: (key: string) => string;
  className?: string;
}) {
  const Icon = ICON[delivery];
  return (
    <span
      data-testid={`delivery-tag-${delivery}`}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-neo-black/85 px-2 py-0.5',
        'font-neo-body text-[0.68rem] font-bold leading-none text-neo-cream',
        className,
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {t(deliveryKey(delivery))}
    </span>
  );
}

export default DeliveryTag;
