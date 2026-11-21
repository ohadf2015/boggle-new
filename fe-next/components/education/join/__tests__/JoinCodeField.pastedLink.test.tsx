import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { JoinCodeField } from '../JoinCodeField';
import { extractJoinCode } from '../joinCodeFromLink';

const input = () => screen.getByTestId('join-code-input') as HTMLInputElement;
const paste = (text: string) => fireEvent.paste(input(), { clipboardData: { getData: () => text } });

describe('a pasted join link', () => {
  it.each([
    ['https://www.lexiclash.live/en/join/p45krt', 'P45KRT'],
    ['https://www.lexiclash.live/he/join/P45KRT?utm=x', 'P45KRT'],
    ['lexiclash.live/join?code=p45krt', 'P45KRT'],
    ['  Join here: https://www.lexiclash.live/en/join/P45KRT  ', 'P45KRT'],
  ])('GIVEN "%s" THEN the code is %s', (raw, code) => {
    expect(extractJoinCode(raw)).toBe(code);
  });

  it('GIVEN plain text with no link THEN nothing is extracted', () => {
    expect(extractJoinCode('P45KRT')).toBeNull();
    expect(extractJoinCode('hello world, see you at https://example.com/page')).toBeNull();
  });

  it('GIVEN a link is pasted into the field THEN all six boxes fill and the code completes once', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const onOverflow = vi.fn();
    render(<JoinCodeField value="" onChange={onChange} onComplete={onComplete} onOverflow={onOverflow} label="code" />);
    paste('https://www.lexiclash.live/en/join/p45krt');
    expect(onChange).toHaveBeenLastCalledWith('P45KRT');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('P45KRT');
    expect(onOverflow).not.toHaveBeenCalled();
  });
});

describe('a refused code', () => {
  it('GIVEN the field is invalid THEN the cells shake while keeping what was typed', () => {
    render(<JoinCodeField value="ZZZZZQ" onChange={vi.fn()} invalid label="code" />);
    expect(screen.getByTestId('join-code-cells').className).toMatch(/animate-neo-shake/);
    expect(screen.getAllByTestId('join-code-cell').map((c) => c.textContent).join('')).toBe('ZZZZZQ');
  });
});
