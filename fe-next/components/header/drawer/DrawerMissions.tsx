import Link from 'next/link';
import { Check, Trophy } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

interface Mission {
    type: string;
    titleKey: string;
    completed: boolean;
}

export function DrawerMissions({ missions, completedCount, isGrandSlam, closeMenu }: {
    missions: Mission[];
    completedCount: number;
    isGrandSlam: boolean;
    closeMenu: () => void;
}) {
    const { t, language } = useLanguage();
    const pct = missions.length ? Math.round((completedCount / missions.length) * 100) : 0;

    return (
        <Link
            href={`/${language}/quests`}
            onClick={closeMenu}
            className={cn(
                'block rounded-neo border-2 p-3',
                isGrandSlam ? 'border-neo-lime/60 bg-neo-lime/10' : 'border-neo-white/15 bg-neo-white/[0.04]',
                'hover:border-neo-lime/50 transition-colors duration-100',
            )}
        >
            <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-neo-lime" aria-hidden="true" />
                <span className="flex-1 text-[11px] font-black uppercase tracking-[0.14em] text-neo-white">
                    {t('dailyMissions.title')}
                </span>
                <span className={cn('text-xs font-black tabular-nums', isGrandSlam ? 'text-neo-lime' : 'text-neo-white')}>
                    {completedCount}/{missions.length}
                </span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-neo-white/10" aria-hidden="true">
                <span className="block h-full rounded-full bg-neo-lime" style={{ width: `${pct}%` }} />
            </span>
            <span className="mt-2.5 flex flex-col gap-1.5">
                {missions.map((mission) => (
                    <span key={mission.type} className="flex items-center gap-2">
                        <span className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                            mission.completed ? 'border-neo-lime bg-neo-lime text-neo-black' : 'border-neo-white/30',
                        )}>
                            {mission.completed && <Check size={9} strokeWidth={4} aria-hidden="true" />}
                        </span>
                        <span className={cn(
                            'truncate text-xs font-bold',
                            mission.completed ? 'text-neo-white/60 line-through' : 'text-neo-white',
                        )}>
                            {t(mission.titleKey)}
                        </span>
                    </span>
                ))}
            </span>
        </Link>
    );
}
