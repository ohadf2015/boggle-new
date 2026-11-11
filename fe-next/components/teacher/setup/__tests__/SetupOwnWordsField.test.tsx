import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SetupOwnWordsField } from '../SetupOwnWordsField';

const t = (key: string) => key;
const own = (text: string, count: number) => ({ text, onTextChange: vi.fn(), count, dropped: 0, min: 3 });

describe('SetupOwnWordsField', () => {
  it('Given an empty box, When shown, Then it stays two lines tall so "Create class" keeps its place', () => {
    render(<SetupOwnWordsField own={own('', 0)} t={t} />);
    expect(screen.getByTestId('setup-own-words').className).toMatch(/\bh-16\b/);
  });

  it('Given a pasted list one word per line, When shown, Then the box grows so the teacher sees more than the first two words', () => {
    render(<SetupOwnWordsField own={own('photon\ngravity\nmagnet\norbit\nfriction', 5)} t={t} />);
    expect(screen.getByTestId('setup-own-words').className).toMatch(/\bh-28\b/);
  });
});
