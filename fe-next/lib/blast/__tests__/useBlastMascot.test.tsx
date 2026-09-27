/**
 * useBlastMascot — TDD for the React hook that wraps the pure mascot reducer.
 * Provides current state + a fire(event) callback. Uses Date.now() internally
 * so callers don't need to pass time.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { useBlastMascot } from '../useBlastMascot';
import { MASCOT_VISIBLE_MS } from '../mascotState';

function Probe({
  onMount,
}: {
  onMount: (api: ReturnType<typeof useBlastMascot>) => void;
}) {
  const api = useBlastMascot();
  React.useEffect(() => {
    onMount(api);
  }, [api, onMount]);
  return (
    <div
      data-testid="probe"
      data-state={api.state}
      data-visible={String(api.visible)}
    />
  );
}

describe('useBlastMascot', () => {
  it('starts in idle state', () => {
    let captured: ReturnType<typeof useBlastMascot> | null = null;
    render(<Probe onMount={(api) => (captured = api)} />);
    expect(captured!.state).toBe('idle');
  });

  it('fires a word-submitted event and transitions to cheer', () => {
    let captured: ReturnType<typeof useBlastMascot> | null = null;
    const { getByTestId } = render(
      <Probe onMount={(api) => (captured = api)} />,
    );
    act(() => {
      captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
    });
    // After event, the probe re-renders with new state
    expect(getByTestId('probe').getAttribute('data-state')).toBe('cheer');
  });

  it('respects global cooldown — second event within 4s is ignored', () => {
    let captured: ReturnType<typeof useBlastMascot> | null = null;
    const { getByTestId } = render(
      <Probe onMount={(api) => (captured = api)} />,
    );
    act(() => {
      captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
    });
    expect(getByTestId('probe').getAttribute('data-state')).toBe('cheer');
    // Same instant: second event should be cooldown-blocked
    act(() => {
      captured!.fire({ kind: 'word-submitted', wordLength: 7, gemLetterUsed: false });
    });
    expect(getByTestId('probe').getAttribute('data-state')).toBe('cheer');
  });

  it('lifecycle wave-fail bypasses cooldown — always shows', () => {
    let captured: ReturnType<typeof useBlastMascot> | null = null;
    const { getByTestId } = render(
      <Probe onMount={(api) => (captured = api)} />,
    );
    act(() => {
      captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
    });
    act(() => {
      captured!.fire({ kind: 'wave-fail' });
    });
    expect(getByTestId('probe').getAttribute('data-state')).toBe('sad-supportive');
  });

  describe('transient visibility — celebrate briefly, then get out of the way', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('starts hidden so the mascot never occludes the HUD at rest', () => {
      let captured: ReturnType<typeof useBlastMascot> | null = null;
      render(<Probe onMount={(api) => (captured = api)} />);
      expect(captured!.visible).toBe(false);
    });

    it('reveals on a reaction, then auto-hides after MASCOT_VISIBLE_MS', () => {
      let captured: ReturnType<typeof useBlastMascot> | null = null;
      const { getByTestId } = render(
        <Probe onMount={(api) => (captured = api)} />,
      );
      act(() => {
        captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
      });
      expect(getByTestId('probe').getAttribute('data-visible')).toBe('true');

      act(() => {
        vi.advanceTimersByTime(MASCOT_VISIBLE_MS + 1);
      });
      expect(getByTestId('probe').getAttribute('data-visible')).toBe('false');
    });

    it('a new reaction before the timer elapses extends the visible window', () => {
      let captured: ReturnType<typeof useBlastMascot> | null = null;
      const { getByTestId } = render(
        <Probe onMount={(api) => (captured = api)} />,
      );
      act(() => {
        captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
      });
      // wave-fail bypasses cooldown, so it retriggers a fresh visible window.
      act(() => {
        vi.advanceTimersByTime(MASCOT_VISIBLE_MS - 100);
        captured!.fire({ kind: 'wave-fail' });
      });
      // Old timer would have fired here; the refreshed one should keep it up.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(getByTestId('probe').getAttribute('data-visible')).toBe('true');
    });

    it('does not reveal when an event is cooldown-blocked (no real transition)', () => {
      let captured: ReturnType<typeof useBlastMascot> | null = null;
      const { getByTestId } = render(
        <Probe onMount={(api) => (captured = api)} />,
      );
      act(() => {
        captured!.fire({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false });
      });
      act(() => {
        vi.advanceTimersByTime(MASCOT_VISIBLE_MS + 1);
      });
      expect(getByTestId('probe').getAttribute('data-visible')).toBe('false');
      // Within global cooldown → blocked → must not re-reveal.
      act(() => {
        captured!.fire({ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false });
      });
      expect(getByTestId('probe').getAttribute('data-visible')).toBe('false');
    });
  });
});
