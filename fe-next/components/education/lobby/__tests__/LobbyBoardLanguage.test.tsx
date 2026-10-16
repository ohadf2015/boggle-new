import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: Record<string, unknown>) => {
      const text = typeof a === 'string' ? a : k;
      const params = (typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? text.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? '')) : text;
    },
    language: 'en',
  }),
}));
vi.mock('../../ClassroomBattleSettings', () => ({ ClassroomBattleSettings: () => null }));

import { LobbySetupDisclosure } from '../LobbySetupDisclosure';
import { LobbySetupPanel } from '../LobbySetupPanel';

const lesson = (id: string, language: string) =>
  ({ id, name: `List ${id}`, language, description: null, words: [{ word: 'cat' }] }) as never;
const classroom = (id: string, language: string) => ({ id, name: `Class ${id}`, language, member_count: 3 }) as never;

describe('board language in the lobby', () => {
  it('Given a board language, Then the closed setup summary shows its flag and name next to GO LIVE', () => {
    render(
      <LobbySetupDisclosure classroomName="7B" lessonNames={['Animals']} wordCount={4} incomplete={false} open={false} onToggle={vi.fn()} boardLanguage="he">
        <div />
      </LobbySetupDisclosure>
    );
    const chip = within(screen.getByTestId('lobby-setup-summary')).getByTestId('board-language-chip');
    expect(chip).toHaveTextContent('עברית');
    expect(chip).toHaveTextContent('🇮🇱');
  });

  it('Given no lesson yet, Then no board chip is shown', () => {
    render(
      <LobbySetupDisclosure classroomName="7B" lessonNames={[]} wordCount={0} incomplete open={false} onToggle={vi.fn()} boardLanguage={null}>
        <div />
      </LobbySetupDisclosure>
    );
    expect(screen.queryByTestId('board-language-chip')).toBeNull();
  });

  const panelProps = {
    classrooms: [classroom('c1', 'en')],
    lessons: [lesson('en1', 'en'), lesson('he1', 'he')],
    selectedClassroomId: 'c1',
    wordCount: 1,
    activePreset: null,
    playStyle: 'ffa' as const,
    teamCount: 2,
    accessibility: {},
    onSelectClassroom: vi.fn(),
    onApplyPreset: vi.fn(),
    onPlayStyleChange: vi.fn(),
    onTeamCountChange: vi.fn(),
    onAccessibilityChange: vi.fn(),
  };

  it('Given the setup panel, Then the class language lists come first and the board chip sits by the word count', () => {
    render(<LobbySetupPanel {...panelProps} selectedLessonIds={['en1']} onSelectLessons={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/List en1/);
    expect(screen.getByTestId('board-language-chip')).toHaveTextContent('English');
  });

  it('Given a Hebrew list in an English class, Then the panel says the board will use Hebrew letters', () => {
    render(<LobbySetupPanel {...panelProps} selectedLessonIds={['he1']} onSelectLessons={vi.fn()} />);
    expect(screen.getByTestId('lesson-class-mismatch')).toHaveTextContent(/עברית/);
  });

  it('When a list in another language is tapped, Then the selection switches instead of mixing', () => {
    const onSelectLessons = vi.fn();
    render(<LobbySetupPanel {...panelProps} selectedLessonIds={['en1']} onSelectLessons={onSelectLessons} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /List he1/ }));
    expect(onSelectLessons).toHaveBeenCalledWith(['he1']);
  });
});
