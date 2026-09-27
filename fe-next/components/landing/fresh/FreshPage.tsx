'use client';

/**
 * The fresh-visitor homepage (and the crawler default): one responsive page,
 * a hero and four one-idea beats (daily, friends, modes, classrooms). Round 7
 * cut the languages section (header switcher covers it); the modes row stays as
 * the explore beat because mode cards are the homepage's most-clicked CTA.
 * Below the beats, LandingView's How to Play block and page.tsx's FAQ
 * (HomepageContentSection) form one reference section, and the close ends the
 * page from the bottom of HomepageContentSection, so nothing but the site
 * footer follows the last PLAY (fresh.shell.ending.test).
 *
 * Ownership: FreshHero + HeroGrid = piece B, the rest = A.
 * No framer-motion, no Avatar code in this tree (fresh.shell.FreshPage test).
 */
import { FreshHero } from './FreshHero';
import { FreshDaily } from './FreshDaily';
import { FreshFriends } from './FreshFriends';
import { ModeRow } from './ModeRow';
import { FreshAdSlot } from './FreshAdSlot';
import { FreshClassrooms } from './FreshClassrooms';

export interface FreshPageProps {
  /**
   * Opens OnboardingFlow (PageClient → LandingView.onStartOnboarding). Undefined
   * on the server and for returning users; PLAY links then navigate normally.
   * The finale PLAY gets the same action through ./freshPlayBridge.
   */
  onPlay?: () => void;
}

export function FreshPage({ onPlay }: FreshPageProps) {
  return (
    <div className="flex w-full flex-col overflow-x-clip">
      <FreshHero onPlay={onPlay} />
      <FreshDaily />
      <FreshFriends />
      <ModeRow />
      <FreshAdSlot />
      <FreshClassrooms />
    </div>
  );
}
