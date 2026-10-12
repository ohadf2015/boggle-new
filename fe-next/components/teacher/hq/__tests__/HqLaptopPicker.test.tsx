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

describe('laptop HQ picker (1366x768) — the picker fits the fold', () => {
  it('Given a laptop, Then the picker lays out three tiles across, not two', () => {
    expect(read('components/teacher/dashboard/PlayNowLauncher.tsx')).toMatch(/lg:grid-cols-3/);
  });

  it('Given a laptop, Then the one-line pitch is visible', () => {
    render(<HqModeCard mode={BLAST} label="Blast" blurb="Fast rounds, huge combos" tagline="Chain combos" selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Fast rounds, huge combos').className).not.toMatch(/(^|\s)max-2xl:hidden(\s|$)/);
  });

  it('Given a short laptop viewport, Then a tile is a compact 64px row', () => {
    render(<HqModeCard mode={BLAST} label="Blast" blurb="Fast rounds" tagline="Chain combos" selected={false} onSelect={vi.fn()} />);
    expect(screen.getByTestId('hq-mode-blast').className).toMatch(/desktop-medium-short:h-16/);
  });
});
