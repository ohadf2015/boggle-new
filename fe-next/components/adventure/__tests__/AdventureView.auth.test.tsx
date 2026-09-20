import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const auth = { isAuthenticated: false, loading: true, user: null as null | { id: string } };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => () => {} }));
vi.mock('@/hooks/useAdventureInventory', () => ({ useAdventureInventory: () => ({ inventory: [], refresh: vi.fn() }) }));
vi.mock('@/hooks/useAdventureAchievements', () => ({ useAdventureAchievements: () => ({ earnAchievement: vi.fn() }) }));
vi.mock('../play/useAdventureProgress', () => ({
  useAdventureProgress: () => ({ completions: [], state: 'ready', refresh: vi.fn() }),
}));
vi.mock('../WorldMap', () => ({ default: () => <div data-testid="world-map" /> }));
vi.mock('../LevelGrid', () => ({ default: () => null }));
vi.mock('../CollectionPanel', () => ({ default: () => null }));
vi.mock('../play/AdventureLevel', () => ({ default: () => null }));
vi.mock('../play/SkinVault', () => ({ default: () => null }));
vi.mock('../play/run/RunBanner', () => ({ default: () => null }));

import AdventureView from '../AdventureView';

describe('AdventureView auth gate', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.loading = true;
    auth.user = null;
  });

  it('given auth is still resolving, when it renders, then it shows a loader and NOT the sign-in wall', () => {
    render(<AdventureView />);
    expect(screen.queryByText('adventurePlay.signInRequired')).toBeNull();
    expect(screen.getByTestId('adventure-auth-pending')).toBeTruthy();
  });

  it('given auth resolved signed-out, when it renders, then it shows the sign-in wall', () => {
    auth.loading = false;
    render(<AdventureView />);
    expect(screen.getByText('adventurePlay.signInRequired')).toBeTruthy();
  });

  it('given a session user whose profile row has not arrived, when it renders, then it shows the map, not the wall', () => {
    auth.loading = false;
    auth.user = { id: 'u1' };
    render(<AdventureView />);
    expect(screen.getByTestId('world-map')).toBeTruthy();
  });
});
