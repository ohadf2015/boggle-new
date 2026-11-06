import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PracticeRunPanel } from '@/components/education/live/PracticeRunPanel';

const t = (key: string) => key;

describe('PracticeRunPanel', () => {
  it('given a practice run, when the board opens, then the student page sits beside it as a practice seat, never a host page', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="he" joined={false} t={t} />);
    const frame = screen.getByTestId('practice-run-frame');
    expect(frame).toHaveAttribute('src', '/he/education/live?room=AB12CD&practiceSeat=1');
    expect(frame.getAttribute('src')).not.toContain('host=1');
    expect(screen.getAllByTestId('practice-run-open-tab')[0]).toHaveAttribute('href', '/he/education/live?room=AB12CD&practiceSeat=1');
    expect(screen.getAllByTestId('practice-run-status')[0]).toHaveTextContent('eduLiveRoom.practice.joining');
  });

  it('given the practice seat joined, then the panel says so', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined t={t} />);
    expect(screen.getAllByTestId('practice-run-status')[0]).toHaveTextContent('eduLiveRoom.practice.joined');
  });

  it('given the teacher hides the student view, then one button brings it back', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined t={t} />);
    fireEvent.click(screen.getAllByTestId('practice-run-hide')[0]);
    expect(screen.queryByTestId('practice-run-frame')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('practice-run-show'));
    expect(screen.getByTestId('practice-run-frame')).toBeInTheDocument();
  });
});
