import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const fx = vi.hoisted(() => ({ track: vi.fn(), invalidate: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, a?: unknown, b?: unknown) => {
    const p = typeof a === 'object' ? a : b;
    return p ? `${k}|${JSON.stringify(p)}` : k;
  }, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: fx.invalidate }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: fx.track }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  default: ({ config }: { config: { eyes: string } }) => <div data-testid="avatar" data-eyes={config.eyes} />,
}));
vi.mock('next/dynamic', () => ({
  default: () => (props: { reveal: { source?: string; unlocks: { partId: string }[] } }) => (
    <div data-testid="reveal" data-source={props.reveal.source}>{props.reveal.unlocks[0].partId}</div>
  ),
}));

import ChestPartPrize from '../ChestPartPrize';
import ChestPartOdds from '../ChestPartOdds';
import type { ChestPartDrop } from '@/lib/avatar/chestDrops';

const drop = (over: Partial<ChestPartDrop> = {}): ChestPartDrop => ({
  key: 'eyes:moonEye', category: 'eyes', partId: 'moonEye', rarity: 'epic', duplicate: false, refundCoins: 0, ...over,
});

describe('ChestPartPrize', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the player wearing the new part, with its rarity, and opens the reveal', () => {
    render(<ChestPartPrize drop={drop()} source="day_clear" />);
    expect(screen.getByTestId('avatar').getAttribute('data-eyes')).toBe('moonEye');
    expect(screen.getByTestId('chest-part-prize').getAttribute('data-rarity')).toBe('epic');
    expect(screen.getByText('avatarChest.new')).toBeTruthy();
    expect(fx.invalidate).toHaveBeenCalled();
    expect(screen.queryByTestId('reveal')).toBeNull();
    fireEvent.click(screen.getByTestId('chest-part-see'));
    expect(screen.getByTestId('reveal').getAttribute('data-source')).toBe('chest');
  });

  it('a duplicate shows the coins it paid instead and no wear button', () => {
    render(<ChestPartPrize drop={drop({ duplicate: true, refundCoins: 200 })} source="weekly_gold" />);
    expect(screen.getByTestId('chest-part-duplicate').textContent).toContain('"coins":"200"');
    expect(screen.queryByTestId('chest-part-see')).toBeNull();
    expect(fx.invalidate).not.toHaveBeenCalled();
  });

  it('a fresh legendary opens the full reveal by itself', () => {
    render(<ChestPartPrize drop={drop({ key: 'hair:aurora', category: 'hair', partId: 'aurora', rarity: 'legendary' })} source="weekly_gold" autoReveal />);
    expect(screen.getByTestId('reveal').textContent).toBe('aurora');
  });
});

describe('ChestPartOdds', () => {
  it('states the published odds for the chest', () => {
    render(<ChestPartOdds source="weekly_gold" />);
    const text = screen.getByTestId('chest-part-odds').textContent ?? '';
    expect(text).toContain('15%');
    expect(text).toContain('55%');
    expect(text).toContain('30%');
  });
});
