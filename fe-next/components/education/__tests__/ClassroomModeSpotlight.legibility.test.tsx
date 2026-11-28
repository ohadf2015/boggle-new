/**
 * The ready panel is calm: the mode's own cover art at a modest size, a normal-case
 * title, neutral chips, and one lime GO LIVE whose label never wraps or clips.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('Given the art, When rendered, Then it is the mode cover on every screen, steps aside while the lobby is expanded, with no fake UI preview or floating mascot', () => {
    setup();
    const art = screen.getByTestId('spotlight-art');
    expect(art.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(art.className).toContain('group-has-[[data-lobby-expanded]]/lobby:hidden');
    expect(within(art).getByRole('presentation', { hidden: true }).getAttribute('src')).toBe(catalogueEntry('vocab-quiz')!.sticker);
    expect(screen.queryByTestId('mode-preview')).toBeNull();
    expect(screen.getByTestId('mode-spotlight').innerHTML).not.toMatch(/animate-avatar-float/);
  });

  it('Given the title, When rendered, Then it is normal case and not cut', () => {
    setup();
    const title = within(screen.getByTestId('mode-spotlight')).getByRole('heading');
    expect(title.className).not.toMatch(/uppercase|truncate/);
  });

  it('Given the first frame, Then no chip row competes with Start: specs, best-for and steps wait behind How it plays, as neutral outlines', () => {
    setup();
    expect(screen.queryByTestId('spec-complexity')).toBeNull();
    expect(screen.queryByTestId('spotlight-best-for')).toBeNull();
    fireEvent.click(screen.getByTestId('how-it-plays-toggle'));
    for (const id of ['spec-duration', 'spec-complexity', 'spec-style']) expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.getAllByTestId('best-for-chip').length).toBeGreaterThan(0);
    const html = screen.getByTestId('mode-spotlight').innerHTML;
    expect(html.match(/(?<![\w:-])bg-neo-lime(?![\w/-])/g)).toHaveLength(1);
    const decor = [...screen.getByTestId('mode-spotlight').querySelectorAll('[data-accent-decor]')];
    expect(decor.map((n) => n.getAttribute('data-testid'))).toEqual(['spotlight-art']);
    expect(html.replace(decor[0].outerHTML, '')).not.toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)(?![\w-])/);
  });

  it('Given the start button, When rendered, Then it is the last control, huge, and says "Start a game" on one line with the mode and minutes under it', () => {
    setup();
    const buttons = within(screen.getByTestId('mode-spotlight')).getAllByRole('button');
    const go = buttons[buttons.length - 1];
    expect(go).toHaveAttribute('data-testid', 'lobby-go-live');
    expect(go).toHaveAttribute('aria-label', 'education.modePicker.launch');
    expect(go.className).toContain('min-h-[72px]');
    const label = within(go).getByTestId('go-live-label');
    expect(label).toHaveTextContent('eduShell.home.startLive');
    expect(label.className).toContain('whitespace-nowrap');
    expect(go.innerHTML).not.toMatch(/truncate|uppercase/);
    expect(go).toHaveTextContent('teacher.classroom.gameModes.vocabQuiz');
    expect(go).toHaveTextContent('education.modePicker.minutes');
  });

  it('Given a Hebrew page, When rendered, Then the spotlight carries dir="rtl" and start-aligned steps', () => {
    setup('rtl');
    expect(screen.getByTestId('mode-spotlight')).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByTestId('how-it-plays-toggle'));
    expect(screen.getByTestId('how-it-plays').className).toContain('text-start');
  });

  it('Given the blurb, Then it shows on every screen and steps aside while the lobby is expanded', () => {
    setup();
    const how = screen.getByTestId('spotlight-how');
    expect(how).toHaveTextContent(catalogueKeys(catalogueEntry('vocab-quiz')!).how);
    expect(how.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(how.className).toContain('group-has-[[data-lobby-expanded]]/lobby:hidden');
  });

  it('Given the steps toggle, Then it names itself and explains itself on hover too', () => {
    setup();
    const toggle = screen.getByTestId('how-it-plays-toggle');
    expect(toggle).toHaveAttribute('title', 'eg2Modes.howItPlays');
    expect(toggle).toHaveTextContent('eg2Modes.howItPlays');
  });
});
