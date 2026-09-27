import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A placeholder rendered in the SAME colour as a typed value reads as a filled
 * field. `text-neo-white` is #fff and so is `placeholder:text-neo-white` — the
 * two were pixel-identical, so a blank input looked answered.
 *
 * This is not theoretical. `/multiplayer` is the #1 rageclick surface in the
 * product (65 users / 14d), and the two most-rage-clicked elements on it are
 * both inputs carrying this class:
 *   - `CreateRoomModal` name input      — 13 rageclicks / 7 users
 *   - `CreateRoomModal` room-name input —  8 rageclicks / 7 users
 * People tapped a field they believed was already filled, over and over.
 *
 * `/50` is the floor, not a preference: white at 50% over `neo-navy-light`
 * (#16213e) composites to ~#8A909E ≈ 4.95:1, just clear of the WCAG 2.1 AA
 * 4.5:1 this project commits to. `/40` lands at ~3.9:1 and fails.
 */
const REPO_ROOT = path.resolve(__dirname, '../..');

describe('placeholder contrast', () => {
  it('never styles a placeholder at full-strength neo-white', () => {
    // `grep -r` over source only; `|| true` so "no matches" (rc 1) is a pass.
    const hits = execFileSync(
      'sh',
      [
        '-c',
        "grep -rn 'placeholder:text-neo-white' --include='*.tsx' --include='*.ts' app components "
        + "| grep -v 'placeholder:text-neo-white/' || true",
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    ).trim();

    expect(hits, `Placeholder must be dimmed vs the value colour:\n${hits}`).toBe('');
  });

  // The cosy light theme flips the page to sand and rescues the ~1279 literal
  // white-text utilities with a circuit-breaker on `.text-white`/`.text-neo-white`
  // (globals.css). Tailwind compiles `placeholder:text-neo-white/50` to the class
  // `.placeholder\:text-neo-white\/50` — a DIFFERENT class name — so that rescue
  // never covered placeholders, and they render white-on-sand: invisible. That
  // predates the /50 sweep and the sweep alone doesn't fix it.
  it('rescues placeholder utilities on the cosy light theme too', () => {
    const css = execFileSync(
      'sh',
      ['-c', "grep -c \"placeholder.\\{0,2\\}text-neo-white.*::placeholder\" app/globals.css || true"],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    ).trim();

    expect(
      Number(css),
      'globals.css needs a `html[data-cosy=\'true\']` ::placeholder rule — the '
      + '`.text-neo-white` circuit-breaker does not match the `placeholder:` variant class',
    ).toBeGreaterThan(0);
  });
});
