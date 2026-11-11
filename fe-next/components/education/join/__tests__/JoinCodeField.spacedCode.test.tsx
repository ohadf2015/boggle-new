import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { JoinCodeField } from '../JoinCodeField';

const input = () => screen.getByTestId('join-code-input') as HTMLInputElement;

/** jsdom ignores `maxLength` on a programmatic value; a browser cuts autofill and `fill` to it. */
function browserFill(raw: string) {
  const max = input().maxLength;
  fireEvent.change(input(), { target: { value: max >= 0 ? raw.slice(0, max) : raw } });
}

describe('<JoinCodeField> — a code filled in one go', () => {
  it.each(['abc 123', 'ABC-123', ' abc123 ', 'a b c 1 2 3'])('GIVEN "%s" filled at once THEN the six-character code completes once', (raw) => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<JoinCodeField value="" onChange={onChange} onComplete={onComplete} label="code" />);
    browserFill(raw);
    expect(onChange).toHaveBeenLastCalledWith('ABC123');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('ABC123');
  });

  it('GIVEN a full code WHEN a seventh key lands THEN the code and step stay as they were', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<JoinCodeField value="P45KRT" onChange={onChange} onComplete={onComplete} label="code" />);
    fireEvent.change(input(), { target: { value: 'P45XKRT' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
