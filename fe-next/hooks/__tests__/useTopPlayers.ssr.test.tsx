// @vitest-environment node
/**
 * Regression: the module-level cache lives for the whole server process, so once
 * any request seeded it, later SSR renders painted the LOADED leaderboard while
 * the browser (empty cache) painted the loading skeleton. React threw a
 * hydration mismatch on the returning home and regenerated the whole tree,
 * remounting everything under it (the new-modes spotlight then hid itself).
 * The server render must never read the cache: same props → same HTML.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { useTopPlayers, type TopPlayer } from '../useTopPlayers';

const player: TopPlayer = {
  id: 'p1', username: 'maya', displayName: null, totalScore: 10,
  avatarImage: null, avatarConfig: null, prestigeLevel: 0,
};

function Probe({ initialData }: { initialData?: TopPlayer[] }) {
  const { players, loading } = useTopPlayers(5, { initialData });
  return <i>{loading ? 'loading' : `players:${players.length}`}</i>;
}

describe('useTopPlayers on the server', () => {
  it('Given an earlier request seeded the cache, when a later request renders without initialData, then it renders the same loading state the browser will', () => {
    renderToString(<Probe initialData={[player]} />);
    expect(renderToString(<Probe />)).toContain('loading');
  });

  it('Given initialData on this request, then the server renders it', () => {
    expect(renderToString(<Probe initialData={[player]} />)).toContain('players:1');
  });
});
