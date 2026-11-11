import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => null, default: () => null }));
vi.mock('@/components/rivals/RivalPingButton', () => ({ RivalPingButton: () => null }));
vi.mock('@/components/records/RecordHolderCrown', () => ({
  RecordHolderCrown: ({ userId }: { userId?: string | null }) => <i data-testid="crown" data-user={userId ?? ''} />,
}));

import { RivalCard } from '@/components/rivals/RivalCard';
import { MpStandingRowItem } from '@/components/multiplayer/results/MpStandingRow';

describe('record holder crown beside names', () => {
  it('rival card passes the rival id', () => {
    render(<RivalCard mode="daily" rival={{ kind: 'daily', userId: 'r1', name: 'Rina' }} />);
    expect(screen.getByTestId('crown')).toHaveAttribute('data-user', 'r1');
  });

  it('MP standing row passes the signed-in player id', () => {
    render(
      <ul>
        <MpStandingRowItem
          row={{ username: 'Bea', userId: 'u9', isMe: false, rank: 1, score: 10, seriesTotal: null, seriesDelta: 0 }}
          shown
          layout="list"
          t={(k: string) => k}
        />
      </ul>,
    );
    expect(screen.getByTestId('crown')).toHaveAttribute('data-user', 'u9');
  });

  it('MP guests and bots get no crown', () => {
    render(
      <ul>
        <MpStandingRowItem
          row={{ username: 'Bot', isBot: true, isMe: false, rank: 2, score: 5, seriesTotal: null, seriesDelta: 0 }}
          shown
          layout="list"
          t={(k: string) => k}
        />
      </ul>,
    );
    expect(screen.queryByTestId('crown')).toBeNull();
  });
});
