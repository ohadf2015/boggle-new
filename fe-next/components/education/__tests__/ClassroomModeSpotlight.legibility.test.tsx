/**
 * The ready panel is calm: the mode's own cover art at a modest size, a normal-case
 * title, neutral chips, and one lime GO LIVE whose label never wraps or clips.
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

describe('<ClassroomModeSpotlight> ready panel', () => {
  it('Given the art, When rendered, Then it is the mode cover on desktop only: no fake UI preview, no floating mascot', () => {
    setup();
    const art = screen.getByTestId('spotlight-art');
    expect(art.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(art.className).toContain('@4xl/lobby:block');
    expect(within(art).getByRole('presentation', { hidden: true }).getAttribute('src')).toBe(catalogueEntry('vocab-quiz')!.cover);
    expect(screen.queryByTestId('mode-preview')).toBeNull();
    expect(screen.getByTestId('mode-spotlight').innerHTML).not.toMatch(/animate-avatar-float/);
  });

  it('Given the title, When rendered, Then it is normal case and not cut', () => {
    setup();
    const title = within(screen.getByTestId('mode-spotlight')).getByRole('heading');
    expect(title.className).not.toMatch(/uppercase|truncate/);
  });

  it('Given the specs, best-for and steps, When rendered, Then they are neutral outlines, no accent fills', () => {
    setup();
    const text = screen.getByTestId('spotlight-text');
    for (const id of ['spec-duration', 'spec-complexity', 'spec-style']) expect(within(text).getByTestId(id)).toBeInTheDocument();
    const html = screen.getByTestId('mode-spotlight').innerHTML;
    expect(html.match(/(?<![\w:-])bg-neo-lime(?![\w/-])/g)).toHaveLength(1);
    const decor = [...screen.getByTestId('mode-spotlight').querySelectorAll('[data-accent-decor]')];
    expect(decor.map((n) => n.getAttribute('data-testid'))).toEqual(['spotlight-art']);
    expect(html.replace(decor[0].outerHTML, '')).not.toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)(?![\w-])/);
  });

  it('Given GO LIVE, When rendered, Then it is the last control and says "Go live" on one line with the mode under it', () => {
    setup();
    const buttons = within(screen.getByTestId('mode-spotlight')).getAllByRole('button');
    const go = buttons[buttons.length - 1];
    expect(go).toHaveAttribute('data-testid', 'lobby-go-live');
    expect(go).toHaveAttribute('aria-label', 'education.modePicker.launch');
    const label = within(go).getByTestId('go-live-label');
    expect(label).toHaveTextContent('teacher.playNow.goLive');
    expect(label.className).toContain('whitespace-nowrap');
    expect(go.innerHTML).not.toMatch(/truncate|uppercase/);
    expect(go).toHaveTextContent('teacher.classroom.gameModes.vocabQuiz');
  });

  it('Given a Hebrew page, When rendered, Then the spotlight carries dir="rtl" and start-aligned text', () => {
    setup('rtl');
    const spot = screen.getByTestId('mode-spotlight');
    expect(spot).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('how-it-plays-inline').className).toContain('text-start');
  });

  it('Given the phone dock, Then the icon-only steps toggle explains itself on hover too', () => {
    setup();
    expect(screen.getByTestId('how-it-plays-toggle')).toHaveAttribute('title', 'eg2Modes.howItPlays');
  });
});
