import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { PRACTICE_SEAT_RETRY_EVENT } from '@/host/hooks/useRehearseAutoStart';
import '@testing-library/jest-dom';
import { PracticeRunPanel } from '@/components/education/live/PracticeRunPanel';

const t = (key: string) => key;

function setViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes('min-width: 1024px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('PracticeRunPanel on a phone', () => {
  beforeEach(() => setViewport(false));

  it('given a phone, then no student page loads in a hidden frame; the card offers a new tab instead', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined={false} t={t} />);
    expect(screen.queryByTestId('practice-run-frame')).toBeNull();
    expect(screen.queryByTestId('practice-run-panel')).toBeNull();
    expect(screen.getByTestId('practice-run-open-tab')).toHaveAttribute('href', '/en/education/live?room=AB12CD&practiceSeat=1');
  });

  it('given a phone, then the practice card sits above the fixed teacher bar instead of under it', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined t={t} />);
    expect(screen.getByTestId('practice-run-card').className).toContain('--lc-teacher-bar-h');
  });
});

describe('PracticeRunPanel', () => {
  beforeEach(() => setViewport(true));

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

  it('given the practice run, then it shows one status and the student view, with no step list, body copy or QR to read first', () => {
    const { container } = render(<PracticeRunPanel gameCode="AB12CD" language="en" joined={false} t={t} />);
    expect(container.textContent).not.toMatch(/eduLiveRoom\.practice\.(step\d|body|phoneTitle|phoneHint)/);
    expect(container.querySelector('svg[role="img"], canvas')).toBeNull();
    expect(container.querySelectorAll('svg path[d^="M0 0h"]').length).toBe(0);
  });

  it('given the wide panel, then its status sits under the title, clear of the page sound button in the top corner', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined t={t} />);
    const header = document.getElementById('practice-run-title')?.parentElement as HTMLElement;
    expect(header.className).toContain('flex-col');
  });

  it('given the seat timed out and the teacher tries again, then the student page reloads', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined={false} t={t} />);
    const before = screen.getByTestId('practice-run-frame');
    act(() => {
      window.dispatchEvent(new Event(PRACTICE_SEAT_RETRY_EVENT));
    });
    expect(screen.getByTestId('practice-run-frame')).not.toBe(before);
  });

  it('given a wide screen, then only the side panel renders, not a second hidden phone card', () => {
    render(<PracticeRunPanel gameCode="AB12CD" language="en" joined t={t} />);
    expect(screen.queryByTestId('practice-run-card')).toBeNull();
  });
});
