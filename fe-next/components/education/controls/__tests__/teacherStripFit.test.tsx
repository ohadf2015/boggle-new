import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeacherLiveControls } from '../../TeacherLiveControls';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'ru', t: (k: string) => k }) }));

describe('teacher strip at projector widths', () => {
  it('given a quiz round, then each control takes its label width and the short ones never wrap', () => {
    const noop = vi.fn();
    render(<TeacherLiveControls isPaused={false} isQuizRound onPause={noop} onResume={noop} onExtendTime={noop} onEndRound={noop} onSkipWord={noop} />);
    for (const id of ['teacher-pause-toggle', 'teacher-extend-time', 'teacher-skip-word', 'teacher-end-round']) {
      expect(screen.getByTestId(id).className, id).toContain('lg:basis-auto');
    }
    expect(screen.getByTestId('teacher-pause-toggle').className).toContain('lg:shrink-0');
    expect(screen.getByTestId('teacher-extend-time').className).toContain('lg:shrink-0');
    expect(screen.getByTestId('teacher-skip-word').className).not.toContain('shrink-0');
  });
});
