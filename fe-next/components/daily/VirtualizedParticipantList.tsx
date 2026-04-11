'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DailyParticipant } from './DailyLeaderboard';
import ParticipantRow from './DailyLeaderboardParticipantRow';

const ESTIMATED_ROW_HEIGHT = 72;
const VIRTUAL_LIST_MAX_HEIGHT = 600;
const VIRTUAL_OVERSCAN = 3;

const VirtualizedParticipantList: React.FC<{
  participants: DailyParticipant[];
  isCurrentUser: (p: DailyParticipant) => boolean;
  compact: boolean;
  gameType: 'puzzle' | 'wordHunt' | 'wordWheel';
  t: (key: string) => string;
}> = ({ participants, isCurrentUser, compact, gameType, t }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions by design
  const virtualizer = useVirtualizer({
    count: participants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  return (
    <div
      ref={parentRef}
      style={{ maxHeight: VIRTUAL_LIST_MAX_HEIGHT, overflowY: 'auto' }}
      className="rounded-lg"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const participant = participants[virtualRow.index];
          return (
            <div
              key={participant.player_id || participant.guest_fingerprint || virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
            >
              <div className="pb-2">
                <ParticipantRow
                  participant={participant}
                  index={virtualRow.index}
                  isCurrentUser={isCurrentUser(participant)}
                  compact={compact}
                  gameType={gameType}
                  t={t}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedParticipantList;
