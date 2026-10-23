import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import { PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/education/live/eduLiveStyles';
import { pressClasses } from '@/components/education/motion';

const tokens = (s: string) => s.split(/\s+/).filter(Boolean);
const OLD_FEEL = /(^|\s)(\S*:)?(scale-|shadow-hard|hover:-translate|hover:shadow-hard|transition-\[transform|transition-all|transition-transform)/;

describe('live screen buttons press like the motion kit', () => {
  it('primary as composed on the live screens carries the full 4px kit press', () => {
    const merged = tokens(cn(PRIMARY_BUTTON, PRESS, 'min-h-16 w-full'));
    for (const cls of tokens(pressClasses(4))) expect(merged).toContain(cls);
    expect(merged.join(' ')).not.toMatch(OLD_FEEL);
  });

  it('secondary as composed on the live screens carries the 2px kit press', () => {
    const merged = tokens(cn(SECONDARY_BUTTON, PRESS, '2xl:text-base'));
    for (const cls of tokens(pressClasses(2))) expect(merged).toContain(cls);
    expect(merged.join(' ')).not.toMatch(OLD_FEEL);
  });

  it('PRESS never overrides a lip, so lipless controls stay flat and instant', () => {
    expect(PRESS).not.toMatch(/shadow|translate|scale|transition/);
    expect(PRESS).toContain('focus-visible:ring-neo-cyan');
    expect(PRESS).toContain('disabled:opacity-60');
  });
});
