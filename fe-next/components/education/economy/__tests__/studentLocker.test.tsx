import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
const locker = { items: [] as Array<Record<string, unknown>> };
vi.mock('../useChestLocker', () => ({ useChestLocker: () => ({ items: locker.items, refresh: vi.fn() }) }));
vi.mock('../useStudentAvatar', () => ({ useStudentAvatar: () => DEFAULT_AVATAR_CONFIG }));

import StudentLocker from '../StudentLocker';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

afterEach(() => {
  cleanup();
  locker.items = [];
});

describe('StudentLocker', () => {
  it('Given no chests yet, Then the locker stays out of the hub', () => {
    render(<StudentLocker />);
    expect(screen.queryByTestId('student-locker')).toBeNull();
  });

  it('Given collected chests, When opened, Then each item is listed with its rarity', () => {
    locker.items = [
      { gameCode: 'ABC', roundId: '3', rarity: 'epic', xp: 60, itemId: 'tile-neon', createdAt: 'x' },
      { gameCode: 'ABC', roundId: '4', rarity: 'common', xp: 10, itemId: 'frame-none', createdAt: 'y' },
    ];
    render(<StudentLocker />);
    expect(screen.getByTestId('student-locker').textContent).toContain('2');
    fireEvent.click(screen.getByTestId('student-locker'));
    expect(screen.getByText('economy.locker.title')).toBeTruthy();
    expect(screen.getByText('economy.chest.rarity.epic')).toBeTruthy();
  });

  it('Given a named part chest item, When opened, Then the part name is listed', () => {
    locker.items = [{ gameCode: 'ABC', roundId: '5', rarity: 'rare', xp: 25, itemId: 'accessory:cowboyHat', createdAt: 'z' }];
    render(<StudentLocker />);
    fireEvent.click(screen.getByTestId('student-locker'));
    expect(screen.getByText('revealUnlock.parts.cowboyHat')).toBeTruthy();
  });
});
