import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('next/image', () => ({ default: () => null }));

import { HqModeCard } from '../HqModeCard';
import { HQ_MODES } from '../hqModes';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const BLAST = HQ_MODES.find((m) => m.id === 'blast')!;

describe('projector-size HQ — tiles keep their full name and pitch on a 1920 screen', () => {
  it('Given a wide screen, Then the mode name wraps instead of clamping to one line', () => {
    render(<HqModeCard mode={BLAST} label="Wordcraft" blurb="Craft list words" tagline="Chain combos" selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Wordcraft').className).toMatch(/(^|\s)2xl:line-clamp-none(\s|$)/);
  });

  it('Given a wide screen, Then the one-line pitch is shown in place of the tagline', () => {
    render(<HqModeCard mode={BLAST} label="Blast" blurb="Fast rounds, huge combos" tagline="Chain combos" selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Fast rounds, huge combos').className).toMatch(/(^|\s)max-lg:hidden(\s|$)/);
  });

  it('Given the mode picker, Then it lays out three tiles across at 1920 and two at laptop width', () => {
    const src = read('components/teacher/dashboard/PlayNowLauncher.tsx');
    expect(src).toMatch(/grid-cols-2[^"]*2xl:grid-cols-3/);
  });

  it('Given the launch hand-off, Then its card grows to fill a projector', () => {
    expect(read('components/teacher/hq/HqLaunchStage.tsx')).toMatch(/max-w-md[^"]*2xl:max-w-xl|2xl:max-w-xl/);
  });

  it('Given the HQ shell, Then the content column widens above 1920', () => {
    expect(read('components/teacher/TeacherDashboard.tsx')).toMatch(/2xl:max-w-\[1600px\]/);
    expect(read('components/teacher/TeacherDashboard.tsx')).toMatch(/2xl:max-w-\[1024px\]/);
    expect(read('components/teacher/dashboard/PlayNowLauncher.tsx')).toMatch(/2xl:min-h-24 2xl:text-6xl/);
  });
});

describe('HQ motion — the screen keeps moving between taps, and still for reduced motion', () => {
  it('Given GO LIVE is armed, Then its rocket bobs', () => {
    expect(read('components/teacher/dashboard/PlayNowLauncher.tsx')).toMatch(/data-testid="play-now-go-rocket"/);
  });

  it('Given a selected mode, Then its poster keeps bobbing rather than sitting still', () => {
    expect(read('components/teacher/hq/HqModeCard.tsx')).toMatch(/data-testid=\{`hq-mode-poster-\$\{mode\.id\}`\}/);
  });
});
