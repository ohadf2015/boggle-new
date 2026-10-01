import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="page-loader" /> }));

import { EducationRouteLoading } from '../EducationRouteLoading';
import { writeQuickLaunchIntent, clearQuickLaunchIntent } from '../../dashboard/quickLaunchIntent';

describe('<EducationRouteLoading> — the route boundary keeps GO LIVE designed', () => {
  beforeEach(() => clearQuickLaunchIntent());

  it('Given a fresh GO LIVE intent, Then the launch stage names the game instead of the mascot loader', () => {
    writeQuickLaunchIntent({ source: 'pack', packKey: 'p', title: 'Common English', language: 'en', mode: 'blast' });
    render(<EducationRouteLoading />);
    expect(screen.getByTestId('hq-launch-stage')).toHaveTextContent('Common English');
    expect(screen.queryByTestId('page-loader')).toBeNull();
  });

  it('Given no intent (any other education navigation), Then it is the ordinary page loader', () => {
    render(<EducationRouteLoading />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('hq-launch-stage')).toBeNull();
  });
});
