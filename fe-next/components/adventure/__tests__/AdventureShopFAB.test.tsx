import { render, screen, fireEvent } from '@testing-library/react';
import AdventureShopFAB from '../AdventureShopFAB';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { whileHover, whileTap, initial, animate, transition, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'adventure.shop.open': 'Open Shop',
    'adventure.shop.title': 'Shop',
  };
  return map[key] ?? key;
};

const defaultProps = {
  isRTL: false,
  gold: 1250,
  onOpenShop: vi.fn(),
  t: mockT,
};

describe('AdventureShopFAB', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the shop button with accessible label', () => {
    render(<AdventureShopFAB {...defaultProps} />);
    expect(screen.getByRole('button', { name: /open shop/i })).toBeInTheDocument();
  });

  it('displays the gold balance formatted with commas', () => {
    render(<AdventureShopFAB {...defaultProps} />);
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('displays shop title text', () => {
    render(<AdventureShopFAB {...defaultProps} />);
    expect(screen.getByText('Shop')).toBeInTheDocument();
  });

  it('calls onOpenShop when clicked', () => {
    render(<AdventureShopFAB {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onOpenShop).toHaveBeenCalledTimes(1);
  });

  it('positions wrapper on the right for LTR', () => {
    const { container } = render(<AdventureShopFAB {...defaultProps} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/right-/);
    expect(wrapper.className).not.toMatch(/left-5/);
  });

  it('positions wrapper on the left for RTL', () => {
    const { container } = render(<AdventureShopFAB {...defaultProps} isRTL />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/left-/);
  });

  it('is hidden on desktop (lg+ screens)', () => {
    const { container } = render(<AdventureShopFAB {...defaultProps} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/lg:hidden/);
  });

  it('formats large gold values with commas', () => {
    render(<AdventureShopFAB {...defaultProps} gold={99999} />);
    expect(screen.getByText('99,999')).toBeInTheDocument();
  });

  it('displays zero gold correctly', () => {
    render(<AdventureShopFAB {...defaultProps} gold={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
