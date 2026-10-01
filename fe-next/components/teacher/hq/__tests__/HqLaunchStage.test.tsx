import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

let reduced = false;
vi.mock('../useHqJuice', () => ({ useHqJuice: () => ({ reduced, sfx: {} }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

import { HqLaunchStage } from '../HqLaunchStage';

describe('<HqLaunchStage> — GO LIVE never shows a bare splash', () => {
  beforeEach(() => {
    reduced = false;
    vi.useRealTimers();
  });

  it('Given a mode and a list, Then it names what is launching and is announced as status', () => {
    render(<HqLaunchStage modeLabel="Blast" listTitle="Common English" poster="/mascot/teacher/mode-blast-nobg.webp" />);
    const stage = screen.getByTestId('hq-launch-stage');
    expect(stage).toHaveAttribute('role', 'status');
    expect(stage).toHaveTextContent('eduHq.launch.titleMode:Blast');
    expect(stage).toHaveTextContent('Common English');
    expect(stage.querySelector('img')?.getAttribute('src')).toContain('mode-blast');
  });

  it('Given no mode (a route loading boundary), Then the copy is generic', () => {
    render(<HqLaunchStage />);
    expect(screen.getByTestId('hq-launch-stage')).toHaveTextContent('eduHq.launch.generic');
  });

  it('Given time passes, Then the steps tick forward but the code step never claims done', () => {
    vi.useFakeTimers();
    render(<HqLaunchStage modeLabel="Blast" />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    const steps = screen.getAllByTestId(/^hq-launch-step-/);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveAttribute('data-state', 'done');
    expect(steps[2]).not.toHaveAttribute('data-state', 'done');
  });

  it('Given reduced motion, Then the code slots hold still', () => {
    reduced = true;
    vi.useFakeTimers();
    render(<HqLaunchStage modeLabel="Blast" />);
    const before = screen.getByTestId('hq-launch-slots').textContent;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('hq-launch-slots').textContent).toBe(before);
  });

  it('Given a full-screen layer, Then it paints at rest — no opacity-0 entrance on the root (Class 5)', () => {
    render(<HqLaunchStage />);
    const stage = screen.getByTestId('hq-launch-stage');
    expect(stage.className).toContain('bg-neo-navy');
    expect(stage.className).not.toMatch(/opacity-0|animate-in|fade-in/);
    const src = readFileSync(path.join(__dirname, '..', 'HqLaunchStage.tsx'), 'utf8');
    expect(src).not.toMatch(/initial=\{\{\s*opacity:\s*0/);
  });
});
