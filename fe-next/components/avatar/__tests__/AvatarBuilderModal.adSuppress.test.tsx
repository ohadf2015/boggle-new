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


/**
 * The bottom banner ad (native AdMob SurfaceView, or the web AdSense anchor) painted over the
 * builder's Save/Cancel row. The builder is a custom portal, not the shared DialogContent, so it
 * never raised html.modal-open — the one signal BannerCoordinatorMount and the web anchor CSS use
 * to stand the banner down.
 */
describe('AvatarBuilderModal — stands the bottom ad down while open', () => {
  const props = { onClose: vi.fn(), onSave: vi.fn(), premium: null as null, initialConfig: DEFAULT_AVATAR_CONFIG };
  afterEach(() => document.documentElement.classList.remove('modal-open'));

  it('GIVEN the builder opens THEN html.modal-open is set, and WHEN it closes THEN it is cleared', () => {
    const { rerender, unmount } = render(<AvatarBuilderModal {...props} isOpen={false} />);
    expect(document.documentElement.classList.contains('modal-open')).toBe(false);
    rerender(<AvatarBuilderModal {...props} isOpen />);
    expect(document.documentElement.classList.contains('modal-open')).toBe(true);
    rerender(<AvatarBuilderModal {...props} isOpen={false} />);
    expect(document.documentElement.classList.contains('modal-open')).toBe(false);
    rerender(<AvatarBuilderModal {...props} isOpen />);
    unmount();
    expect(document.documentElement.classList.contains('modal-open')).toBe(false);
  });

  it('the web anchor ad is hidden by CSS while any modal is open', async () => {
    const fs = await import('node:fs');
    const css = fs.readFileSync(require('node:path').join(__dirname, '../../../app/globals.css'), 'utf8');
    expect(css).toMatch(/html\.modal-open\s+ins\.adsbygoogle-noablate/);
  });
});
