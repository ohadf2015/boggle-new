import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { knobs, resetKnobs } from './academyTestMocks';
import StudentPageClient from '../PageClient';

/**
 * ONE story: the spotlit island and the hero button are visually linked — the
 * pointer over the island wears the same colour and the same lead word as the
 * button, in every state (including the live game, which is pink).
 */

beforeEach(() => resetKnobs());

const L1 = { lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [{ word: 'a', level: 'core' }] } };

describe('Academy spotlight ↔ hero button', () => {
  it('given a next lesson, the pointer and the button share tone and word', async () => {
    knobs.lessons = [L1] as never;
    render(<StudentPageClient />);
    const pointer = await screen.findByTestId('academy-spotlight-pointer');
    const cta = screen.getByTestId('academy-cta');
    expect(pointer.getAttribute('data-tone')).toBe('gold');
    expect(cta.getAttribute('data-tone')).toBe('gold');
    expect(pointer.textContent).toBe('academy.student.ctaPlay');
    expect(cta.textContent).toContain('academy.student.ctaPlay');
  });

  it('given a live game, the arena pointer turns pink with the button', async () => {
    knobs.lessons = [L1] as never;
    knobs.activeGame = { gameCode: 'ABC123', teacherName: 'Ms. R', lessonNames: [] };
    render(<StudentPageClient />);
    const cta = await screen.findByTestId('academy-cta');
    expect(cta.getAttribute('data-kind')).toBe('live');
    const pointer = screen.getByTestId('academy-spotlight-pointer');
    expect(screen.getByTestId('academy-node-arena').contains(pointer)).toBe(true);
    expect(pointer.getAttribute('data-tone')).toBe('pink');
    expect(cta.getAttribute('data-tone')).toBe('pink');
  });
});
