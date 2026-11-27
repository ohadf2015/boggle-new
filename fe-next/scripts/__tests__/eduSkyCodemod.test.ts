import { describe, expect, it } from 'vitest';
import { mapClassString, transformSource } from '../edu-sky-codemod.mjs';

const map = (s: string, group?: string) => mapClassString(s, group);

describe('edu-sky codemod: paper', () => {
  it('turns solid and strong white fills into the cream paper token, leaving print white alone', () => {
    expect(map('bg-neo-white hover:bg-neo-white/60')).toBe('bg-edu-paper hover:bg-edu-paper/60');
    expect(map('bg-neo-white/10')).toBe('bg-edu-ink/10');
    expect(map('bg-white print:bg-white')).toBe('bg-white print:bg-white');
  });
});

describe('edu-sky codemod: ink', () => {
  it('maps white and cream ink to edu-ink, keeping alpha and variants', () => {
    expect(map('text-neo-white')).toBe('text-edu-ink');
    expect(map('text-neo-cream/70 font-bold')).toBe('text-edu-ink/70 font-bold');
    expect(map('hover:text-white md:text-neo-cream')).toBe('hover:text-edu-ink md:text-edu-ink');
    expect(map('[@media(hover:hover)]:hover:text-neo-white/60')).toBe(
      '[@media(hover:hover)]:hover:text-edu-ink/60',
    );
  });

  it('keeps white ink on a solid purple, red or black fill and on the rays stage', () => {
    expect(map('bg-neo-purple text-white')).toBe('bg-neo-purple text-white');
    expect(map('bg-neo-red text-neo-white')).toBe('bg-neo-red text-neo-white');
    expect(map('bg-neo-black text-neo-cream/80')).toBe('bg-neo-black text-neo-cream/80');
    expect(map('bg-black text-white')).toBe('bg-black text-white');
    expect(map('edu-rays-dark text-neo-white')).toBe('edu-rays-dark text-neo-white');
  });

  it('does not treat a translucent dark wash as a solid fill', () => {
    expect(map('bg-neo-purple/20 text-white')).toBe('bg-neo-purple/20 text-edu-ink');
  });

  it('reads the sibling literals of a className group only when the literal has no fill of its own', () => {
    expect(map('text-white', 'rounded bg-neo-black text-white')).toBe('text-white');
    expect(map('bg-white/5 text-white', 'bg-neo-black bg-white/5 text-white')).toBe(
      'bg-edu-ink/5 text-edu-ink',
    );
  });

  it('maps the muted gray scale to translucent ink', () => {
    expect(map('text-neo-gray-100 text-neo-gray-200')).toBe('text-edu-ink/80 text-edu-ink/80');
    expect(map('text-neo-gray-300')).toBe('text-edu-ink/70');
    expect(map('sm:text-neo-gray-400')).toBe('sm:text-edu-ink/60');
  });

  it('maps accent ink to its readable-on-sky twin', () => {
    expect(map('text-neo-lime text-neo-cyan/80')).toBe('text-edu-lime-ink text-edu-cyan-ink/80');
    expect(map('text-neo-yellow text-neo-pink text-neo-purple text-neo-orange')).toBe(
      'text-edu-yellow-ink text-edu-pink-ink text-edu-purple-ink text-edu-orange-ink',
    );
    expect(map('bg-neo-black text-neo-lime')).toBe('bg-neo-black text-neo-lime');
  });

  it('maps the light accent tints, which only read on navy, to the same inks', () => {
    expect(map('text-neo-pink-light hover:text-neo-purple-light/80')).toBe(
      'text-edu-pink-ink hover:text-edu-purple-ink/80',
    );
    expect(map('bg-neo-black text-neo-cyan-light')).toBe('bg-neo-black text-neo-cyan-light');
    expect(map('text-neo-lime-dark')).toBe('text-neo-lime-dark');
  });
});

describe('edu-sky codemod: lines', () => {
  it('turns light edges into edu-line, solid from 25% alpha up', () => {
    expect(map('border-2 border-neo-cream')).toBe('border-2 border-edu-line');
    expect(map('border-neo-cream/40')).toBe('border-edu-line');
    expect(map('border-neo-white/25')).toBe('border-edu-line');
    expect(map('border-neo-white/20')).toBe('border-edu-line/20');
    expect(map('border-b-2 border-b-white/10')).toBe('border-b-2 border-b-edu-line/10');
    expect(map('border-s-neo-cream ring-neo-white divide-neo-cream/15 outline-white')).toBe(
      'border-s-edu-line ring-edu-line divide-edu-line/15 outline-edu-line',
    );
  });

  it('maps gray borders to a soft line', () => {
    expect(map('border-neo-gray-400/40 border-t-neo-gray-500')).toBe(
      'border-edu-line/30 border-t-edu-line/30',
    );
  });

  it('maps light lips with the line rule and navy focus-ring gaps to the surface', () => {
    expect(map('shadow-neo-white/15')).toBe('shadow-edu-line/15');
    expect(map('shadow-neo-cream/40')).toBe('shadow-edu-line');
    expect(map('ring-offset-neo-navy focus-visible:ring-offset-neo-navy-light')).toBe(
      'ring-offset-edu-surface focus-visible:ring-offset-edu-surface',
    );
  });

  it('leaves black edges alone', () => {
    expect(map('border-neo-black border-black ring-offset-neo-black')).toBe(
      'border-neo-black border-black ring-offset-neo-black',
    );
  });
});

describe('edu-sky codemod: fills', () => {
  it('turns faint light washes into ink washes and keeps solid light fills', () => {
    expect(map('bg-neo-cream/10 bg-white/30 bg-neo-white/5')).toBe('bg-edu-ink/10 bg-edu-ink/30 bg-edu-ink/5');
    expect(map('bg-neo-cream/40')).toBe('bg-neo-cream/40');
    expect(map('bg-neo-cream bg-neo-white bg-white')).toBe('bg-neo-cream bg-edu-paper bg-white');
  });

  it('paints a navy page root as the page and any other navy box as a surface', () => {
    expect(map('min-h-dvh bg-neo-navy')).toBe('min-h-dvh bg-edu-page');
    expect(map('h-dvh bg-neo-navy')).toBe('h-dvh bg-edu-page');
    expect(map('flex-1 bg-neo-navy')).toBe('flex-1 bg-edu-page');
    expect(map('fixed inset-0 z-[80] flex bg-neo-navy')).toBe('fixed inset-0 z-[80] flex bg-edu-page');
    expect(map('h-[100dvh] bg-neo-navy')).toBe('h-[100dvh] bg-edu-page');
    expect(map('rounded-xl bg-neo-navy')).toBe('rounded-xl bg-edu-surface');
    expect(map('bg-neo-navy-light bg-neo-navy-elevated')).toBe('bg-edu-surface bg-edu-surface');
    expect(map('bg-neo-navy-light/80')).toBe('bg-edu-surface/80');
  });

  it('keeps navy dimmers behind dialogs and makes other translucent navy a surface', () => {
    expect(map('fixed inset-0 bg-neo-navy/80')).toBe('fixed inset-0 bg-neo-navy/80');
    expect(map('rounded bg-neo-navy/60')).toBe('rounded bg-edu-surface/60');
  });

  it('leaves the unchanged tokens alone', () => {
    const same = 'text-neo-black text-neo-navy border-neo-black bg-neo-cream bg-neo-black bg-neo-lime';
    expect(map(same)).toBe(same);
  });

  it('keeps important markers in either position', () => {
    expect(map('!text-white text-neo-cream!')).toBe('!text-edu-ink text-edu-ink!');
  });

  it('is a fixed point on its own output', () => {
    const once = map('min-h-dvh bg-neo-navy text-white border-neo-cream/20 text-neo-gray-300');
    expect(map(once)).toBe(once);
  });
});

describe('edu-sky codemod: source files', () => {
  it('rewrites JSX attributes, cn() arguments and template chunks, keeping the rest byte-identical', () => {
    const src = [
      "import { cn } from '@/lib/utils';",
      'export function A({ on }: { on: boolean }) {',
      '  return (',
      '    <div className="min-h-dvh bg-neo-navy text-white">',
      "      <p className={cn('rounded bg-neo-black', on && 'text-white')}>x</p>",
      '      <span className={`p-2 ${on ? \'text-neo-cream\' : \'text-neo-gray-300\'} border-neo-cream/10`}>y</span>',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');
    const out = transformSource(src, 'A.tsx');
    expect(out).toContain('className="min-h-dvh bg-edu-page text-edu-ink"');
    expect(out).toContain("cn('rounded bg-neo-black', on && 'text-white')");
    expect(out).toContain("'text-edu-ink' : 'text-edu-ink/70'} border-edu-line/10`");
    expect(out.split('\n')[0]).toBe("import { cn } from '@/lib/utils';");
    expect(transformSource(out, 'A.tsx')).toBe(out);
  });

  it('parses plain .ts class maps', () => {
    const src = "export const TONE = { ink: 'text-neo-lime', box: 'bg-neo-navy-light' } as const;\n";
    expect(transformSource(src, 'tone.ts')).toBe(
      "export const TONE = { ink: 'text-edu-lime-ink', box: 'bg-edu-surface' } as const;\n",
    );
  });
});

describe('edu-sky codemod: files a dark page imports', () => {
  const twin = (s: string, group?: string) => mapClassString(s, group, { shared: true });
  const twinSource = (src: string) => transformSource(src, 'x.tsx', { shared: true });

  it('keeps the master class and adds the sky class behind edu-sky:', () => {
    expect(twin('rounded border-2 border-neo-cream/40 bg-neo-navy text-neo-cream')).toBe(
      'rounded border-2 border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy edu-sky:bg-edu-surface text-neo-cream edu-sky:text-edu-ink',
    );
  });

  it('keeps variants and important markers inside the twin', () => {
    expect(twin('hover:border-neo-cream/60 md:!text-neo-gray-300')).toBe(
      'hover:border-neo-cream/60 edu-sky:hover:border-edu-line md:!text-neo-gray-300 edu-sky:md:!text-edu-ink/70',
    );
  });

  it('twins a state class on a twinned property so it still beats the sky base', () => {
    expect(twin('bg-neo-navy hover:bg-neo-lime text-neo-black')).toBe(
      'bg-neo-navy edu-sky:bg-edu-surface hover:bg-neo-lime edu-sky:hover:bg-neo-lime text-neo-black',
    );
    expect(twin('bg-neo-lime', 'bg-neo-navy bg-neo-lime')).toBe('bg-neo-lime edu-sky:bg-neo-lime');
    expect(twin('border-b-neo-pink', 'border-neo-cream/40 border-b-neo-pink')).toBe('border-b-neo-pink edu-sky:border-b-neo-pink');
  });

  it('leaves size, style and unrelated colour classes alone', () => {
    expect(twin('border-2 border-dashed text-sm bg-neo-lime text-neo-black', 'border-neo-cream/40 border-2 border-dashed text-sm bg-neo-lime text-neo-black')).toBe(
      'border-2 border-dashed text-sm bg-neo-lime text-neo-black',
    );
  });

  it('twins across the literals of one className group', () => {
    const src = "const a = <div className={cn('bg-neo-navy p-2', on && 'bg-neo-lime')} />;\n";
    expect(twinSource(src)).toBe(
      "const a = <div className={cn('bg-neo-navy edu-sky:bg-edu-surface p-2', on && 'bg-neo-lime edu-sky:bg-neo-lime')} />;\n",
    );
  });

  it('twins an override composed with a twinned constant, so the override still wins on sky', () => {
    const src = "const TAG = 'border-2 border-neo-cream/40 bg-neo-navy';\nconst a = <span className={cn(TAG, 'border-neo-black bg-neo-orange p-1')} />;\n";
    expect(twinSource(src)).toBe(
      "const TAG = 'border-2 border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy edu-sky:bg-edu-surface';\nconst a = <span className={cn(TAG, 'border-neo-black edu-sky:border-neo-black bg-neo-orange edu-sky:bg-neo-orange p-1')} />;\n",
    );
  });

  it('is a fixed point in both modes, so the sky ratchet does not rewrite a twinned class', () => {
    const src = "const a = <div className={cn('border-neo-cream/40 hover:border-neo-lime bg-neo-navy-elevated', on && 'bg-neo-lime')} />;\n";
    const once = twinSource(src);
    expect(twinSource(once)).toBe(once);
    expect(transformSource(once, 'x.tsx')).toBe(once);
  });

  it('never maps a token already behind edu-sky:', () => {
    expect(map('edu-sky:bg-neo-navy edu-sky:text-white')).toBe('edu-sky:bg-neo-navy edu-sky:text-white');
  });
});
