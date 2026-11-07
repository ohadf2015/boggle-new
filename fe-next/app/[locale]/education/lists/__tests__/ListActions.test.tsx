// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const auth = vi.hoisted(() => ({ value: { user: null as unknown, isTeacher: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
const writeIntent = vi.fn();
vi.mock('@/components/teacher/dashboard/quickLaunchIntent', () => ({
  writeQuickLaunchIntent: (...a: unknown[]) => writeIntent(...a),
  QUICK_LAUNCH_FLOW: 'quick',
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ListActions, type ListActionsLabels } from '../_components/ListActions';

const mode = { title: 't', sub: 's' };
const labels = {
  playClass: 'Play with class',
  playClassSub: '',
  practiceSolo: 'Practice',
  practiceSoloSub: '',
  modesTitle: 'Modes',
  modes: { tiles: mode, grid: mode, spelling: mode, matching: mode },
  close: 'Close',
  pick: 'Pick',
  overlayTitle: 'Practice',
  spell: {},
} as unknown as ListActionsLabels;

function clickPlayClass() {
  const { container } = render(
    <ListActions locale="en" signupHref="/en/education/access?from=x" title="L" lang="en" words={[{ word: 'cat', definition: '' }]} playable={['cat']} labels={labels} />,
  );
  const a = container.querySelector('[data-cta="play-class"]')!;
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
  fireEvent(a, ev);
  return ev.defaultPrevented;
}

describe('ListActions play-with-class', () => {
  beforeEach(() => {
    push.mockReset();
    writeIntent.mockReset();
  });

  it('Given a signed-in teacher, When play-with-class is clicked, Then the list goes straight to quick launch', () => {
    auth.value = { user: { id: 't', is_anonymous: false }, isTeacher: true };
    expect(clickPlayClass()).toBe(true);
    expect(writeIntent).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/en/education/classroom-game?flow=quick');
  });

  it('Given an anonymous guest student with a session, When play-with-class is clicked, Then it follows the sign-up link', () => {
    auth.value = { user: { id: 'g', is_anonymous: true }, isTeacher: false };
    expect(clickPlayClass()).toBe(false);
    expect(writeIntent).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('Given a signed-in non-teacher, When play-with-class is clicked, Then it follows the sign-up link', () => {
    auth.value = { user: { id: 'p', is_anonymous: false }, isTeacher: false };
    expect(clickPlayClass()).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});
