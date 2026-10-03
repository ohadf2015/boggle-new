import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpShotFigure } from '../HelpShotFigure';
import { helpHowToJsonLd } from '../helpSeo';
import { getHelpContent } from '../content';

describe('HelpShotFigure', () => {
  it('renders the Hebrew capture for he and the English one for sv', () => {
    const { unmount } = render(<HelpShotFigure id="hq-overview" locale="he" alt="he" />);
    expect(decodeURIComponent(screen.getByAltText('he').getAttribute('src') ?? '')).toMatch(/\/he\/hq-overview/);
    unmount();
    render(<HelpShotFigure id="hq-overview" locale="sv" alt="sv" />);
    expect(decodeURIComponent(screen.getByAltText('sv').getAttribute('src') ?? '')).not.toMatch(/\/he\//);
  });
});

describe('helpHowToJsonLd', () => {
  it('uses the locale screenshot as the step image', () => {
    const article = getHelpContent('he').articles['create-teacher-account'];
    const json = JSON.stringify(helpHowToJsonLd({ locale: 'he', slug: 'create-teacher-account', article, minutes: 2 }));
    expect(json).toMatch(/\/he\/teacher-signup/);
  });
});
