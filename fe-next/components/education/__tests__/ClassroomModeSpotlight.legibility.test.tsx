/**
 * The spotlight is read off a classroom projector, so on desktop the three
 * steps, the duration / difficulty / style values and their badges are sized
 * for the back row, and every text block is laid out for the page direction.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomModeSpotlight } from '../ClassroomModeSpotlight';
import { catalogueEntry, catalogueKeys } from '../ClassroomModeCatalogueData';

const t = (key: string) => key;

function setup(dir?: 'rtl' | 'ltr') {
  const mode = catalogueEntry('vocab-quiz')!;
  render(
    <ClassroomModeSpotlight
      mode={mode}
      keys={catalogueKeys(mode)}
      minutes={4}
      language="he"
      dir={dir}
      blockedKey={null}
      onGoLive={vi.fn()}
      t={t}
    />
  );
}

describe('<ClassroomModeSpotlight> on a projected desktop', () => {
  it('Given the desktop steps, When rendered, Then each step reads at text-lg (up from text-sm) with a larger number badge', () => {
    setup();
    const steps = within(screen.getByTestId('how-it-plays-inline')).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    steps.forEach((li) => {
      expect(li.className).toContain('@4xl/lobby:text-lg');
      expect(li.firstElementChild?.className).toContain('@4xl/lobby:size-7');
    });
  });

  it('Given the specs, When rendered, Then they are one row of pills in the text column, values legible at text-xl', () => {
    setup();
    const text = screen.getByTestId('spotlight-text');
    for (const id of ['spec-duration', 'spec-complexity', 'spec-style']) {
      const pill = within(text).getByTestId(id);
      expect(pill.querySelector('[data-spec="value"]')?.className).toContain('@4xl/lobby:text-xl');
    }
  });

  it('Given the ready panel, When rendered, Then the art is desktop-only and GO LIVE is the last control, so the phone dock stays one row plus the button', () => {
    setup();
    expect(screen.getByTestId('spotlight-art').className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByTestId('spotlight-art').className).toContain('@4xl/lobby:block');
    const buttons = within(screen.getByTestId('mode-spotlight')).getAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveAttribute('data-testid', 'lobby-go-live');
  });

  it('Given the best-for badges, When rendered, Then they read at text-base on desktop', () => {
    setup();
    screen.getAllByTestId('best-for-chip').forEach((chip) => expect(chip.className).toContain('@4xl/lobby:text-base'));
  });

  it('Given a Hebrew page, When rendered, Then the spotlight carries dir="rtl" and start-aligned text', () => {
    setup('rtl');
    const spot = screen.getByTestId('mode-spotlight');
    expect(spot).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('how-it-plays-inline').className).toContain('text-start');
  });
});
