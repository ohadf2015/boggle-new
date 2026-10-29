import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let language = 'en';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language }),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { ForSchoolsLink, FOR_SCHOOLS_PLACEMENTS, forSchoolsHref, trackForSchoolsClick } from '../ForSchoolsLink';

describe('ForSchoolsLink', () => {
  beforeEach(() => {
    track.mockReset();
    language = 'en';
  });
  afterEach(cleanup);

  it.each(['en', 'he', 'es', 'ja', 'ru', 'sv'])('links to /%s/education/for-schools', (lang) => {
    language = lang;
    render(<ForSchoolsLink placement="education_header" />);
    expect(screen.getByTestId('for-schools-link-education_header')).toHaveAttribute('href', `/${lang}/education/for-schools`);
    expect(forSchoolsHref(lang)).toBe(`/${lang}/education/for-schools`);
  });

  it('renders the existing localized label by default', () => {
    render(<ForSchoolsLink placement="teacher_menu" />);
    expect(screen.getByTestId('for-schools-link-teacher_menu')).toHaveTextContent('education.landing.districtCta.title');
  });

  it.each(FOR_SCHOOLS_PLACEMENTS)('tracks a tap with placement %s and still navigates', (placement) => {
    const onNavigate = vi.fn();
    render(<ForSchoolsLink placement={placement} onNavigate={onNavigate} />);
    const link = screen.getByTestId(`for-schools-link-${placement}`);
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'for_schools', placement });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('never throws when tracking fails', () => {
    track.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => trackForSchoolsClick('teacher_profile')).not.toThrow();
  });
});
