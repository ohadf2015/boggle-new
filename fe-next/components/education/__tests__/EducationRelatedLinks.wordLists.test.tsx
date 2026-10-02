// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EducationRelatedLinks } from '../EducationRelatedLinks';

const hrefs = (c: HTMLElement) => [...c.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');

describe('EducationRelatedLinks word-list rail', () => {
  it('links a landing page into the word-list library in its own locale', () => {
    const { container } = render(<EducationRelatedLinks locale="he" slug="esl-word-games" />);
    const lists = hrefs(container).filter((h) => h.includes('/education/lists'));
    expect(lists.length).toBeGreaterThanOrEqual(3);
    expect(lists.some((h) => h.startsWith('/he/'))).toBe(true);
    expect(container.querySelector('[data-word-list-rail] h2')?.textContent).toBe('רשימות מילים חינמיות למשחק');
  });

  it('keeps the landing-page rotation and adds no rail on Russian pages', () => {
    const { container } = render(<EducationRelatedLinks locale="ru" slug="esl-word-games" />);
    expect(container.querySelector('[data-word-list-rail]')).toBeNull();
    expect(hrefs(container).length).toBeGreaterThanOrEqual(3);
  });
});
