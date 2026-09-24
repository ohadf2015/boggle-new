import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunMapScreen from '../RunMapScreen';
import { RUN_PRIMER_KEY } from '../runPrimer';
import { buildRunMap, isPlayNode } from '@/lib/adventure/play/runMap';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const map = buildRunMap('seed-screen', 1);
const row0 = map.nodes.filter((n) => n.row === 0);
const first = row0[0];
const next = map.edges.find((e) => e.from === first.id)!.to;
const rest = map.nodes.find((n) => n.kind === 'rest')!;

const runOf = (over: Partial<PublicRun> = {}): PublicRun => ({
  v: 2, w: 1, step: 1, node: null, path: [], hp: 4, maxHp: 5, relics: ['magnet'],
  potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 42, ...over,
} as PublicRun);

const renderMap = (props: Partial<React.ComponentProps<typeof RunMapScreen>> = {}) =>
  render(
    <RunMapScreen
      world={1} map={map} run={runOf()} currentNode={null}
      reachable={row0.map((n) => n.id)} cleared={[]}
      onChoose={() => {}} onLeave={() => {}}
      {...props}
    />,
  );

const node = (id: string) => screen.getByTestId(`map-node-${id}`);
const button = (id: string) => node(id).querySelector('button') as HTMLButtonElement;

describe('RunMapScreen', () => {
  // A returning player: the first-visit primer sheet is already behind them.
  beforeEach(() => window.localStorage.setItem(RUN_PRIMER_KEY, '1'));

  it('Given a first-ever map, when it opens, then the run primer explains the loop before any choice', () => {
    window.localStorage.clear();
    renderMap();
    const dialog = screen.getByRole('dialog');
    for (const key of ['primerTitle', 'primerMap', 'primerFight', 'primerKeep']) {
      expect(dialog.textContent).toContain(`adventurePlay.map.${key}`);
    }
  });

  it('Given a run in progress, then home is one tap away (the run is saved, so leaving loses nothing)', () => {
    renderMap();
    const home = screen.getByRole('link', { name: 'adventurePlay.backHome' });
    expect(home.getAttribute('href')).toBe('/en');
  });

  it('Given a fresh run, when the map opens, then row 0 is choosable and later rows are not', () => {
    renderMap();
    expect(node(first.id).dataset.status).toBe('next');
    expect(button(first.id).disabled).toBe(false);
    const far = map.nodes.find((n) => n.row === 3)!;
    expect(node(far.id).dataset.status).toBe('far');
    expect(button(far.id).disabled).toBe(true);
  });

  it('Given the boss, when the map opens, then it is on the map AND named in the pinned goal banner', () => {
    renderMap();
    const boss = map.nodes.find((n) => n.kind === 'boss')!;
    expect(node(boss.id)).toBeTruthy();
    expect(screen.getByText(/adventurePlay\.map\.bossAhead/)).toBeTruthy();
  });

  it('Given a reachable node, when it is tapped, then the run is sent to that node', () => {
    const onChoose = vi.fn();
    renderMap({ onChoose });
    fireEvent.click(button(first.id));
    expect(onChoose).toHaveBeenCalledWith(first.id);
  });

  it('Given the run stands on a cleared campfire, then the walked node is done and the next row is choosable', () => {
    renderMap({ run: runOf({ node: rest.id, path: [rest.id], step: 1 }), currentNode: rest.id, reachable: [next], cleared: [] });
    expect(node(rest.id).dataset.status).toBe('current');
    expect(node(next).dataset.status).toBe('next');
    expect(screen.queryByTestId('map-resume')).toBeNull();
  });

  it('Given a fight left unplayed underfoot, then the map offers to resume it and refuses to walk past it', () => {
    const fight = map.nodes.find((n) => isPlayNode(n.kind))!;
    const onChoose = vi.fn();
    renderMap({ run: runOf({ node: fight.id, path: [fight.id] }), currentNode: fight.id, reachable: [next], cleared: [], onChoose });
    expect(node(next).dataset.status).toBe('far');
    expect(button(next).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('map-resume'));
    expect(onChoose).toHaveBeenCalledWith(fight.id);
  });

  it('Given the run walked three nodes, then each walked node carries its step number', () => {
    const walked = [row0[0].id, next];
    renderMap({ run: runOf({ node: next, path: walked, step: 2 }), currentNode: next, reachable: [], cleared: walked });
    expect(node(row0[0].id).dataset.status).toBe('done');
    expect(node(row0[0].id).textContent).toContain('1');
  });

  it('Given the run state, then hearts, gold and the floor counter are pinned on screen', () => {
    renderMap({ run: runOf({ path: [row0[0].id], step: 1 }) });
    expect(screen.getByLabelText(/adventurePlay\.gold/)).toBeTruthy();
    expect(screen.getByText(/adventurePlay\.map\.floorOf/)).toBeTruthy();
    expect(screen.getByLabelText(/adventurePlay\.loot\.hearts/)).toBeTruthy();
  });

  it('Given the legend button, when it is tapped, then every node kind is explained', () => {
    renderMap();
    fireEvent.click(screen.getByText('adventurePlay.map.legend'));
    const dialog = screen.getByRole('dialog');
    for (const kind of ['fight', 'elite', 'treasure', 'shop', 'rest', 'event', 'boss']) {
      expect(dialog.textContent).toContain(`adventurePlay.map.kind.${kind}`);
    }
    expect(dialog.textContent).toContain('adventurePlay.map.eliteWarning');
  });

  it('Given a finished run, when the map is shown as a recap, then the path is frozen and a new run is offered', () => {
    const onChoose = vi.fn();
    const onNewRun = vi.fn();
    const walked = [row0[0].id, next];
    renderMap({
      recap: true, onNewRun, onChoose, cleared: walked,
      run: runOf({ node: next, path: walked, step: 2 }), currentNode: next, reachable: [],
    });
    expect(screen.getByText('adventurePlay.map.pathTaken')).toBeTruthy();
    expect(screen.queryByTestId('map-resume')).toBeNull();
    expect(node(row0[0].id).dataset.status).toBe('done');
    fireEvent.click(screen.getByTestId('map-new-run'));
    expect(onNewRun).toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('Given the leave button, when it is tapped, then the run screen is left', () => {
    const onLeave = vi.fn();
    renderMap({ onLeave });
    fireEvent.click(screen.getByLabelText('adventurePlay.map.leave'));
    expect(onLeave).toHaveBeenCalled();
  });
});
