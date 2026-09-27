import { resolveTimerSize } from '../timerSize';

/**
 * resolveTimerSize replaces the prior 4× CircularTimer breakpoint-div split.
 * These cases lock the exact size each viewport showed before the collapse,
 * so the single-timer refactor is a behavior-preserving change.
 *
 * Prior CSS rule (from globals.css @custom-variant + the 4 divs):
 *   short=max-h600, medium-short=max-h850, desktop-medium-short=lg&max-h1023, desktop-tall=lg&min-h700
 *   - mobile (<768w): always sm
 *   - tablet (768..1023w): sm if short/medium-short (h<=850), else md
 *   - desktop (>=1024w): sm if medium-short (h<=1023), else md
 */
describe('resolveTimerSize', () => {
  describe('mobile (<768px wide) — always sm', () => {
    it('typical phone portrait', () => expect(resolveTimerSize(390, 844)).toBe('sm'));
    it('short phone landscape', () => expect(resolveTimerSize(667, 375)).toBe('sm'));
    it('narrow tall', () => expect(resolveTimerSize(360, 1200)).toBe('sm'));
  });

  describe('tablet (768..1023px wide) — md only when tall (>850h)', () => {
    it('tall tablet portrait → md', () => expect(resolveTimerSize(820, 1180)).toBe('md'));
    it('just over the 850 line → md', () => expect(resolveTimerSize(800, 851)).toBe('md'));
    it('at the 850 line → sm', () => expect(resolveTimerSize(800, 850)).toBe('sm'));
    it('short tablet landscape → sm', () => expect(resolveTimerSize(1000, 600)).toBe('sm'));
  });

  describe('desktop (>=1024px wide) — md only when very tall (>=1024h)', () => {
    it('common laptop 1280x800 → sm (medium-short)', () => expect(resolveTimerSize(1280, 800)).toBe('sm'));
    it('short desktop 1440x699 → sm', () => expect(resolveTimerSize(1440, 699)).toBe('sm'));
    it('tall monitor 1280x1024 → md', () => expect(resolveTimerSize(1280, 1024)).toBe('md'));
    it('large 2560x1440 → md', () => expect(resolveTimerSize(2560, 1440)).toBe('md'));
  });
});
