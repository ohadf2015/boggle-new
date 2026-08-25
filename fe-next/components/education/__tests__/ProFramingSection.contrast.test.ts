import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Pro pricing card shipped black-on-navy: every line of it — the "Pro"
 * heading, the "$9", the "/month", all five feature rows and their check marks —
 * was `text-neo-black` sitting on a `bg-neo-navy-light` card. Unreadable, on the
 * one card whose entire job is selling the subscription.
 *
 * The Free card immediately above it is on the same dark ground and gets it
 * right (`text-neo-white` copy, `text-neo-lime` checks), which is what makes
 * this the recurring **Class 3** shape: two siblings that should look alike,
 * one silently diverged. The Pro half was written against a light fill and the
 * background moved out from under it — the same way `EducationHero` went
 * navy-on-navy (see `EducationHero.contrast.test.ts`).
 *
 * Asserted against SOURCE, not a jsdom render, for the reason spelled out in
 * that sibling test: jsdom computes no colours and silently drops modern CSS,
 * so a render-based version of this check passes while the bug ships.
 *
 * Scoped to the Pro card rather than the whole file on purpose: `text-black` on
 * the `bg-neo-pink` "Most Popular" pill is correct and must keep passing.
 */
const SECTION = path.resolve(__dirname, '../ProFramingSection.tsx');

/**
 * Source of the Pro tier card — from its `{/* Pro Tier *\/}` marker to the end
 * of the file. Anchored on the comment because the card's own opening tag
 * carries the class list under test, so keying off a class would make the
 * extraction fail the moment the bug is fixed.
 */
function proCardSource(src: string): string {
  const start = src.indexOf('{/* Pro Tier */}');
  if (start === -1) throw new Error('no `{/* Pro Tier */}` marker in ProFramingSection.tsx');
  return src.slice(start);
}

describe('ProFramingSection — Pro card contrast', () => {
  const src = fs.readFileSync(SECTION, 'utf8');
  const proCard = proCardSource(src);

  it('does not put black copy on the dark Pro card', () => {
    // Guard the premise: if the card is ever given a light fill, black copy
    // becomes correct and this whole test should be revisited, not silently
    // passing against an assumption that no longer holds.
    expect(
      proCard,
      'expected the Pro card to sit on a dark (navy) ground',
    ).toMatch(/bg-neo-navy/);

    const offenders = [...proCard.matchAll(/text-neo-black(?:\/\d+)?/g)].map((m) => m[0]);
    expect(
      offenders,
      `black copy on the dark Pro card — invisible: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps the price divider visible against the dark ground', () => {
    // Same bug, quieter: a `border-neo-black/20` rule over navy composites to
    // roughly the background itself, so the divider under the price vanishes.
    const dimmedBlackBorders = [...proCard.matchAll(/border-neo-black\/\d+/g)].map((m) => m[0]);
    expect(
      dimmedBlackBorders,
      `dimmed black border on a dark ground: ${dimmedBlackBorders.join(', ')}`,
    ).toEqual([]);
  });

  it('matches the Free card it sits beside', () => {
    // The two cards are read side by side, so the check marks must not be two
    // different colours. Free uses `text-neo-lime`; Pro must too.
    const proChecks = (proCard.match(/text-neo-lime[^"]*">✓/g) ?? []).length;
    expect(
      proChecks,
      'Pro feature check marks should be text-neo-lime, matching the Free card',
    ).toBeGreaterThan(0);
  });
});
