import { describe, it, expect } from 'vitest';
import { MODE_COACH, captionKeyFor } from '../modeCoachContent';

describe('captionKeyFor', () => {
  it('Given a drag step, When the player has a keyboard, Then the caption says to type or drag', () => {
    expect(captionKeyFor(MODE_COACH.blast.steps[0], true)).toBe('modeCoach.typeOrDrag');
  });

  it('Given a drag step on a touch screen, Then the mode caption stays', () => {
    expect(captionKeyFor(MODE_COACH.blast.steps[0], false)).toBe('modeCoach.blast.step1');
  });

  it('Given a step that is not about dragging, Then the keyboard changes nothing', () => {
    expect(captionKeyFor(MODE_COACH.wheelRush.steps[0], true)).toBe('modeCoach.wheelRush.step1');
  });
});
