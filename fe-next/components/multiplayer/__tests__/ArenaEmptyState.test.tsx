import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const tMock = vi.fn((key: string, _p?: Record<string, unknown>) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: 'ltr', language: 'en' }),
}));

vi.mock('next/image', () => ({
  default: function MockImage({ alt, src, ...rest }: { alt?: string; src?: string } & Record<string, unknown>) {
    // Strip non-DOM props to avoid React warnings
    const { fill, priority, ...domRest } = rest as Record<string, unknown>;
    void fill; void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ''} src={src} {...(domRest as Record<string, unknown>)} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    children,
}));

import ArenaEmptyState from '../ArenaEmptyState';

const props = { languageName: 'Hebrew' };

describe('ArenaEmptyState', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('Given no rooms in a language, When shown, Then the mascot and a line naming that language render', () => {
    const { container } = render(<ArenaEmptyState {...props} />);
    expect(screen.getByTestId('arena-empty-state')).toBeInTheDocument();
    expect(tMock).toHaveBeenCalledWith('mpUi.entry.emptyInLanguage', { language: 'Hebrew' });
    expect(screen.getByText('mpUi.entry.emptyLine')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/mascot/spectating.webp');
  });

  // With no open arena the mascot is the entry's LCP element; a lazy image would start loading only after layout.
  it('loads the mascot eagerly', () => {
    const { container } = render(<ArenaEmptyState {...props} />);
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager');
  });

  // The entry keeps one CREATE (footer / side column); the line points at QUICK START.
  it('Given the empty state, When shown, Then it adds no second CREATE and nothing links out of MP', () => {
    const { container } = render(<ArenaEmptyState {...props} />);
    expect(screen.queryByTestId('arena-empty-start')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelector('a')).toBeNull();
  });

  // Live check 2026-11-12: on a tall phone the dashed box was mostly empty
  // around a 56-88px mascot. The box is now a size container and the mascot's
  // height tracks it (cqh), with a floor so the lines always fit.
  it('grows the mascot with the box on phones, keeping a floor for its lines', () => {
    render(<ArenaEmptyState {...props} />);
    const box = screen.getByTestId('arena-empty-state');
    expect(box.className).toMatch(/\bmp-arena-empty\b/);
    expect(box.className).toMatch(/\bmin-h-\[14\.5rem\]/);
    expect(screen.getByTestId('arena-empty-mascot').className).toMatch(/h-\[clamp\(56px,calc\(100cqh_-_172px\),180px\)\]/);
  });

  it('Given rooms open in another language, When shown, Then a chip switches to it', () => {
    const onSwitch = vi.fn();
    render(<ArenaEmptyState {...props} elsewhere={{ flag: 'x', name: 'English', count: 2, onSwitch }} />);
    fireEvent.click(screen.getByTestId('arena-empty-elsewhere'));
    expect(onSwitch).toHaveBeenCalled();
  });
});
