import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BlastV2PageClient } from '../BlastV2PageClient';
import type { BlastLevel } from '@/lib/blast/v2/types';

const level1: BlastLevel = {
  id: 'l1', levelNumber: 1, theme: 'onboarding', locale: 'en',
  words: ['CAT'], columns: [{ index: 0, tiles: ['C', 'A', 'T'] }],
  resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
};
const level2: BlastLevel = {
  id: 'l2', levelNumber: 2, theme: 'fruits', locale: 'en',
  words: ['FIG'], columns: [{ index: 0, tiles: ['F', 'I', 'G'] }],
  resolvableOrder: ['FIG'], tileFlags: {}, difficulty: 2,
};

vi.mock('@/components/blast/v2/BlastGame', () => ({
  BlastGame: ({ level, onAdvance }: { level: BlastLevel; onAdvance: () => void }) => (
    <div>
      <span data-testid="level-number">{level.levelNumber}</span>
      <button data-testid="advance" onClick={onAdvance}>advance</button>
    </div>
  ),
}));

describe('BlastV2PageClient level advancement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and renders the next level when onAdvance fires', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => level2,
    }) as unknown as typeof fetch;

    render(
      <LanguageProvider initialLanguage="en">
        <BlastV2PageClient level={level1} />
      </LanguageProvider>
    );
    expect(screen.getByTestId('level-number').textContent).toBe('1');

    screen.getByTestId('advance').click();

    await waitFor(() => {
      expect(screen.getByTestId('level-number').textContent).toBe('2');
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/blast/level?level=2&locale=en');
  });
});
