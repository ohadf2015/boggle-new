import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReteachStatusNote } from '@/components/education/live/ReteachStatusNote';

const t = (key: string) => key;

describe('ReteachStatusNote', () => {
  it('given a replay set for the next round, when shown, then it says so and offers the full list back', () => {
    const onRestoreFull = vi.fn();
    render(<ReteachStatusNote status="ready" onRestoreFull={onRestoreFull} t={t} />);
    expect(screen.getByTestId('edu-replay-ready')).toHaveTextContent('eduLiveRoom.hostResults.replayReady');
    fireEvent.click(screen.getByTestId('edu-use-full-list'));
    expect(onRestoreFull).toHaveBeenCalledTimes(1);
  });

  it('given the full list is on its way, when shown, then the control is busy and cannot be tapped twice', () => {
    render(<ReteachStatusNote status="restoring" onRestoreFull={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-use-full-list')).toBeDisabled();
  });

  it('given the full list could not come back, when shown, then the failure is said and the control stays', () => {
    render(<ReteachStatusNote status="restoreFailed" onRestoreFull={vi.fn()} t={t} />);
    expect(screen.getByRole('alert')).toHaveTextContent('eduLiveRoom.hostResults.fullListFailed');
    expect(screen.getByTestId('edu-use-full-list')).toBeEnabled();
  });

  it('given the replay failed, when shown, then it says so', () => {
    render(<ReteachStatusNote status="failed" onRestoreFull={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-replay-failed')).toHaveTextContent('eduLiveRoom.hostResults.replayFailed');
  });

  it('given a replay the server never answered, when shown, then it does not claim failure and offers the full list back', () => {
    const onRestoreFull = vi.fn();
    render(<ReteachStatusNote status="unconfirmed" onRestoreFull={onRestoreFull} t={t} />);
    expect(screen.getByTestId('edu-replay-unconfirmed')).toHaveTextContent('eduLiveRoom.hostResults.replayUnconfirmed');
    expect(screen.queryByTestId('edu-replay-failed')).toBeNull();
    fireEvent.click(screen.getByTestId('edu-use-full-list'));
    expect(onRestoreFull).toHaveBeenCalledTimes(1);
  });

  it('given a refused replay, when shown, then the room is unchanged so no full list is offered', () => {
    render(<ReteachStatusNote status="failed" onRestoreFull={vi.fn()} t={t} />);
    expect(screen.queryByTestId('edu-use-full-list')).toBeNull();
  });

  it('given nothing in flight, when shown, then it renders nothing', () => {
    const { container } = render(<ReteachStatusNote status="idle" onRestoreFull={vi.fn()} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
