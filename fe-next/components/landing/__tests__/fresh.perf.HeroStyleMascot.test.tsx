/**
 * Piece D (perf): HeroStyleMascot lives in the returning-user tree, which the
 * server renders for EVERY visitor and hides with CSS for fresh ones. A
 * `priority` next/image there emits a high-priority <link rel=preload> and an
 * eager fetch that a fresh visitor pays for but never sees (winner.webp is
 * 148KB). Without priority, next/image loads lazily, and a lazy <img> inside a
 * display:none tree is never fetched.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { HeroStyleMascot } from '../HeroStyleMascot';
import { getStyle, type PlayerStyleKey } from '@/lib/playerStyle/styles';

let styleKey: PlayerStyleKey = 'default';
vi.mock('@/contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ styleKey, style: getStyle(styleKey) }),
}));

let animatedMap: Partial<Record<string, string>> = {};
vi.mock('@/lib/playerStyle/animatedMascots', () => ({
  getAnimatedMascot: (k: string) => animatedMap[k] ?? null,
  ANIMATED_STYLE_MASCOTS: {},
}));

const idleProps: Array<Record<string, unknown>> = [];
vi.mock('@/components/ui/IdleMascot', () => {
  const IdleMascotWithEntrance = (props: Record<string, unknown>) => {
    idleProps.push(props);
    return <div data-testid="animated-mascot" />;
  };
  return { IdleMascotWithEntrance };
});

const imageProps: Array<Record<string, unknown>> = [];
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    imageProps.push(props);
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={String(props.src)} data-testid={String(props['data-testid'] ?? '')} />;
  },
}));

describe('HeroStyleMascot first-load cost (fresh visitor)', () => {
  beforeEach(() => {
    styleKey = 'default';
    animatedMap = {};
    idleProps.length = 0;
    imageProps.length = 0;
  });

  it('shouldNotAskForAPriorityPreloadOfTheDefaultAnimatedMascot', () => {
    // GIVEN the default style (renders the animated winner mascot)
    render(<HeroStyleMascot isMobilePortrait />);
    // THEN it is not a priority / high-fetch-priority image
    const props = idleProps[idleProps.length - 1];
    expect(props).toBeDefined();
    expect(props.priority).toBeFalsy();
    expect(props.fetchPriority).not.toBe('high');
  });

  it('shouldNotPriorityLoadTheStyleMascotImage', () => {
    // GIVEN a genre style with a static PNG
    styleKey = 'arcade';
    render(<HeroStyleMascot isMobilePortrait />);
    const props = imageProps[imageProps.length - 1];
    expect(props).toBeDefined();
    expect(props.priority).toBeFalsy();
    expect(props.fetchPriority).not.toBe('high');
  });
});
