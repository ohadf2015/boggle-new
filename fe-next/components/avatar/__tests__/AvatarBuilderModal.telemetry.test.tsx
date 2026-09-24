import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'AdaptiveMotionMock';
  const proxy = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresenceMock';
  return { AdaptiveMotion: proxy, AdaptiveAnimatePresence: AnimatePresence };
});
vi.mock('../AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));
vi.mock('../PartPreview', () => ({ __esModule: true, default: () => <div data-testid="part-preview" /> }));
vi.mock('../LobbyAvatarRewardButton', () => ({ LobbyAvatarRewardButton: () => <div /> }));

import AvatarBuilderModal from '../AvatarBuilderModal';

const events = (name: string) => track.mock.calls.filter(([e]) => e === name);

describe('AvatarBuilderModal — telemetry (no UI change)', () => {
  const props = { onClose: vi.fn(), onSave: vi.fn(), premium: null as null, initialConfig: DEFAULT_AVATAR_CONFIG };

  beforeEach(() => track.mockClear());

  it('fires avatar_editor_opened once per open, with a source', () => {
    // Given a closed builder
    const { rerender } = render(<AvatarBuilderModal {...props} isOpen={false} />);
    expect(events('avatar_editor_opened')).toHaveLength(0);
    // When it opens (and re-renders while open)
    rerender(<AvatarBuilderModal {...props} isOpen />);
    rerender(<AvatarBuilderModal {...props} isOpen />);
    // Then exactly one open event with a string source
    expect(events('avatar_editor_opened')).toHaveLength(1);
    expect(events('avatar_editor_opened')[0][1]).toEqual({ source: expect.any(String) });
    // When closed and reopened → a second open event
    rerender(<AvatarBuilderModal {...props} isOpen={false} />);
    rerender(<AvatarBuilderModal {...props} isOpen />);
    expect(events('avatar_editor_opened')).toHaveLength(2);
  });

  it('fires avatar_part_changed when the player picks a part', () => {
    render(<AvatarBuilderModal {...props} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: 'square' }));
    expect(events('avatar_part_changed')).toEqual([['avatar_part_changed', { category: 'base', rarity: 'common' }]]);
  });

  it('fires avatar_saved with changedCount + rarityMax on save', () => {
    render(<AvatarBuilderModal {...props} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: 'square' }));
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    expect(events('avatar_saved')).toEqual([['avatar_saved', { changedCount: 1, rarityMax: 'common' }]]);
    expect(props.onSave).toHaveBeenCalledWith({ ...DEFAULT_AVATAR_CONFIG, base: 'square' });
  });

  it('counts the real change when the caller passes a fresh (equal) config object every render', () => {
    // Given the profile page's pattern: a new object with the same content on each render
    const { rerender } = render(<AvatarBuilderModal {...props} initialConfig={{ ...DEFAULT_AVATAR_CONFIG }} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: 'square' }));
    rerender(<AvatarBuilderModal {...props} initialConfig={{ ...DEFAULT_AVATAR_CONFIG }} isOpen />);
    // When saved
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    // Then the edit survived the re-render and the event counts it
    expect(events('avatar_saved')).toEqual([['avatar_saved', { changedCount: 1, rarityMax: 'common' }]]);
  });
});
