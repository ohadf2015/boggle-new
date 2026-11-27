import type { ArcadeGameMeta } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';

const POSITION: Partial<Record<ArcadeGameMeta['id'], string>> = {
  oil: 'object-[50%_30%]',
  sufganiyah: 'object-[50%_85%]',
  sleigh: 'object-bottom',
  dreidel: 'object-center',
  snowball: 'object-[50%_70%]',
  wrap: 'object-[50%_40%]',
};

export default function ArcadeBackdrop({ meta }: { meta: ArcadeGameMeta }) {
  const warm = meta.holiday === 'hanukkah';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.bg} alt="" className={cn('absolute inset-0 size-full object-cover', POSITION[meta.id])} />
      <div
        className={cn(
          'absolute inset-0',
          warm
            ? 'bg-[radial-gradient(circle_at_50%_25%,color-mix(in_srgb,var(--neo-holiday-gold)_28%,transparent),transparent_60%)]'
            : 'bg-[radial-gradient(circle_at_50%_15%,color-mix(in_srgb,var(--neo-holiday-snow)_22%,transparent),transparent_55%)]',
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-neo-navy/30 via-neo-navy/10 to-neo-navy/85" />
    </div>
  );
}
