import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EducationKitLanding } from '../EducationKitLanding';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';
import { getBoggleForKidsContent } from '@/app/[locale]/education/boggle-for-kids/content';
import { getEslWordGamesLanding } from '@/app/[locale]/education/esl-word-games/landing';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const hrefs = (root: ParentNode) => [...root.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('EducationKitLanding', () => {
  it('keeps the H1 text, one lime hero CTA and the speakable answer', () => {
    const content = getBoggleForKidsContent('en');
    const { container } = render(<EducationKitLanding locale="en" path="/education/boggle-for-kids" content={content} />);
    const { part1, highlight, part2 } = content.hero.h1;
    expect(container.querySelector('h1')?.textContent).toBe(`${part1} ${highlight}${part2}`);
    expect(container.querySelector('[data-hero-primary]')).toHaveAttribute('href', `/en${content.hero.primaryCta.href}`);
    expect(container.querySelector('[data-answer]')?.textContent).toContain(content.answer!.answer);
    expect(container.querySelector('[data-testid="no-account-cta"] [data-lc-cta="play_now"]')).toHaveAttribute('href', '/en/education/classroom-game');
    expect(container.querySelector('[data-testid="teacher-pro-compare-checkout-strip"]')).not.toBeNull();
  });

  it('puts the highlight chip on real words only, never on filler like "for the"', () => {
    const marked = (content: ReturnType<typeof getBoggleForKidsContent>, path: string) => {
      const { container, unmount } = render(<EducationKitLanding locale="en" path={path} content={content} />);
      const chip = container.querySelector('h1 span.box-decoration-clone')?.textContent ?? null;
      unmount();
      return chip;
    };
    const kids = getBoggleForKidsContent('en');
    expect(marked(kids, '/education/boggle-for-kids')).toBe(kids.hero.h1.highlight);
    const filler = { ...kids, hero: { ...kids.hero, h1: { part1: 'Games', highlight: 'for the', part2: ' class' } } };
    expect(marked(filler, '/education/boggle-for-kids')).toBeNull();
  });

  it('folds the FAQ but keeps every question an h3', () => {
    const content = getBoggleForKidsContent('en');
    const { container } = render(<EducationKitLanding locale="en" path="/education/boggle-for-kids" content={content} />);
    const faq = container.querySelector('[data-geo-faq]')!;
    for (const { q, a } of content.faqs) {
      expect(screen.getByRole('heading', { level: 3, name: q }).closest('summary')).not.toBeNull();
      expect(faq.textContent).toContain(a);
    }
  });

  it('links the same related pages as the shared rail', () => {
    const content = getBoggleForKidsContent('en');
    const { container } = render(<EducationKitLanding locale="en" path="/education/boggle-for-kids" content={content} />);
    const old = render(
      <EducationRelatedLinks
        locale="en"
        slug="boggle-for-kids"
        extra={content.related}
        count={Math.max(3, content.related.length + 3)}
      />,
    );
    const mine = new Set(hrefs(container));
    for (const href of hrefs(old.container)) expect(mine).toContain(href);
  });

  it('keeps teacher and district CTA tracking hooks', () => {
    const content = getBoggleForKidsContent('en');
    const { container } = render(<EducationKitLanding locale="en" path="/education/boggle-for-kids" content={content} />);
    for (const cta of ['signup', 'pro_trial', 'for_schools']) {
      expect(container.querySelector(`[data-lc-cta="${cta}"]`), cta).not.toBeNull();
    }
    expect(container.querySelector('[data-testid="teacher-pro-trial-landing-cta"]')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('renders class games, depth answers and play formats with their headings', () => {
    const content = getEslWordGamesLanding('en');
    const { container } = render(<EducationKitLanding locale="en" path="/education/esl-word-games" content={content} />);
    const games = content.sections.flatMap((s) => (s.kind === 'classgames' ? s.section.games : []));
    expect(games.length).toBeGreaterThan(0);
    for (const g of games) {
      expect(screen.getByRole('heading', { level: 3, name: g.name }).closest('summary')).not.toBeNull();
      expect(container.textContent).toContain(g.rules);
    }
    const depth = content.sections.flatMap((s) => (s.kind === 'depth' ? s.sections : []));
    for (const d of depth) expect(screen.getByRole('heading', { level: 2, name: d.heading })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-answer]').length).toBeGreaterThan(depth.length);
  });
});
