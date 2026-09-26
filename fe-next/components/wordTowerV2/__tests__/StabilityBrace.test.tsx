import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StabilityBrace } from '../rescue/StabilityBrace';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  if (key === 'wordTowerV2.brace.buy' && params.n) {
    return `BUY ${params.n}`;
  }
  if (key === 'wordTowerV2.brace.rescue' && params.n) {
    return `RESCUE ${params.n}`;
  }
  return `${key}:${Object.values(params).join(',')}`;
};

const api = (over: Partial<ReturnType<any>> = {}) => ({
  offered: false,
  price: 0,
  affordable: true,
  spent: 0,
  buy: vi.fn(),
  rescue: null,
  rescuesLeft: 2,
  startRescue: vi.fn(),
  submitRescue: vi.fn(),
  cancelRescue: vi.fn(),
  ...over,
});

describe('StabilityBrace: merged stability + brace control', () => {
  it('given steady tower (risk < 0.35), when rendered, then only pips show (no text)', () => {
    const { container } = render(
      <StabilityBrace t={t} risk={0.2} api={api()} reducedMotion={false} />,
    );

    const control = container.querySelector('[data-wt2-stability-brace]');
    expect(control).toBeTruthy();

    // No text: a steady state shows no label
    const text = control?.textContent ?? '';
    expect(text).toBe(''); // Only pips, no text content
  });

  it('given wobbly tower (risk >= 0.35, < 0.7), when rendered, then the danger label appears', () => {
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.5}
        api={api({ offered: true, affordable: true })}
        reducedMotion={false}
      />,
    );

    // Danger label should appear
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();
  });

  it('given danger tower with an affordable brace offer, when rendered, then the danger label and brace button show cost and is clickable', () => {
    const buy = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: true, price: 40, buy })}
        reducedMotion={false}
      />,
    );

    // Danger label should appear
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();

    // Price label should appear
    expect(screen.getByText('40')).toBeTruthy();

    // Button should be clickable and call buy
    const button = container.querySelector('button[data-wt2-stability-brace-action]');
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(buy).toHaveBeenCalledOnce();
  });

  it('given danger tower with free brace available, when rendered, then it shows the free tag and is clickable', () => {
    const buy = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: true, price: 0, buy })}
        reducedMotion={false}
      />,
    );

    // Should show 'FREE' tag instead of a number
    expect(screen.getByText('wordTowerV2.brace.freeTag')).toBeTruthy();

    // Button is clickable
    const button = container.querySelector('button[data-wt2-stability-brace-action]');
    fireEvent.click(button!);
    expect(buy).toHaveBeenCalledOnce();
  });

  it('given danger tower but tower is unaffordable, when rendered, then buy is not called on tap', () => {
    const buy = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: false, price: 100, buy, rescuesLeft: 1 })}
        reducedMotion={false}
      />,
    );

    // Danger label appears
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();

    // Tap does not call buy (button may be disabled or non-functional)
    const button = container.querySelector('button[data-wt2-stability-brace-action]');
    if (button) {
      fireEvent.click(button);
    }
    expect(buy).not.toHaveBeenCalled();
  });

  it('given steady tower (no offer), when rendered, then no button appears', () => {
    const buy = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.2}
        api={api({ offered: false, buy })}
        reducedMotion={false}
      />,
    );

    // No button for brace action
    const button = container.querySelector('button[data-wt2-stability-brace-action]');
    expect(button).toBeNull();
    expect(buy).not.toHaveBeenCalled();
  });

  it('given a rescue countdown is active, when rendered, then the control does not show (BraceControl shows countdown instead)', () => {
    // This test verifies that the merged control is the offer UI, not the countdown.
    // When api.rescue is set, the component should show danger label but no countdown
    // (countdown is in BraceControl, rendered separately).
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({
          offered: true,
          rescue: { minLen: 5, until: Date.now() + 10000 },
        })}
        reducedMotion={false}
      />,
    );

    // Should still show the danger label (offer state)
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();

    // But NOT the wt2-rescue-clock animation (that's in BraceControl)
    const clock = container.querySelector('[style*="wt2-rescue-clock"]');
    expect(clock).toBeNull();
  });

  it('given a role meter, when rendered, then aria attributes reflect the risk', () => {
    const { container } = render(
      <StabilityBrace t={t} risk={0.5} api={api()} reducedMotion={false} />,
    );

    const control = container.querySelector('[role="meter"]');
    expect(control).toBeTruthy();
    expect(control?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('given danger with no coins but rescues available, when rendered, then rescue button shows and brace button is absent', () => {
    const startRescue = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: false, price: 100, rescuesLeft: 1, startRescue })}
        reducedMotion={false}
      />,
    );

    // Danger label should appear
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();

    // Brace button should NOT appear (unaffordable)
    const braceButton = container.querySelector('button[data-wt2-stability-brace-action]');
    expect(braceButton).toBeNull();

    // Rescue button should appear
    const rescueButton = container.querySelector('button[data-wt2-stability-rescue-action]');
    expect(rescueButton).toBeTruthy();
  });

  it('given danger with rescue button available, when tapped, then startRescue is called once', () => {
    const startRescue = vi.fn();
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: false, price: 100, rescuesLeft: 1, startRescue })}
        reducedMotion={false}
      />,
    );

    const rescueButton = container.querySelector('button[data-wt2-stability-rescue-action]');
    fireEvent.click(rescueButton!);
    expect(startRescue).toHaveBeenCalledOnce();
  });

  it('given danger but no rescues left, when rendered, then rescue button is disabled', () => {
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({ offered: true, affordable: false, price: 100, rescuesLeft: 0 })}
        reducedMotion={false}
      />,
    );

    const rescueButton = container.querySelector('button[data-wt2-stability-rescue-action]');
    expect(rescueButton?.getAttribute('disabled')).toBeDefined();
  });

  it('given a rescue countdown is active, when rendered, then action buttons are not shown', () => {
    const { container } = render(
      <StabilityBrace
        t={t}
        risk={0.75}
        api={api({
          offered: true,
          affordable: false,
          rescuesLeft: 1,
          rescue: { minLen: 6, until: Date.now() + 5000 },
        })}
        reducedMotion={false}
      />,
    );

    // Danger label still shows
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();

    // But neither brace nor rescue buttons
    expect(container.querySelector('button[data-wt2-stability-brace-action]')).toBeNull();
    expect(container.querySelector('button[data-wt2-stability-rescue-action]')).toBeNull();
  });
});
