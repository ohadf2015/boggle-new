import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomModeSpotlight } from '../ClassroomModeSpotlight';
import { catalogueEntry, catalogueKeys } from '../ClassroomModeCatalogueData';

const t = (key: string) => key;

function setup(blockedKey: string | null = null) {
  const mode = catalogueEntry('classic')!;
  render(
    <ClassroomModeSpotlight mode={mode} keys={catalogueKeys(mode)} minutes={3} language="en" blockedKey={blockedKey} onGoLive={vi.fn()} t={t} />
  );
}

describe('<ClassroomModeSpotlight> press and swap motion', () => {
  it('Given GO LIVE, When rendered, Then it presses on a flat lip instead of lifting on hover', () => {
    setup();
    const cls = screen.getByTestId('lobby-go-live').className;
    expect(cls).toContain('shadow-[0_4px_0_0]');
    expect(cls).toContain('active:translate-y-[4px]');
    expect(cls).not.toMatch(/hover:-translate-y/);
  });

  it('Given a blocked GO LIVE, When rendered, Then the live icon does not pulse', () => {
    setup('education.modePicker.needsLesson');
    expect(screen.getByTestId('lobby-go-live').innerHTML).not.toMatch(/animate-pulse/);
  });

  it('Given a mode swap, When the text block renders, Then it never fades or blurs in', () => {
    setup();
    const text = screen.getByTestId('spotlight-text');
    expect(text.className).not.toMatch(/edu-ready-swap|opacity|blur/);
    expect(text.getAttribute('style') ?? '').not.toMatch(/opacity|blur/);
  });

  it('Given the art, When rendered, Then it fills the spare panel height on the two-column lobby', () => {
    setup();
    expect(screen.getByTestId('spotlight-art').className).toContain('@4xl/lobby:flex-1');
  });
});
