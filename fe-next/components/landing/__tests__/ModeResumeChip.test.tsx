/**
 * The "continue your run" chrome on a mode cube. The load-bearing property is
 * that it NEVER changes the tile's box: the run resolves from sessionStorage
 * after hydration, and a cube that resized then would reflow the whole bento.
 */
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Map, BookOpen } from 'lucide-react';
import { LandingModeCubes } from '../LandingModeCubes';
import type { ModeCubeModel } from '@/lib/landing/modeMeta';
import type { AdventureResume } from '@/lib/landing/adventureResume';

const RESUME: AdventureResume = {
  world: 4, step: 5, hp: 3, maxHp: 6, relics: ['sharp-quill', 'magnet'], gold: 240,
};

const model = (over: Partial<ModeCubeModel> & { key: string }): ModeCubeModel => ({
  title: over.key, href: `/en/${over.key}`, variant: 'cyan', Icon: BookOpen, role: 'normal', onClick: vi.fn(), ...over,
});

const adventure = (over: Partial<ModeCubeModel> = {}) =>
  model({ key: 'adventure', title: 'Adventure', href: '/en/adventure?world=4', variant: 'lime', Icon: Map, ...over });

const renderCubes = (models: ModeCubeModel[]) =>
  render(
    <LanguageProvider>
      <LandingModeCubes t={(k: string) => k} dailyNode={<div />} models={models} extras={[]} sectionLabel="Game modes" />
    </LanguageProvider>,
  );

const cube = () => document.querySelector('[data-cube-key="adventure"]') as HTMLElement;

describe('mode cube resume state', () => {
  it('shows nothing extra while no run is stored', () => {
    renderCubes([adventure()]);
    expect(screen.queryByTestId('mode-resume-chip')).toBeNull();
  });

  it('shows the world, how deep the run is, the hearts left and the relics carried', () => {
    renderCubes([adventure({ resume: RESUME })]);
    expect(screen.getByTestId('mode-resume-chip')).toHaveTextContent('W4');
    expect(screen.getByTestId('mode-resume-chip')).toHaveTextContent('5/8');
    expect(cube()).toHaveTextContent('3');
    const relics = screen.getByTestId('mode-resume-relics');
    expect(relics.querySelectorAll('img')).toHaveLength(2);
  });

  it('caps the relic thumbs on a small 1x1 cube and counts the rest', () => {
    // A sibling in front keeps adventure a 1x1 cube (the lone model becomes the anchor).
    renderCubes([
      model({ key: 'arena', title: 'Arena', href: '/en/multiplayer', role: 'anchor' }),
      adventure({ resume: { ...RESUME, relics: ['sharp-quill', 'magnet', 'hourglass', 'long-bow'] } }),
    ]);
    const relics = screen.getByTestId('mode-resume-relics');
    expect(relics.querySelectorAll('img')).toHaveLength(2);
    expect(relics).toHaveTextContent('+2');
  });

  it('points the cube at the run it resumes', () => {
    renderCubes([adventure({ resume: RESUME })]);
    expect(cube()).toHaveAttribute('href', '/en/adventure?world=4');
  });

  it('does not change the tile box when the run resolves — the bento cannot reflow', () => {
    const { unmount } = renderCubes([adventure()]);
    const before = cube().className;
    unmount();
    renderCubes([adventure({ resume: RESUME })]);
    expect(cube().className).toBe(before);
  });

  it('stays out of the way of a locked cube', () => {
    renderCubes([adventure({ resume: RESUME, locked: true, lockedMessage: 'offline' })]);
    expect(screen.queryByTestId('mode-resume-chip')).toBeNull();
  });
});
