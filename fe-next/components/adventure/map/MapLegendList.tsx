'use client';

/**
 * The node vocabulary as a list. Shared by the phone's bottom sheet and the
 * wide-screen goal rail, so the two can never drift apart.
 */
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { KIND_STYLE, LEGEND_KINDS } from './mapKinds';
import { cn } from '@/lib/utils';

export default function MapLegendList({ columns = 2 }: { columns?: 1 | 2 }) {
  const { t } = useLanguageSafe();
  return (
    <ul className={cn('grid gap-2', columns === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {LEGEND_KINDS.map((kind) => {
        const style = KIND_STYLE[kind];
        const Icon = style.icon;
        return (
          <li key={kind} className="flex items-center gap-2">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-[3px] border-black ${style.fill} shadow-[2px_2px_0_#000]`}>
              <Icon className="w-5 h-5 text-black" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-sm font-bold">{t(style.labelKey)}</span>
          </li>
        );
      })}
    </ul>
  );
}
