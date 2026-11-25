import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import WordWheelWordLine from '../WordWheelWordLine';
import { HuntWordStage } from '../survival/hunt/HuntWordStage';

const t = (key: string, params?: unknown) =>
  params && typeof params === 'object' ? `${key}:${JSON.stringify(params)}` : key;

function mockPointer(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: fine)' ? desktop : query === '(any-pointer: coarse)' ? !desktop : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

const wheel = {
  t,
  centerLetter: 'C',
  allLetters: ['C', 'A', 'T', 'S', 'R', 'E', 'N'],
  dir: 'ltr' as const,
  onRemove: vi.fn(),
  onSubmit: vi.fn(),
  isValidating: false,
  shake: false,
  feedback: null,
  acceptedWord: null,
  acceptedId: 0,
};

describe('first-word prompts on a mouse-and-keyboard computer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Given a desktop, When the wheel waits for a first word, Then it says to type', () => {
    mockPointer(true);
    render(<WordWheelWordLine {...wheel} hint letters={[]} />);
    expect(screen.getByText('wordWheel.firstHintTyped:{"letter":"C"}')).toBeInTheDocument();
  });

  it('Given a phone, When the wheel waits for a first word, Then it keeps the tap/swipe hint', () => {
    mockPointer(false);
    render(<WordWheelWordLine {...wheel} hint letters={[]} />);
    expect(screen.getByText('wordWheel.firstHint:{"letter":"C"}')).toBeInTheDocument();
  });

  it('Given a desktop, When the hunt is idle, Then it invites typing', () => {
    mockPointer(true);
    render(<HuntWordStage phase="idle" word="" verdict={null} points={null} message="" calm={false} t={t} />);
    expect(screen.getByText('wordHunt.survival.stage.promptTyped')).toBeInTheDocument();
  });
});
