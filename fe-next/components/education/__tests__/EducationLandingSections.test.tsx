import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EducationSectionRenderer, ACCENT } from '../EducationLandingSections';
import type { EducationSection } from '@/lib/seo/educationLanding';

const renderSection = (section: EducationSection) =>
  render(<EducationSectionRenderer section={section} accent="lime" />);

describe('ACCENT palette', () => {
  it('puts navy ink on every accent fill', () => {
    // White text fails AA at body size on purple (4.1:1) and pink (3.6:1),
    // so all four accents take navy ink. Regression guard on that decision.
    for (const accent of ['lime', 'pink', 'cyan', 'purple'] as const) {
      expect(ACCENT[accent].ink).toBe('text-neo-navy');
    }
  });

  it('spells every class out as a literal (Tailwind v4 cannot see composed names)', () => {
    for (const accent of ['lime', 'pink', 'cyan', 'purple'] as const) {
      expect(ACCENT[accent].fill).toBe(`bg-neo-${accent}`);
      expect(ACCENT[accent].text).toBe(`text-neo-${accent}`);
    }
  });
});

describe('EducationSectionRenderer', () => {
  it('renders a features list with a drawn icon per item, not an emoji', () => {
    const { container } = renderSection({
      kind: 'features',
      title: 'What you get',
      items: [
        { icon: 'timer', text: 'Setup in under 60 seconds' },
        { icon: 'users', text: 'Up to 30 students live' },
      ],
    });
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeTruthy();
    expect(screen.getByText('Setup in under 60 seconds')).toBeTruthy();
    // lucide renders <svg>; an emoji fallback would leave zero svg nodes
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('falls back to a neutral icon for an unknown icon name instead of throwing', () => {
    const { container } = renderSection({
      kind: 'features',
      title: 'T',
      items: [{ icon: 'not-a-real-icon', text: 'still renders' }],
    });
    expect(screen.getByText('still renders')).toBeTruthy();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders cards with their optional tag', () => {
    renderSection({
      kind: 'cards',
      title: 'How teachers use it',
      items: [
        { tag: '5-MIN', title: 'Warm-up', desc: 'Open class with a quick round.' },
        { title: 'Untagged', desc: 'No tag on this one.' },
      ],
    });
    expect(screen.getByText('5-MIN')).toBeTruthy();
    expect(screen.getByText('Untagged')).toBeTruthy();
  });

  it('numbers a steps section, because the sequence itself is the information', () => {
    renderSection({
      kind: 'steps',
      title: 'Five minute plan',
      items: [
        { step: '0:00', focus: 'Launch', activity: 'Project the join code.' },
        { step: '1:00', focus: 'Play', activity: 'First Boggle round.' },
      ],
    });
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders a word list as data a teacher can lift off the page', () => {
    renderSection({
      kind: 'wordlist',
      title: 'Dolch words',
      groups: [{ label: 'Pre-primer', words: ['the', 'and', 'away'] }],
    });
    expect(screen.getByText('Pre-primer')).toBeTruthy();
    for (const w of ['the', 'and', 'away']) {
      expect(screen.getByText(w)).toBeTruthy();
    }
  });

  it('renders a table with scoped column headers and lets it scroll on its own', () => {
    const { container } = renderSection({
      kind: 'table',
      title: 'Grade bands',
      columns: ['Grade', 'Words'],
      rows: [['2nd', '46'], ['3rd', '41']],
    });
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Grade', 'Words']);
    expect(headers.every((h) => h.getAttribute('scope') === 'col')).toBe(true);
    // Wide content must scroll inside its own container, never the page body
    expect(container.querySelector('.overflow-x-auto')).toBeTruthy();
  });

  it('caps prose measure so long paragraphs stay readable', () => {
    const { container } = renderSection({
      kind: 'prose',
      title: 'Why it works',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
    });
    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(2);
    expect(paras[0].className).toContain('max-w-[68ch]');
  });
});
