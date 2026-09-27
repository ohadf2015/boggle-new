import { render } from '@testing-library/react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { DirectionalIcon } from '../DirectionalIcon';

/**
 * DirectionalIcon encodes the icon-shape-aware RTL flip rule so call sites
 * can't re-derive it wrong (rotating an asymmetric icon flips it upside-down).
 */
describe('DirectionalIcon', () => {
  it('rotates symmetric arrows for RTL by default', () => {
    const { container } = render(<DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('class')).toContain('rtl:rotate-180');
    expect(svg.getAttribute('class')).toContain('w-5 h-5');
  });

  it('mirrors asymmetric icons instead of rotating (avoids upside-down flip)', () => {
    const { container } = render(<DirectionalIcon icon={LogOut} mirror className="w-4 h-4" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('class')).toContain('rtl:scale-x-[-1]');
    expect(svg.getAttribute('class')).not.toContain('rtl:rotate-180');
  });

  it('marks the icon aria-hidden (decorative — the button carries the label)', () => {
    const { container } = render(<DirectionalIcon icon={ArrowLeft} />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });
});
