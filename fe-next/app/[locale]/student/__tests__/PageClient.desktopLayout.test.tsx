import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { knobs, resetKnobs, asStudent } from './academyTestMocks';

/**
 * The student hub on a real screen — rewritten for the Academy Map (2026-09-23).
 *
 * The previous version asserted a 2/3 + 1/3 `lg:grid` inside the shell's scroll
 * region. That layout scrolled 2100px on a phone and 1070px on a 1080p screen;
 * the Academy replaces it with one fixed, non-scrolling surface whose art
 * switches between a portrait and a landscape map. What survives, in intent:
 *  - lessons / awards / me stay ONE tap away (now the dock, not shell tabs);
 *  - the guest "not you?" escape stays — it is a sign-out, not navigation;
 *  - a wide window is laid out for width (landscape map), not a stretched phone.
 * Asserted on markup, because jsdom has no layout engine.
 */

import StudentPageClient from '../PageClient';

beforeEach(() => resetKnobs());

describe('StudentPageClient — one screen, nothing to scroll', () => {
  it('owns the viewport itself: no shell scroll region to overflow', async () => {
    const { container } = render(<StudentPageClient />);
    const hub = await screen.findByTestId('academy-hub');
    expect(hub.className).toContain('fixed');
    expect(hub.className).toContain('overflow-hidden');
    expect(hub.className).toContain('bg-neo-navy');
    expect(container.querySelector('[data-testid="education-shell-scroll"]')).toBeNull();
  });

  it('keeps lessons, awards and profile one tap away in the dock', async () => {
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('academy-dock-lessons')).toBeInTheDocument());
    expect(screen.getByTestId('academy-dock-lessons')).toHaveAttribute('href', '/en/student/lessons');
    expect(screen.getByTestId('academy-dock-awards')).toHaveAttribute('href', '/en/student/achievements');
    expect(screen.getByTestId('academy-dock-me')).toHaveAttribute('href', '/en/student/profile');
  });

  it('keeps the guest "not you?" escape — that is a sign-out, not a tab', async () => {
    asStudent({ is_anonymous: true });
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByText('student.notYou')).toBeInTheDocument());
  });

  it('draws the portrait map on a tall screen and the landscape map on a wide one', async () => {
    const { unmount } = render(<StudentPageClient />);
    expect((await screen.findByTestId('academy-map')).getAttribute('data-layout')).toBe('portrait');
    unmount();
    knobs.landscape = true;
    render(<StudentPageClient />);
    expect((await screen.findByTestId('academy-map')).getAttribute('data-layout')).toBe('landscape');
  });

  // Rewritten r2 (2026-09-24): this case used to assert 4 locked "Coming soon"
  // placeholders and a castle that opened the class duel. The r2 spec forbids
  // dead islands and makes the castle the lesson-mastery boss; the surviving
  // intent (lessons are playable islands, the castle does something real) is
  // asserted below.
  it('every island is a real destination — no locked placeholders — and the castle is the mastery boss', async () => {
    knobs.lessons = [{ lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [{ word: 'a', level: 'core' }, { word: 'b', level: 'core' }] } }];
    knobs.reviewLessonId = 'L1';
    render(<StudentPageClient />);
    await screen.findByTestId('academy-map');
    expect(screen.getByTestId('academy-node-lesson-L1')).toHaveAttribute('data-state', 'next');
    expect(screen.getByTestId('academy-node-workshop')).toBeInTheDocument();
    expect(screen.getByTestId('academy-node-review')).toBeInTheDocument();
    expect(screen.getByTestId('academy-node-arena')).toHaveAttribute('data-state', 'waiting');
    expect(screen.queryByText(/nodeSoon|Coming soon/)).toBeNull();
    // Boss: locked behind real mastery, progress shown
    const boss = screen.getByTestId('academy-node-boss');
    expect(boss).toHaveAttribute('data-state', 'locked');
    expect(boss.textContent).toContain('academy.student.bossNeed');
  });

  it('island taps navigate: workshop → /student/craft, review → /student/review', async () => {
    knobs.lessons = [{ lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [{ word: 'a', level: 'core' }] } }];
    knobs.reviewLessonId = 'L1';
    render(<StudentPageClient />);
    (await screen.findByTestId('academy-node-workshop')).click();
    expect(knobs.push).toHaveBeenCalledWith('/en/student/craft?lesson=L1');
    screen.getByTestId('academy-node-review').click();
    expect(knobs.push).toHaveBeenCalledWith('/en/student/review?lesson=L1');
  });

  it('the Class Arena says the teacher is not live yet instead of going nowhere', async () => {
    render(<StudentPageClient />);
    (await screen.findByTestId('academy-node-arena')).click();
    expect(await screen.findByRole('status')).toHaveTextContent('academy.student.arenaWaiting');
    expect(knobs.push).not.toHaveBeenCalled();
  });

  it('solo practice is a secondary control, not the hero', async () => {
    knobs.lessons = [{ lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [] } }];
    render(<StudentPageClient />);
    const solo = await screen.findByTestId('academy-solo');
    expect(screen.getByTestId('academy-cta')).toHaveAttribute('data-kind', 'next');
    solo.click();
    // academy=1 keeps academy-originated solo play ad-free (5b2bb36e6).
    expect(knobs.push).toHaveBeenCalledWith('/en/quick-play?academy=1');
  });
});
