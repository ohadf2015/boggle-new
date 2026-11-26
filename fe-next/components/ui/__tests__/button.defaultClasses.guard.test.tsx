import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from '../button';

const VARIANTS = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'accent', 'cyan', 'gradient'] as const;
const SIZES = ['default', 'sm', 'lg', 'xl', '2xl', 'icon', 'icon-lg', 'icon-xl'] as const;

describe('Button default press is unchanged', () => {
  it('keeps every variant x size class string', () => {
    const all = Object.fromEntries(
      VARIANTS.flatMap((variant) => SIZES.map((size) => [`${variant}/${size}`, buttonVariants({ variant, size })])),
    );
    expect(all).toMatchSnapshot();
  });

  it('renders a plain Button with the same classes and no press attribute', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.className).toMatchSnapshot();
    expect(btn).not.toHaveAttribute('data-pressed');
  });
});
