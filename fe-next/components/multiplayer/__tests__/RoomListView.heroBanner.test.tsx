/**
 * @jest-environment jsdom
 *
 * Hero banner image must not clip on desktop. Source art is ~16:9 (1600x893).
 * Prior `lg:aspect-[64/15]` cropped ~58% of vertical, anchored at y=60%,
 * hiding the "ARENA HUB" title and top floating tiles.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import RoomListView from '../RoomListView';
import type { ActiveRoom } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('framer-motion', () => {
  const proxy = new Proxy({}, {
    get: (_t, prop) => {
      const C = React.forwardRef(function M(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
        const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
        const Tag = prop as unknown as React.ElementType;
        return React.createElement(Tag, { ...rest, ref });
      });
      return C;
    },
  });
  return { m: proxy, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { pullDistance: 0, isRefreshing: false } }),
}));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/LandscapeIndicator', () => ({ default: () => null }));
vi.mock('@/components/HowToPlay', () => ({ default: () => null }));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: vi.fn(),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));

const rooms: ActiveRoom[] = [];
const props = {
  activeRooms: rooms,
  roomsLoading: false,
  onRefreshRooms: vi.fn(),
  onRoomClick: vi.fn(),
  onCreateRoom: vi.fn(),
  onQuickPlay: vi.fn(),
  isQuickPlayLoading: false,
};

describe('RoomListView hero banner — no clip, no shrink', () => {
  it('uses object-cover (no contain) since container aspect now matches source aspect', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    expect(img.className).toMatch(/object-cover/);
    expect(img.className).not.toMatch(/lg:object-contain/);
  });

  it('frame aspect matches source art aspect (16/9) at sm+ to avoid letterbox waste', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/sm:aspect-\[16\/9\]/);
    expect(frame.className).not.toMatch(/sm:aspect-\[21\/9\]/);
    expect(frame.className).not.toMatch(/lg:aspect-\[64\/15\]/);
  });

  it('caps max-width on desktop so the hero does not sprawl full-bleed', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/lg:max-w-\[720px\]/);
    expect(frame.className).toMatch(/mx-auto/);
  });

  it('shrinks proportionally (not via fixed 140px height) on desktop-medium-short laptops', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/desktop-medium-short:lg:max-w-\[/);
    expect(frame.className).not.toMatch(/desktop-medium-short:lg:h-\[140px\]/);
  });

  // Regression: on medium-short laptops (max-height ≤ 850) the frame had
  // `medium-short:h-[100px]`, which on desktop both matched alongside
  // `sm:aspect-[16/9]` and *won* the cascade — squashing the 16:9 art into a
  // 5.2:1 strip (520×100), cropping the "ARENA HUB" title + mascot heads.
  // The fixed pixel heights must be scoped to phones (max-sm) only so that
  // sm+ is always governed by the aspect ratio.
  it('never pins a fixed pixel height at sm+ (would override the 16/9 aspect)', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    // the squash culprits must be gone
    expect(frame.className).not.toMatch(/medium-short:h-\[/);
    expect(frame.className).not.toMatch(/(^|\s)sm:h-\[/);
    expect(frame.className).not.toMatch(/(^|\s)h-\[100px\]/);
  });

  it('scopes the compact phone fallback heights to phones only (no desktop leak)', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/max-sm:h-\[140px\]/);
    // short-height refinement is gated to phones via the `phone-short` combined
    // variant (<640px AND <600px) so it can't squash short desktops.
    expect(frame.className).toMatch(/phone-short:h-\[70px\]/);
  });

  it('does not anchor object-position at y=60% (which hid the ARENA HUB title)', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    expect(img.className).not.toMatch(/object-\[center_60%\]/);
  });

  it('paints the frame with neo-navy so any mobile-cover crop bands blend with the art', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/bg-neo-navy/);
  });
});

// LCP regression guard. The hero <Image> is the route's LCP element (priority,
// SSR'd, loads ~561ms). A prior `initial={{ opacity: 0, y: -8 }}` entrance tween
// kept it at opacity:0 in the SSR HTML — and LCP excludes opacity:0 elements — so
// the hero wasn't LCP-eligible until React hydrated and ran the fade (~1712ms),
// adding ~1.1s of pure render-delay. The hero must appear statically (no opacity:0
// start) so it paints as soon as it decodes. See memory perf-render-delay-root-cause.
describe('RoomListView hero entrance must not gate LCP', () => {
  it('hero motion wrapper does not start the LCP image hidden (no opacity:0 initial)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../RoomListView.tsx'), 'utf8');
    const heroIdx = src.indexOf('arena-hub-hero.jpg');
    expect(heroIdx).toBeGreaterThan(-1);
    // Walk back to the enclosing <m.div ...> that wraps the hero image and inspect
    // its `initial` prop — it must not set opacity:0 (which delays LCP to hydration).
    const before = src.slice(Math.max(0, heroIdx - 800), heroIdx);
    const mDivStart = before.lastIndexOf('<m.div');
    expect(mDivStart).toBeGreaterThan(-1);
    const heroWrapper = before.slice(mDivStart);
    expect(heroWrapper).not.toMatch(/initial=\{[^}]*opacity:\s*0/);
  });

  it('open-arenas room list (main above-fold content) does not start hidden', () => {
    const src = fs.readFileSync(path.join(__dirname, '../RoomListView.tsx'), 'utf8');
    const secIdx = src.indexOf('<m.section');
    expect(secIdx).toBeGreaterThan(-1);
    // the opening <m.section ...> tag up to its first '>'
    const tag = src.slice(secIdx, src.indexOf('>', secIdx));
    expect(tag).not.toMatch(/initial=\{[^}]*opacity:\s*0/);
  });
});
