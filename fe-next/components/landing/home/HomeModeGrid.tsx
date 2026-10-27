'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Coffee, FlaskConical, Compass, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CUBE_BLUR_DATA_URL, groupModes, type ModeCubeModel, type ModeGroup } from '@/lib/landing/modeMeta';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';
import { ModeTile, type TileVariant } from './ModeTile';
import styles from './HomeModeGrid.module.css';

interface GroupStyle {
  /** literal i18n key so key guards see it */
  titleKey: string;
  Icon: LucideIcon;
  /** mascot badge; preview has none */
  art?: string;
  border: string;
  tile: TileVariant;
  grid: string;
}

const GROUP: Record<ModeGroup, GroupStyle> = {
  together: { titleKey: 'landing.home.groupTogether', Icon: Users, art: '/modes/groups/together.png', border: 'border-neo-pink', tile: 'banner', grid: 'grid grid-cols-1' },
  solo: { titleKey: 'landing.home.groupSolo', Icon: Compass, art: '/modes/groups/solo.png', border: 'border-neo-lime', tile: 'poster', grid: 'grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:gap-4' },
  think: { titleKey: 'landing.home.groupThink', Icon: Coffee, art: '/modes/groups/think.png', border: 'border-neo-cyan', tile: 'row', grid: 'grid grid-cols-1 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] md:gap-4' },
  preview: { titleKey: 'landing.home.groupPreview', Icon: FlaskConical, border: 'border-neo-purple', tile: 'row', grid: 'grid grid-cols-1 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] md:gap-4' },
};

function GroupBadge({ group, index }: { group: ModeGroup; index: number }) {
  const { art, Icon, border } = GROUP[group];
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn('relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-neo border-2 bg-neo-navy md:h-14 md:w-14', border)}>
      {art && !failed ? (
        <Image
          src={art}
          alt=""
          fill
          sizes="56px"
          placeholder="blur"
          blurDataURL={CUBE_BLUR_DATA_URL}
          onError={() => setFailed(true)}
          style={{ '--i': index } as React.CSSProperties}
          className={cn('object-cover', styles.art)}
        />
      ) : (
        <Icon className="h-5 w-5 text-neo-cream" strokeWidth={2.5} aria-hidden="true" />
      )}
    </span>
  );
}

interface HomeModeGridProps {
  /** every mode the viewer can see, in ranked order; the grid sorts them into groups */
  models: ModeCubeModel[];
  liveCount: number;
}

export function HomeModeGrid({ models, liveCount }: HomeModeGridProps) {
  const { t } = useLanguage();
  let index = 0;

  return (
    <section aria-labelledby="home-modes-title" className="flex flex-col gap-6 md:gap-9">
      <h2 id="home-modes-title" className="sr-only">
        {t('landing.home.gameModes')}
      </h2>

      {groupModes(models).map(({ group, models: groupModels }) => {
        const g = GROUP[group];
        const headingId = `home-group-${group}-title`;
        const first = index;
        index += groupModels.length;
        return (
          <section key={group} data-testid={`home-group-${group}`} aria-labelledby={headingId} className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <GroupBadge group={group} index={first} />
              <h3 id={headingId} className="font-neo-poster text-xl font-extrabold text-neo-cream md:text-3xl">
                {t(g.titleKey)}
              </h3>
              <span aria-hidden="true" className={cn('h-[3px] flex-1 rounded-full bg-neo-cream/20', styles.rule)} />
              {group === 'together' && liveCount > 0 && (
                <span data-testid="home-live-count" className="inline-flex items-center gap-1.5 font-neo-display text-xs font-bold text-neo-lime md:text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-65 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-lime" />
                  </span>
                  {formatLiveShort(liveCount)} {t('landing.home.online')}
                </span>
              )}
            </div>
            <div className={g.grid} data-testid={group === 'solo' ? 'home-mode-tiles' : undefined}>
              {groupModels.map((m, i) => (
                <ModeTile key={m.key} model={m} index={first + i} slot={i} variant={m.role === 'anchor' ? 'banner' : g.tile} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
