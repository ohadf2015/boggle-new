import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'HuntBoard.module.css'), 'utf8');

/** Every top-level rule as [selector, body]; @keyframes / @media are skipped. */
function rules(): Array<[string, string]> {
  const flat = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').replace(/@media[^{]+\{|\}\s*\}/g, '}');
  return [...flat.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
}

function keyframes(name: string): string {
  const m = css.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)\\s*\\}`));
  if (!m) throw new Error(`no @keyframes ${name}`);
  return m[1];
}

function animationNames(body: string): string[] {
  const decl = body.match(/(?:^|;|\s)animation:\s*([^;]+)/);
  if (!decl || decl[1].trim() === 'none') return [];
  return decl[1]
    .split(',')
    .map((part) => part.trim().split(/\s+/).find((tok) => /^[a-zA-Z][\w-]*$/.test(tok) && !/^(ease|linear|both|forwards|infinite|alternate|none)/.test(tok)))
    .filter((n): n is string => Boolean(n));
}

const scales = (text: string) => [...text.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));

describe('Word Hunt board motion', () => {
  it('Given a word is released or accepted, Then the board itself never scales or dips (only tiles move)', () => {
    const trayRules = rules().filter(([sel]) => sel.split(',').some((s) => /^\.tray(\[[^\]]+\])*$/.test(s.trim())));
    for (const [sel, body] of trayRules) {
      for (const name of animationNames(body)) {
        const frames = keyframes(name);
        expect({ sel, name, scales: /scale\(/.test(frames) }).toEqual({ sel, name, scales: false });
        expect({ sel, name, dips: /translateY\(/.test(frames) }).toEqual({ sel, name, dips: false });
      }
    }
  });

  it('Given a letter joins the selection, Then its pop never shrinks the tile below rest size', () => {
    const selRules = rules().filter(([sel]) => /\[data-sel\]/.test(sel));
    const names = selRules.flatMap(([, body]) => animationNames(body));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      for (const s of scales(keyframes(name))) expect(s).toBeGreaterThanOrEqual(1);
    }
  });

  it('Then the tile face and its letter move as one (no separate inner animations that drift apart; overlay pseudo-elements like the join ping are fine)', () => {
    for (const [sel, body] of rules()) {
      if (/\[data-sel\]\s+\.(face|ch)(?![\w:-])/.test(sel)) {
        expect({ sel, animation: animationNames(body) }).toEqual({ sel, animation: [] });
      }
    }
  });

  it('Then selected tiles lift straight — no alternating tilt that makes the row look crooked', () => {
    const lifted = rules().filter(([sel]) => /^\.(tile|glyph)\[data-sel\]$/.test(sel.split(',')[0].trim()));
    expect(lifted.length).toBeGreaterThan(0);
    for (const [, body] of lifted) expect(body).not.toMatch(/rotate/);
  });

  it('Then the tip keeps the same size as the rest of the path, so moving on does not make tiles jump', () => {
    const tipRules = rules().filter(([sel]) => /\.(tile|glyph)\[data-head\](,|$)/.test(sel));
    expect(tipRules.length).toBeGreaterThan(0);
    for (const [, body] of tipRules) expect(body).not.toMatch(/transform/);
  });

  it('Then the live trail is the shared painter polylines in the ribbon colour, and the live tip breathes', () => {
    const core = rules().find(([sel]) => sel.includes("[data-trail='core']"));
    expect(core?.[1]).toMatch(/stroke:\s*var\(--rib\)/);
    expect(() => keyframes('tipBreath')).not.toThrow();
  });

  it('Then no animation loops forever on an SVG stroke or radius (main-thread repaint every frame of the drag)', () => {
    const looping = rules().filter(([sel, body]) => /\.(stitch|tipDot)\b/.test(sel) && /animation:[^;]*infinite/.test(body));
    expect(looping.map(([sel]) => sel)).toEqual([]);
  });

  it('Then tiles are not each promoted to their own compositor layer', () => {
    expect(css).not.toMatch(/backface-visibility/);
  });

  it('Then the live ribbon warms with word length (pink, orange at 5, yellow at 7)', () => {
    expect(css).toMatch(/\[data-live-tier='2'\][^{]*\{\s*--rib:\s*var\(--neo-orange\)/);
    expect(css).toMatch(/\[data-live-tier='3'\][^{]*\{\s*--rib:\s*var\(--neo-yellow\)/);
  });

  describe('when the hidden word is found', () => {
    const targetRules = () => rules().filter(([sel]) => /data-verdict='target'/.test(sel));
    const targetAnimations = () => targetRules().flatMap(([, body]) => animationNames(body));

    it('Then the path tiles stamp gold one after another along the path', () => {
      const staggered = targetRules().filter(([, body]) => /animation-delay:\s*calc\(var\(--i\)/.test(body));
      expect(staggered.length).toBeGreaterThan(0);
      expect(css).toMatch(/data-verdict='target'\][^{]*\{[^}]*--rib:\s*var\(--neo-yellow\)/);
    });

    it('Then every target keyframe moves only transform and opacity (no layout or paint-heavy properties)', () => {
      const names = [...new Set(targetAnimations())];
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        const props = [...keyframes(name).matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
        expect({ name, props: [...new Set(props)].filter((p) => p !== 'transform' && p !== 'opacity') }).toEqual({ name, props: [] });
      }
    });

    it('Then the whole stamp lands within 700ms for a 7-letter word', () => {
      for (const [, body] of targetRules()) {
        const dur = body.match(/animation:[^;]*?(\d+)ms/);
        const step = body.match(/animation-delay:\s*calc\(var\(--i\)\s*\*\s*(\d+)ms\)/);
        if (dur && step) expect(Number(dur[1]) + 6 * Number(step[1])).toBeLessThanOrEqual(700);
      }
    });

    it('Then the board tray itself never moves, only its tiles', () => {
      const tray = targetRules().filter(([sel]) => /\.tray\[data-verdict='target'\]\s*$/.test(sel));
      for (const [, body] of tray) expect(animationNames(body)).toEqual([]);
    });
  });
});
