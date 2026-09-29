import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn(), playErrorSound: vi.fn() }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...p }: Record<string, unknown>) => React.createElement('a', { href, ...p } as never),
}));
vi.mock('@/components/student/academy/AcademyDock', () => ({ AcademyDock: () => <nav data-testid="dock" /> }));

import { AcademyCta } from '../AcademyCta';
import { AcademyHud } from '../AcademyHud';
import { AcademyNodeButton } from '../AcademyNodeButton';
import { AcademyPageFrame } from '@/components/student/pages/AcademyPageFrame';
import type { AcademyIsland } from '../academyIslands';

const lesson: AcademyIsland = { key: 'l1', kind: 'lesson', type: 'lesson', state: 'open', stars: 0, mastery: 0, name: 'Transition Words - Band 2: Contrasts, Concessions and Everything Else' };

const ctaBase = {
  activeGame: null,
  isJoining: false,
  joinError: null,
  onPress: () => {},
  reducedMotion: true,
};

describe('hero CTA names its lesson in full', () => {
  it.each(['normal', 'big'] as const)('title clamps to two lines instead of truncating (%s)', (size) => {
    render(<AcademyCta {...ctaBase} kind="next" target={lesson} targetLabel={lesson.name!} size={size} />);
    const title = screen.getByTestId('academy-cta-title');
    expect(title.className).not.toContain('truncate');
    expect(title.className).toContain('line-clamp-2');
  });

  it('sublabel clamps too — a teacher name must survive', () => {
    render(<AcademyCta {...ctaBase} kind="live" target={undefined} targetLabel="" />);
    const sub = screen.getByTestId('academy-cta-sub');
    expect(sub.className).not.toContain('truncate');
    expect(sub.className).toContain('line-clamp-2');
  });
});

describe('HUD class tag', () => {
  const hudBase = { userId: 'u1', name: 'P4 Critic', totalXp: 0, streak: 0, stars: 0, isGuest: false, onSignOut: () => {}, reducedMotion: true };

  it('wraps onto its own line instead of ellipsizing the class name', () => {
    render(<AcademyHud {...hudBase} title="1ST BAT GROUP 1" />);
    const tag = screen.getByTestId('academy-class-tag');
    expect(tag.className).not.toContain('max-w-[62%]');
    expect(tag.parentElement!.className).toContain('flex-wrap');
  });

  it('is a status pill, not a heading', () => {
    render(<AcademyHud {...hudBase} title="1ST BAT GROUP 1" />);
    const tag = screen.getByTestId('academy-class-tag');
    expect(tag.tagName).not.toBe('H1');
  });

  it('injects zero <style> tags — keyframes live in the stylesheet', () => {
    const { container } = render(<AcademyHud {...hudBase} streak={5} streakAtRisk reducedMotion={false} />);
    expect(container.querySelector('style')).toBeNull();
  });
});

describe('page frame h1', () => {
  it('keeps a title fallback when truncation is allowed', () => {
    render(<AcademyPageFrame title="A Very Long Lesson Pack Name" art="/x.webp" regionLabel="Lessons"><div /></AcademyPageFrame>);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toContain('truncate');
    expect(h1).toHaveAttribute('title', 'A Very Long Lesson Pack Name');
  });
});

describe('island label', () => {
  it('is part of the hit target — tapping the words opens the node', () => {
    const onOpen = vi.fn();
    const review: AcademyIsland = { key: 'r1', kind: 'review', type: 'quiz', state: 'open', stars: 0, mastery: 0, badge: 10 };
    render(
      <AcademyNodeButton node={review} at={{ x: 50, y: 50 }} index={0} big={false} recommended={false} onOpen={onOpen} reducedMotion />,
    );
    fireEvent.click(screen.getByTestId('academy-node-label'));
    expect(onOpen).toHaveBeenCalledWith(review);
  });

  it('is a real <button> — keyboard and AT semantics come free', () => {
    const review: AcademyIsland = { key: 'r1', kind: 'review', type: 'quiz', state: 'open', stars: 0, mastery: 0, badge: 10 };
    render(
      <AcademyNodeButton node={review} at={{ x: 50, y: 50 }} index={0} big={false} recommended={false} onOpen={() => {}} reducedMotion />,
    );
    expect(screen.getByTestId('academy-node-r1').tagName).toBe('BUTTON');
  });

  it('the landscape-phone svg clamp exempts island art', () => {
    const css = readFileSync(path.join(process.cwd(), 'app/animations.css'), 'utf8');
    expect(css.match(/button:not\(\.svg-free\) svg/g)!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('no per-mount inline keyframes anywhere on the hub', () => {
  it('academy keyframes are defined once in app/globals.css', () => {
    const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
    for (const name of ['academy-flame-calm', 'academy-flame-risk', 'academy-twinkle', 'academy-fall', 'academy-fall-glint', 'academy-beam']) {
      expect(css).toContain(`@keyframes ${name}`);
    }
  });

  it('no hub component injects a <style> tag', () => {
    const hub = ['AcademyHub.tsx', 'AcademyHud.tsx', 'AcademyMap.tsx', 'AcademyNodeButton.tsx', 'AcademyAmbient.tsx', 'AcademyCta.tsx', 'DailyChest.tsx'];
    for (const file of hub) {
      const src = readFileSync(path.join(process.cwd(), 'components/student/academy', file), 'utf8');
      expect(src, file).not.toContain('<style');
    }
  });
});

describe('user-facing labels in student/practice turf never truncate', () => {
  const FILES = [
    'components/student/academy/AcademyCta.tsx',
    'components/student/academy/ClassSheet.tsx',
    'components/student/academy/AcademySidePanel.tsx',
    'components/student/pages/LessonsList.tsx',
    'components/student/StudentLessonView.tsx',
    'components/practice/PracticeHeader.tsx',
    'components/practice/VocabFocusPractice.tsx',
  ];
  it.each(FILES)('%s is truncate-free', (file) => {
    expect(readFileSync(path.join(process.cwd(), file), 'utf8')).not.toContain('truncate');
  });
});
