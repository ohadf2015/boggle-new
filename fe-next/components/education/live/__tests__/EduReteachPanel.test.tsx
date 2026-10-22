import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EduReteachPanel } from '@/components/education/live/EduReteachPanel';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const words = [
  { word: 'membrane', found: 0, of: 25 },
  { word: 'enzyme', found: 3, of: 25 },
];

describe('EduReteachPanel', () => {
  it('given most-missed words, when the wall shows them, then each word carries how many students found it', () => {
    render(<EduReteachPanel words={words} underHalf={0} status="idle" onReplay={vi.fn()} t={t} />);
    const chips = screen.getAllByTestId('edu-most-missed-word');
    expect(chips.map((c) => c.textContent)).toEqual(['membrane0/25', 'enzyme3/25']);
  });

  it('given the replay button, when tapped, then it replays exactly the list on the wall', () => {
    const onReplay = vi.fn();
    render(<EduReteachPanel words={words} underHalf={0} status="idle" onReplay={onReplay} t={t} />);
    expect(screen.getByTestId('edu-replay-missed')).toHaveTextContent('eduLiveRoom.hostResults.replayMissed:{"count":2}');
    fireEvent.click(screen.getByTestId('edu-replay-missed'));
    expect(onReplay).toHaveBeenCalledWith(['membrane', 'enzyme']);
  });

  it('given more words than the wall prints, when shown, then the rest are counted and still replayed', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ word: `w${i}`, found: 0, of: 25 }));
    const onReplay = vi.fn();
    render(<EduReteachPanel words={many} underHalf={0} status="idle" onReplay={onReplay} t={t} />);
    expect(screen.getAllByTestId('edu-most-missed-word').length).toBeLessThan(11);
    expect(screen.getByTestId('edu-most-missed-more')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('edu-replay-missed'));
    expect(onReplay.mock.calls[0][0]).toHaveLength(11);
  });

  it('given students under half, when the wall shows the panel, then it gives a count and never a name', () => {
    render(<EduReteachPanel words={words} underHalf={3} status="idle" onReplay={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-needs-help-count')).toHaveTextContent('eduLiveRoom.hostResults.needHelpCount:{"count":3}');
  });

  it('given a pending replay, when shown, then the button is busy and cannot double-fire', () => {
    render(<EduReteachPanel words={words} underHalf={0} status="pending" onReplay={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-replay-missed')).toBeDisabled();
  });

  it('given a failed replay, when shown, then the teacher reads why and can retry', () => {
    const onReplay = vi.fn();
    render(<EduReteachPanel words={words} underHalf={0} status="failed" onReplay={onReplay} t={t} />);
    expect(screen.getByTestId('edu-replay-failed')).toHaveTextContent('eduLiveRoom.hostResults.replayFailed');
    fireEvent.click(screen.getByTestId('edu-replay-missed'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('given a word the board never carried, when shown, then the chip says so instead of 0/N', () => {
    render(<EduReteachPanel words={[{ word: 'enzyme', found: 0, of: 25, notOnBoard: true }]} underHalf={0} status="idle" onReplay={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-most-missed-word')).toHaveTextContent('enzymeeduLiveRoom.hostResults.notOnBoard');
  });

  it('given the room was narrowed after the wait ran out, when shown, then the teacher reads that Play again now uses these words', () => {
    render(<EduReteachPanel words={words} underHalf={0} status="ready" onReplay={vi.fn()} t={t} />);
    expect(screen.getByTestId('edu-replay-ready')).toHaveTextContent('eduLiveRoom.hostResults.replayReady');
  });

  it('given nothing missed, when the round ends, then the panel does not render', () => {
    const { container } = render(<EduReteachPanel words={[]} underHalf={0} status="idle" onReplay={vi.fn()} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
