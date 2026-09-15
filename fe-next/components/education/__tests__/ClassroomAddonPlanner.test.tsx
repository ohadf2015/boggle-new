/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassroomAddonPlanner } from '../ClassroomAddonPlanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars && typeof vars === 'object') {
        return `${key}:${JSON.stringify(vars)}`;
      }
      return key;
    },
    language: 'en',
  }),
}));

describe('ClassroomAddonPlanner', () => {
  it('routes Unplugged reteach prompt into Live + grade passback links', () => {
    render(
      <ClassroomAddonPlanner
        locale="en"
        initialPrompt="Unplugged reteach on yesterday's misses"
        initialLesson="Physics 101"
        initialMissedWords={['neutron', 'quark']}
      />,
    );
    expect(screen.getByTestId('classroom-addon-planner')).toHaveAttribute(
      'data-mode',
      'unplugged_reteach',
    );
    const live = screen.getByTestId('classroom-addon-planner-open-live');
    const href = live.getAttribute('href') || '';
    expect(href).toContain('/education/unplugged-reteach');
    expect(href).toContain('neutron');
    expect(href).not.toContain('lexiclash.com');

    const grade = screen.getByTestId('classroom-addon-planner-grade-passback');
    expect(grade.getAttribute('href') || '').toContain('/education/unplugged-grade-passback');
  });

  it('routes 3-min CEFR prompt and seeds gap words', () => {
    render(
      <ClassroomAddonPlanner locale="en" initialPrompt="3-min Live on CEFR A1 gaps" />,
    );
    expect(screen.getByTestId('classroom-addon-planner')).toHaveAttribute(
      'data-mode',
      'reteach_live_3min',
    );
    expect(screen.getByTestId('classroom-addon-planner-open-live')).toBeInTheDocument();
  });

  it('routes Classic Unplugged from an example chip', () => {
    render(<ClassroomAddonPlanner locale="en" initialMissedWords={['atom']} />);
    fireEvent.click(screen.getByText('Classic Unplugged with the class'));
    expect(screen.getByTestId('classroom-addon-planner')).toHaveAttribute(
      'data-mode',
      'classic_unplugged',
    );
    const href = screen.getByTestId('classroom-addon-planner-open-live').getAttribute('href') || '';
    expect(href).toContain('/education/classic-unplugged');
  });

  it('shows need-prompt until the teacher types', () => {
    render(<ClassroomAddonPlanner locale="en" initialMissedWords={['atom']} />);
    expect(screen.getByTestId('classroom-addon-planner-need-input')).toBeInTheDocument();
  });
});
