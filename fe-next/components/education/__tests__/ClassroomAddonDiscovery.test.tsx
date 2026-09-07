/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassroomAddonDiscovery } from '../ClassroomAddonDiscovery';

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

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn(() => true),
}));

describe('ClassroomAddonDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a Classroom Stream assign link from missed words (#968 payload)', () => {
    render(
      <ClassroomAddonDiscovery
        locale="en"
        initialLesson="Physics 101"
        initialMissedWords={['neutron', 'quark']}
      />,
    );
    const link = screen.getByTestId('classroom-addon-post-stream');
    const href = link.getAttribute('href') || '';
    expect(href).toContain('https://classroom.google.com/share');
    expect(href).toContain('itemtype=assignment');
    expect(href).toContain(encodeURIComponent('https://www.lexiclash.live/en/education/unplugged-reteach'));
    expect(href).toContain('neutron');
    expect(href).not.toContain('lexiclash.com');
    expect(href).not.toContain('Maya');
  });

  it('hides the Stream CTA until a missed word is present', () => {
    render(<ClassroomAddonDiscovery locale="en" initialMissedWords={[]} />);
    expect(screen.queryByTestId('classroom-addon-post-stream')).not.toBeInTheDocument();
    expect(screen.getByTestId('classroom-addon-need-words')).toBeInTheDocument();
  });

  it('marks when Classroom iframe context is present', () => {
    render(
      <ClassroomAddonDiscovery
        locale="en"
        initialMissedWords={['atom']}
        context={{ courseId: 'c1', addOnToken: 'tok' }}
      />,
    );
    expect(screen.getByTestId('classroom-addon-discovery')).toHaveAttribute(
      'data-in-classroom',
      'true',
    );
  });

  it('opens the printable practice sheet without reinventing #957', async () => {
    const { openMissedWordsPracticeSheet } = await import(
      '@/lib/education/missedWordsPracticeSheet'
    );
    render(
      <ClassroomAddonDiscovery
        locale="en"
        initialLesson="Physics 101"
        initialMissedWords={['neutron']}
      />,
    );
    fireEvent.click(screen.getByTestId('classroom-addon-print-sheet'));
    expect(openMissedWordsPracticeSheet).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(openMissedWordsPracticeSheet).mock.calls[0][0];
    expect(arg.missedWords).toEqual(['neutron']);
    expect(arg.lesson).toContain('Physics 101');
  });
});
