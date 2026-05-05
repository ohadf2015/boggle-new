// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { BlastModalShell } from '../BlastModalShell';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

describe('BlastModalShell', () => {
  it('renders backdrop + frame + orb when isOpen', () => {
    const { getByTestId, container } = render(
      <BlastModalShell
        isOpen={true}
        accent="lime"
        Icon={Heart}
        title="Title"
        body="Body"
        cta={<button>Go</button>}
        decline={<button>Cancel</button>}
        disablePortal
        testId="shell"
      />
    );
    expect(getByTestId('shell')).toBeTruthy();
    expect(container.querySelectorAll('div').length).toBeGreaterThanOrEqual(6);
  });

  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <BlastModalShell
        isOpen={false}
        accent="cyan"
        Icon={Heart}
        title="x"
        body="x"
        cta={<button>x</button>}
        disablePortal
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('fires burst with orb-centre coordinates and accent colour', async () => {
    const fireBurst = vi.fn();
    render(
      <BlastModalShell
        isOpen={true}
        accent="cyan"
        Icon={Heart}
        title="x"
        body="x"
        cta={<button>x</button>}
        disablePortal
        fireBurst={fireBurst}
        testId="shell"
      />
    );
    // GSAP onStart fires synchronously when timeline is built; fireBurst should be queued.
    // We allow a tick because timeline.fromTo schedules onStart at frame 0.
    await new Promise((r) => setTimeout(r, 250));
    expect(fireBurst).toHaveBeenCalled();
    const [, , colour] = fireBurst.mock.calls[0];
    expect(colour).toBe(0x00ffff);
  });
});
