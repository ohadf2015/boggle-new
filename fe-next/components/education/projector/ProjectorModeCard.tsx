'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Clock, Grid3x3, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LobbyModeSwitcher } from '@/components/education/lobby/LobbyModeSwitcher';
import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { RISE, type Translate } from '@/components/education/live/eduLiveStyles';
import type { LobbyFact, useProjectorLobbyMode } from './useProjectorLobbyMode';

function factIcon(key: LobbyFact['key']) {
  if (key === 'late') return UserPlus;
  return key === 'timer' || key === 'seconds' ? Clock : Grid3x3;
}

interface ProjectorModeCardProps {
  gameCode: string;
  lobby: ReturnType<typeof useProjectorLobbyMode>;
  t: Translate;
  className?: string;
  style?: CSSProperties;
}

/** The game the class is about to play, its settings, and the one control that changes it without a new code. */
export function ProjectorModeCard({ gameCode, lobby, t, className, style }: ProjectorModeCardProps) {
  const entry = catalogueEntry(lobby.modeId);
  return (
    <div
      data-testid="projector-mode"
      style={style}
      className={cn(
        'flex flex-wrap items-center gap-[clamp(0.5rem,1cqw,1.25rem)] self-center rounded-neo-lg border-4 border-neo-black bg-neo-cyan px-[clamp(0.75rem,1.2cqw,1.5rem)] py-[clamp(0.5rem,0.8cqw,1rem)] text-neo-black shadow-hard-lg',
        RISE,
        className
      )}
    >
      {entry?.poster && (
        <Image src={entry.poster} alt="" width={96} height={96} className="size-[clamp(3.5rem,min(4.5cqw,8cqh),7rem)] shrink-0 rounded-neo border-[3px] border-neo-black object-cover" />
      )}
      <div className="min-w-[9rem] flex-1">
        <p className="truncate font-neo-display font-black leading-tight text-[clamp(1.5rem,min(2cqw,3.6cqh),3rem)]">{t(entry?.nameKey ?? 'teacher.classroom.gameModes.classic')}</p>
        <ul className="mt-1 flex flex-wrap gap-x-[0.9em] gap-y-0.5 font-neo-body font-bold text-[clamp(0.875rem,min(1.1cqw,2cqh),1.75rem)]">
          {lobby.facts.map((fact) => {
            const Icon = factIcon(fact.key);
            return (
              <li key={fact.key} className="inline-flex items-center gap-1.5">
                <Icon className="size-[1em] shrink-0" aria-hidden="true" />
                {fact.text}
              </li>
            );
          })}
        </ul>
      </div>
      <LobbyModeSwitcher gameCode={gameCode} currentMode={lobby.modeId} socket={getSharedSocketIfExists()} t={t} onModeApplied={lobby.applyMode} roundSettings={lobby.roundSettings} showName={false} />
    </div>
  );
}
