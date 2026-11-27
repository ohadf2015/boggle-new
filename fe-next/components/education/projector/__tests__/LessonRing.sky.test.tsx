import { render, screen } from '@testing-library/react';
import { LessonRing } from '../LessonRing';

const t = (k: string) => k;

describe('LessonRing on the cream live panel', () => {
  it('draws a light track and an ink outer ring, never a navy disc', () => {
    render(<LessonRing found={2} total={12} t={t} />);
    const html = screen.getByTestId('live-lesson-ring').innerHTML;
    expect(html).not.toContain('stroke-neo-navy');
    expect(html).not.toContain('stroke-neo-cream');
    expect(html).toContain('stroke-edu-line');
  });

  it('keeps the count inside the ring: its type caps below the ring width', () => {
    render(<LessonRing found={12} total={12} t={t} />);
    expect(screen.getByText('12/12').className).toContain('md:text-[clamp(14px,min(6cqw,3.4cqh),38px)]');
  });
});
