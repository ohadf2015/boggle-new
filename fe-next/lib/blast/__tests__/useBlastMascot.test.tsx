/**
 * useBlastMascot — TDD for the React hook that wraps the pure mascot reducer.
 * Provides current state + a fire(event) callback. Uses Date.now() internally
 * so callers don't need to pass time.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { useBlastMascot } from '../useBlastMascot';

function Probe({
  onMount,
}: {
  onMount: (api: ReturnType<typeof useBlastMascot>) => void;
}) {
  const api = useBlastMascot();
  React.useEffect(() => {
    onMount(api);
  }, [api, onMount]);
  return <div data-testid="probe" data-state={api.state} />;
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
});
