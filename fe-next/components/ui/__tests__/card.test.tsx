/**
 * Tests for Card components
 *
 * Tests the Card UI primitives including:
 * - CardVariant with CVA support
 * - Variant combinations (default/dark/gradient/outline)
 * - Tilt options (none/left/right)
 * - Hover effects (none/lift/tilt3d)
 * - Padding variants (none/tight/normal/large/generous)
 * - Gradient prop support
 * - Backward compatibility (Card, CardDark)
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  Card,
  CardDark,
  CardVariant,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '../card';

describe('Card Component', () => {
  describe('Backward Compatibility', () => {
    it('renders Card with default styling', () => {
      const { container } = render(<Card>Test Card</Card>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-neo-navy');
      expect(card).toHaveClass('border-4');
      expect(card).toHaveClass('shadow-hard-lg');
      expect(card).toHaveClass('cq-container');
    });

    it('renders Card with left tilt', () => {
      const { container } = render(<Card tilt="left">Test Card</Card>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('rotate-[-2deg]');
    });

    it('renders Card with right tilt', () => {
      const { container } = render(<Card tilt="right">Test Card</Card>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('rotate-[2deg]');
    });

    it('renders CardDark with dark background', () => {
      const { container } = render(<CardDark>Test Card</CardDark>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-neo-gray');
      expect(card).toHaveClass('text-neo-white');
    });
  });

  describe('CardVariant - Variant Prop', () => {
    it('renders with default variant', () => {
      const { container } = render(<CardVariant>Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-neo-gray');
      expect(card).toHaveClass('shadow-hard-lg');
      expect(card).toHaveClass('border-4');
    });

    it('renders with dark variant', () => {
      const { container } = render(<CardVariant variant="dark">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-neo-black');
      expect(card).toHaveClass('text-neo-white');
      expect(card).toHaveClass('border-4');
    });

    it('renders with gradient variant', () => {
      const { container } = render(<CardVariant variant="gradient">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('border-3');
      expect(card).toHaveClass('shadow-hard');
      expect(card).not.toHaveClass('border-4');
    });

    it('renders with outline-solid variant', () => {
      const { container } = render(<CardVariant variant="outline">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-transparent');
      expect(card).toHaveClass('border-3');
      expect(card).toHaveClass('shadow-hard-sm');
    });
  });

  describe('CardVariant - Tilt Prop', () => {
    it('renders with no tilt by default', () => {
      const { container } = render(<CardVariant>Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).not.toHaveClass('rotate-[-2deg]');
      expect(card).not.toHaveClass('rotate-[2deg]');
    });

    it('renders with left tilt', () => {
      const { container } = render(<CardVariant tilt="left">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('rotate-[-2deg]');
    });

    it('renders with right tilt', () => {
      const { container } = render(<CardVariant tilt="right">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('rotate-[2deg]');
    });
  });

  describe('CardVariant - Hover Prop', () => {
    it('renders with no hover effect by default', () => {
      const { container } = render(<CardVariant>Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).not.toHaveClass('hover:-translate-y-1');
      expect(card).not.toHaveClass('hover:rotate-0');
    });

    it('renders with lift hover effect', () => {
      const { container } = render(<CardVariant hover="lift">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('hover:-translate-y-1');
      expect(card).toHaveClass('hover:shadow-hard-xl');
    });

    it('renders with tilt3d hover effect', () => {
      const { container } = render(<CardVariant hover="tilt3d">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('hover:rotate-0');
      expect(card).toHaveClass('transition-all');
    });
  });

  describe('CardVariant - Padding Prop', () => {
    it('renders with normal padding by default', () => {
      const { container } = render(<CardVariant>Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('*:cq-p-responsive');
    });

    it('renders with tight padding', () => {
      const { container } = render(<CardVariant padding="tight">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('*:cq-p-tight');
    });

    it('renders with large padding', () => {
      const { container } = render(<CardVariant padding="large">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('*:cq-p-responsive-lg');
    });

    it('renders with generous padding', () => {
      const { container } = render(<CardVariant padding="generous">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('*:cq-p-generous');
    });

    it('renders with no padding', () => {
      const { container } = render(<CardVariant padding="none">Test Card</CardVariant>);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('p-0');
    });
  });

  describe('CardVariant - Gradient Prop', () => {
    it('applies gradient className when provided', () => {
      const { container } = render(
        <CardVariant
          variant="gradient"
          gradient="bg-linear-to-br from-neo-cyan to-cyan-400"
        >
          Test Card
        </CardVariant>
      );
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-linear-to-br');
      expect(card).toHaveClass('from-neo-cyan');
      expect(card).toHaveClass('to-cyan-400');
    });

    it('works with any variant', () => {
      const { container } = render(
        <CardVariant
          variant="default"
          gradient="bg-linear-to-r from-amber-700 to-amber-500"
        >
          Test Card
        </CardVariant>
      );
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-linear-to-r');
    });
  });

  describe('CardVariant - Combined Props', () => {
    it('combines multiple variants correctly', () => {
      const { container } = render(
        <CardVariant
          variant="gradient"
          tilt="left"
          hover="lift"
          padding="large"
          gradient="bg-linear-to-br from-neo-cyan to-cyan-400"
        >
          Test Card
        </CardVariant>
      );
      const card = container.firstChild as HTMLElement;

      // Variant
      expect(card).toHaveClass('border-3');
      expect(card).toHaveClass('shadow-hard');
      // Tilt
      expect(card).toHaveClass('rotate-[-2deg]');
      // Hover
      expect(card).toHaveClass('hover:-translate-y-1');
      // Padding
      expect(card).toHaveClass('*:cq-p-responsive-lg');
      // Gradient
      expect(card).toHaveClass('bg-linear-to-br');
    });

    it('applies custom className alongside variants', () => {
      const { container } = render(
        <CardVariant variant="dark" className="custom-class">
          Test Card
        </CardVariant>
      );
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-neo-black');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('CardHeader, CardContent, CardFooter', () => {
    it('renders CardHeader with responsive padding', () => {
      const { container } = render(<CardHeader>Header Content</CardHeader>);
      const header = container.firstChild as HTMLElement;

      expect(header).toHaveClass('cq-p-responsive');
      expect(header).toHaveClass('space-y-1.5');
      expect(header).toHaveClass('lg:space-y-2');
    });

    it('renders CardContent with responsive padding', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;

      expect(content).toHaveClass('cq-p-responsive');
      expect(content).toHaveClass('pt-0');
    });

    it('renders CardFooter with responsive padding', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;

      expect(footer).toHaveClass('cq-p-responsive');
      expect(footer).toHaveClass('pt-0');
    });

    it('renders CardTitle with correct styling', () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.firstChild as HTMLElement;

      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('font-black');
      expect(title).toHaveClass('uppercase');
    });

    it('renders CardDescription with correct styling', () => {
      const { container } = render(<CardDescription>Description</CardDescription>);
      const description = container.firstChild as HTMLElement;

      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders full card with all components using CardVariant', () => {
      const { container } = render(
        <CardVariant variant="gradient" gradient="bg-linear-to-br from-neo-cyan to-cyan-400">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test Content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </CardVariant>
      );

      expect(container.querySelector('.bg-linear-to-br')).toBeInTheDocument();
      expect(container.textContent).toContain('Test Title');
      expect(container.textContent).toContain('Test Description');
      expect(container.textContent).toContain('Test Content');
      expect(container.textContent).toContain('Action');
    });
  });
});
