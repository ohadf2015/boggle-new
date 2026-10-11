import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import WordWheelFoundWords from '../WordWheelFoundWords';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('WordWheelFoundWords', () => {
  it('strip shows the empty hint before the first word', () => {
    render(<WordWheelFoundWords t={t} words={[]} lastFound={null} />);
    expect(screen.getByText('wordWheel.strip.empty')).toBeInTheDocument();
  });

  it('strip lists the newest word first and highlights it', () => {
    render(<WordWheelFoundWords t={t} words={['CAT', 'CRATE']} lastFound="CRATE" />);
    const items = screen.getAllByTestId('found-word');
    expect(items.map(i => i.textContent)).toEqual(['CRATE', 'CAT']);
    expect(items[0].getAttribute('data-fresh')).toBe('true');
    expect(screen.getByTestId('found-count').textContent).toBe('2');
  });

  it('opens every word with its points behind one tap', () => {
    render(<WordWheelFoundWords t={t} words={['CAT', 'CRATE']} lastFound={null} />);
    expect(screen.queryByTestId('found-words-all')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /wordWheel\.strip\.all/ }));
    const all = screen.getByTestId('found-words-all');
    expect(all.textContent).toContain('CAT');
    expect(all.textContent).toContain('+12');
    expect(all.textContent).toContain('+60');
  });

  it('panel variant lists every word alphabetically without a tap', () => {
    render(<WordWheelFoundWords t={t} words={['TRACE', 'CAT']} lastFound="TRACE" variant="panel" />);
    const all = screen.getByTestId('found-words-all');
    const words = Array.from(all.querySelectorAll('[data-testid="found-word"]')).map(e => e.textContent);
    expect(words[0]).toMatch(/^CAT/);
    expect(words[1]).toMatch(/^TRACE/);
  });

  it('panel variant names the longest word so far', () => {
    render(<WordWheelFoundWords t={t} words={['CAT', 'TRACE']} lastFound="CAT" variant="panel" />);
    expect(screen.getByText('wordWheel.strip.longest')).toBeInTheDocument();
    expect(screen.getByText('TRACE', { selector: '.font-neo-display' })).toBeInTheDocument();
  });
});
