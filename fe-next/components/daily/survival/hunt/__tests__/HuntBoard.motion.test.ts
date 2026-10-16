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
    const selRules = rules().filter(([sel]) => /\[data-state='sel'\]/.test(sel));
    const names = selRules.flatMap(([, body]) => animationNames(body));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      for (const s of scales(keyframes(name))) expect(s).toBeGreaterThanOrEqual(1);
    }
  });

  it('Then the tile face and its letter move as one (no separate inner animations that drift apart)', () => {
    for (const [sel, body] of rules()) {
      if (/\[data-state='sel'\]\s+\.(face|ch)\b/.test(sel)) {
        expect({ sel, animation: animationNames(body) }).toEqual({ sel, animation: [] });
      }
    }
  });

  it('Then selected tiles lift straight — no alternating tilt that makes the row look crooked', () => {
    const lifted = rules().filter(([sel]) => /^\.(tile|glyph)\[data-state='sel'\]$/.test(sel.split(',')[0].trim()));
    expect(lifted.length).toBeGreaterThan(0);
    for (const [, body] of lifted) expect(body).not.toMatch(/rotate/);
  });

  it('Then the tip keeps the same size as the rest of the path, so moving on does not make tiles jump', () => {
    const tipRules = rules().filter(([sel]) => /\.(tile|glyph)\[data-tip='true'\](,|$)/.test(sel));
    expect(tipRules.length).toBeGreaterThan(0);
    for (const [, body] of tipRules) expect(body).not.toMatch(/transform/);
  });
});
