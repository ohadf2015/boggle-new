import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// Strip framer-motion-only props so the passthrough renders clean DOM.
const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
  'whileTap', 'whileInView', 'layout', 'layoutId', 'drag', 'onAnimationComplete',
]);
function strip(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(props)) if (!MOTION_PROPS.has(k)) out[k] = props[k];
  return out;
}

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode }) =>
          React.createElement(tag, strip(props as Record<string, unknown>), children),
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  useReducedMotion: () => true,
}));

// Avatar loads AvatarRenderer through next/dynamic (Avatar.tsx:21), and a dynamic import resolves a
// tick AFTER a synchronous render — so the tree held no [data-mood] node at all and this assertion
// ran against an empty list no matter what the podium did. The only dynamic component under this
// tree is that renderer, so standing in for next/dynamic with a synchronous stub carrying the same
// data-mood contract (AvatarRenderer.tsx:137) makes the test measure what it claims: which slot
// gets 'win'.
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => ({ mood }: { mood?: string }) =>
    React.createElement('div', { 'data-mood': mood ?? 'idle' }),
}));

// Friend badge needs auth/lang context we don't care about here.
vi.mock('@/components/results/ResultsFriendStatus', () => ({
  AddFriendBadge: () => null,
}));

import ResultsPodium from '@/components/results/ResultsPodium';
import type { PlayerScore } from '@/hooks/useResultsData';

const players = [
  { username: 'Winner', score: 300 },
  { username: 'Second', score: 200 },
  { username: 'Third', score: 100 },
] as unknown as PlayerScore[];

const t = (k: string) => k;

describe('ResultsPodium — winner avatar mood', () => {
  it("gives ONLY the first-place avatar a 'win' mood", () => {
    const { container } = render(<ResultsPodium players={players} t={t} />);
    const moods = Array.from(container.querySelectorAll('[data-mood]')).map((el) =>
      el.getAttribute('data-mood'),
    );
    expect(moods).toContain('win');
    expect(moods.filter((m) => m === 'win')).toHaveLength(1);
    // The other podium avatars stay neutral (not demoralised on a top-3 podium).
    expect(moods.filter((m) => m === 'lose')).toHaveLength(0);
  });
});
