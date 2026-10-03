import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeCardRow } from '../ClassroomModeCatalogue';
import { catalogueModes } from '../ClassroomModeCatalogueData';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${JSON.stringify(params)}` : key;

describe('<ClassroomModeCardRow> on a phone', () => {
  // The row scrolls sideways at 390px; without a cue the second category looked absent.
  it('says how many games there are and that the row swipes', () => {
    render(<ClassroomModeCardRow selected="vocab-quiz" onPick={vi.fn()} t={t} />);
    const hint = screen.getByTestId('mode-row-swipe-hint');
    expect(hint).toHaveTextContent(`eg2Modes.swipeHint|{"count":${catalogueModes().length}}`);
    expect(hint.className).toContain('lg:hidden');
  });
});
