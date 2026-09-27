import { render, screen } from '@testing-library/react';
import DoubleClickIndicator from '../DoubleClickIndicator';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'desktopInput.doubleClick': '2×click',
      };
      return map[key] || key;
    },
  }),
}));

describe('DoubleClickIndicator', () => {
  it('renders when visible', () => {
    render(<DoubleClickIndicator visible={true} />);
    expect(screen.getByText('2×click')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<DoubleClickIndicator visible={false} />);
    expect(screen.queryByText('2×click')).not.toBeInTheDocument();
  });

  it('shows return symbol', () => {
    render(<DoubleClickIndicator visible={true} />);
    expect(screen.getByText('⏎')).toBeInTheDocument();
  });
});
