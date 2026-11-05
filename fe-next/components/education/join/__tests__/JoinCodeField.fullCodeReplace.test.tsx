import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * A full field cannot be typed into: `maxLength` drops the seventh key and the
 * caret is transparent, so a student whose six characters were refused taps the
 * cells, types, and nothing happens (rage clicks on join-code-input and on NEXT,
 * /en/join, 2026-11-03). Selecting the whole code when a full field is focused
 * or tapped makes the next keystroke replace it and backspace clear it.
 */
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { JoinCodeField } from '../JoinCodeField';

const input = () => screen.getByTestId('join-code-input') as HTMLInputElement;

describe('<JoinCodeField> — a full code is replaceable', () => {
  it('GIVEN six characters WHEN the field is focused THEN the whole code is selected', () => {
    render(<JoinCodeField value="ZZZZZZ" onChange={() => {}} label="code" invalid />);
    input().setSelectionRange(6, 6);
    fireEvent.focus(input());
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(6);
  });

  it('GIVEN six characters WHEN the focused field is tapped THEN the whole code is selected', () => {
    render(<JoinCodeField value="ZZZZZZ" onChange={() => {}} label="code" />);
    input().setSelectionRange(3, 3);
    fireEvent.click(input());
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(6);
  });

  it('GIVEN a partial code WHEN the field is tapped THEN nothing is selected, so typing appends', () => {
    render(<JoinCodeField value="P45" onChange={() => {}} label="code" />);
    input().setSelectionRange(3, 3);
    fireEvent.click(input());
    expect(input().selectionStart).toBe(3);
    expect(input().selectionEnd).toBe(3);
  });

  it('hides the selection band over the transparent text', () => {
    render(<JoinCodeField value="ZZZZZZ" onChange={() => {}} label="code" />);
    expect(input().className).toContain('selection:bg-transparent');
  });
});
