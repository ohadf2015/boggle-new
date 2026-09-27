import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MissionsCompletedNote, RecordBadges } from '../RecordBadges';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('RecordBadges', () => {
  it('renders a lime NEW RECORD badge on the score and the longest word', () => {
    render(
      <RecordBadges scoreIsRecord wordIsRecord score={140} longestWord="planets" />,
    );
    expect(screen.getAllByText('singlePlayer.records.newRecord')).toHaveLength(2);
    const score = screen.getByTestId('record-score');
    expect(score.querySelector('[dir="ltr"]')).toHaveTextContent('140');
    expect(score.querySelector('span.bg-neo-lime')).not.toBeNull();
    expect(screen.getByTestId('record-word')).toHaveTextContent('planets');
    expect(screen.getByTestId('record-word').querySelector('[dir="ltr"]')).toBeNull();
  });

  it('renders nothing when the round set no record', () => {
    const { container } = render(
      <RecordBadges scoreIsRecord={false} wordIsRecord={false} score={10} longestWord="cat" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the missions-completed count ltr, and hides a zero count', () => {
    const { rerender } = render(<MissionsCompletedNote count={2} />);
    const note = screen.getByTestId('missions-completed');
    expect(note.querySelector('[dir="ltr"]')).toHaveTextContent('2/3');
    expect(note).toHaveTextContent('singlePlayer.missions.done');
    rerender(<MissionsCompletedNote count={0} />);
    expect(screen.queryByTestId('missions-completed')).toBeNull();
  });
});
