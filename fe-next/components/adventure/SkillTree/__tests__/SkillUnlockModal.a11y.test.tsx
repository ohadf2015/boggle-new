import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillUnlockModal } from '../SkillUnlockModal';
import type { SkillNode } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const focusTrapSpy = vi.fn();
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: (...args: unknown[]) => focusTrapSpy(...args),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const make = (tag: string) => {
    const Comp = React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ...props, ref }, children)
    );
    Comp.displayName = `MockAdaptive_${tag}`;
    return Comp;
  };
  return {
    AdaptiveMotion: {
      div: make('div'),
      button: make('button'),
      h2: make('h2'),
      h3: make('h3'),
      p: make('p'),
    },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const skill: SkillNode = {
  id: 'fire-start',
  path: 'power',
  tier: 1,
  icon: '🔥',
  nameKey: 'adventure.skills.fireStart.name',
  descriptionKey: 'adventure.skills.fireStart.desc',
  cost: 1,
  prerequisites: [],
  maxRank: 1,
} as unknown as SkillNode;

describe('SkillUnlockModal a11y', () => {
  beforeEach(() => {
    focusTrapSpy.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing when skill is null', () => {
    const { container } = render(<SkillUnlockModal skill={null} onClose={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('exposes role="dialog" and aria-modal="true"', () => {
    render(<SkillUnlockModal skill={skill} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('links dialog to its heading via aria-labelledby', () => {
    render(<SkillUnlockModal skill={skill} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toBeInTheDocument();
  });

  it('activates focus trap while open', () => {
    const onClose = vi.fn();
    render(<SkillUnlockModal skill={skill} onClose={onClose} />);
    expect(focusTrapSpy).toHaveBeenCalled();
    const [, active, onExit] = focusTrapSpy.mock.calls[0];
    expect(active).toBe(true);
    expect(onExit).toBe(onClose);
  });
});
