/**
 * Live Vocab Quiz — answer buttons.
 *
 * These assert the things a 6th–7th grade special-ed classroom actually
 * depends on: a tap target big enough to hit while rushing, a lock that stops
 * a second submission, and right/wrong signalled by more than colour.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';

/** Mirrors the real `t(path, params)` call shape used by these components. */
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['abandon', 'brittle', 'candid', 'dwindle'];

function setup(overrides: Partial<Parameters<typeof VocabQuizAnswerGrid>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <VocabQuizAnswerGrid
      choices={CHOICES}
      selectedIndex={null}
      correctIndex={null}
      disabled={false}
      onSelect={onSelect}
      t={t}
      {...overrides}
    />
  );
  return { onSelect };
}

describe('VocabQuizAnswerGrid', () => {
  it('renders one button per choice', () => {
    setup();
    for (const choice of CHOICES) {
      expect(screen.getByRole('button', { name: new RegExp(choice) })).toBeInTheDocument();
    }
  });

  it('reports the tapped option index', async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByRole('button', { name: /candid/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('does not fire once the question is locked', async () => {
    const { onSelect } = setup({ disabled: true });
    await userEvent.click(screen.getByRole('button', { name: /candid/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marks the student own pick as pressed', () => {
    setup({ selectedIndex: 1 });
    expect(screen.getByRole('button', { name: /brittle/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /abandon/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('names the correct answer in its accessible label after the reveal', () => {
    setup({ correctIndex: 0, selectedIndex: 2, disabled: true });
    // Colour alone must not carry the verdict — the label says it too.
    expect(screen.getByRole('button', { name: /vocabQuiz\.answers\.correctOption:abandon/ })).toBeInTheDocument();
  });

  it('keeps every tap target well above the 44px minimum', () => {
    setup();
    for (const choice of CHOICES) {
      const button = screen.getByRole('button', { name: new RegExp(choice) });
      expect(button.className).toContain('min-h-[64px]');
    }
  });

  it('gives each option a distinct shape glyph so colour is never the only cue', () => {
    const { container } = render(
      <VocabQuizAnswerGrid
        choices={CHOICES}
        selectedIndex={null}
        correctIndex={null}
        disabled={false}
        onSelect={vi.fn()}
        t={t}
      />
    );
    const glyphs = [...container.querySelectorAll('span[aria-hidden]')].map((n) => n.textContent);
    expect(new Set(glyphs).size).toBe(CHOICES.length);
  });

  it('uses logical text alignment so Hebrew is not left-aligned', () => {
    setup();
    expect(screen.getByRole('button', { name: /abandon/ }).className).toContain('text-start');
  });
});
