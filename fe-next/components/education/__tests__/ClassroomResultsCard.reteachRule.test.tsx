import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClassroomResultsCard } from '../ClassroomResultsCard';
import { reteachList } from '../live/eduReteachModel';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const base: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 3,
  coverage: [],
  missedWords: [],
  classFoundCount: 3,
  masteryByPlayer: {
    Maya: { found: 3, total: 3 },
    Noa: { found: 2, total: 3 },
    Eli: { found: 2, total: 3 },
  },
};

const renderTeacher = (summary: ClassroomSummary) =>
  render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher onReteach={vi.fn()} />);

describe('ClassroomResultsCard — the replay follows the same rule as the wall', () => {
  it('given a word only one student of three found, when nobody missed it outright, then the card still offers the replay on it', () => {
    const summary = {
      ...base,
      coverage: [
        { word: 'photon', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'atom', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'neutron', foundBy: ['Maya'] },
      ],
    };
    renderTeacher(summary);
    const box = screen.getByTestId('reteach-list');
    expect(box).toHaveTextContent('eduLiveRoom.hostResults.mostMissed');
    expect(within(box).getAllByTestId('reteach-word').map((el) => el.textContent)).toEqual(['neutron1/3']);
    expect(screen.getByTestId('play-reteach-round')).toBeInTheDocument();
    expect(screen.queryByText('education.results.allFound')).not.toBeInTheDocument();
  });

  it('given a replay, when shown, then the listed words are exactly the ones it sends', () => {
    const summary = {
      ...base,
      coverage: [
        { word: 'photon', foundBy: [] },
        { word: 'atom', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'neutron', foundBy: ['Maya'] },
      ],
      missedWords: ['photon'],
    };
    renderTeacher(summary);
    const listed = screen.getAllByTestId('reteach-word').map((el) => el.getAttribute('data-word'));
    expect(listed).toEqual(reteachList(summary).map((w) => w.word));
  });

  it('given every word found by most of the class, when shown, then it says all found and offers no replay', () => {
    const summary = {
      ...base,
      coverage: [
        { word: 'photon', foundBy: ['Maya', 'Noa'] },
        { word: 'atom', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'neutron', foundBy: ['Maya', 'Eli'] },
      ],
    };
    renderTeacher(summary);
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
  });

  it('given every word under half, when shown, then it says the whole lesson runs again, never "all found", and keeps the send-home options', () => {
    const summary = {
      ...base,
      classFoundCount: 1,
      coverage: [
        { word: 'photon', foundBy: [] },
        { word: 'atom', foundBy: ['Maya'] },
        { word: 'neutron', foundBy: [] },
      ],
      missedWords: ['photon', 'neutron'],
    };
    renderTeacher(summary);
    expect(screen.getByText('education.results.wholeLessonAgain')).toBeInTheDocument();
    expect(screen.queryByText('education.results.allFound')).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
    expect(screen.getByTestId('reteach-more-actions')).toBeInTheDocument();
  });

  it('given a replay but no word missed outright, when shown, then no send-home control is offered that would have nothing to send', () => {
    const summary = {
      ...base,
      coverage: [
        { word: 'photon', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'atom', foundBy: ['Maya', 'Noa', 'Eli'] },
        { word: 'neutron', foundBy: ['Maya'] },
      ],
    };
    renderTeacher(summary);
    expect(screen.queryByTestId('reteach-more-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('print-missed-words-practice-sheet')).not.toBeInTheDocument();
  });

  it('given Play again could not reach the room, when shown, then the teacher is told and can try again', () => {
    render(<ClassroomResultsCard summary={base} username="Ms. Cohen" isTeacher onRematch={vi.fn()} rematchOffline />);
    expect(screen.getByRole('alert')).toHaveTextContent('eduLiveRoom.hostResults.playAgainOffline');
  });
});
