/**
 * PersonalizedDrillRecommendation tests
 *
 * Critical contract: when the weakest domain's drill is still locked
 * (rare-gems unlocks at 10 games, pattern-switcher at 5), the
 * recommendation must skip to the next-weakest UNLOCKED drill instead
 * of telling a brand-new user to "play 10 more games" as the primary CTA.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} {...props}>{children}</button>
    ),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

import PersonalizedDrillRecommendation from '../PersonalizedDrillRecommendation';

const stable = (score: number) => ({ score, trend: 'stable' as const });
const declining = (score: number) => ({ score, trend: 'declining' as const });

describe('PersonalizedDrillRecommendation', () => {
  it('recommends the lowest-scoring domain when all are unlocked', () => {
    render(
      <PersonalizedDrillRecommendation
        gamesPlayed={20}
        domains={{
          processingSpeed: stable(80),
          workingMemory: stable(60),
          attention: stable(45),
          flexibility: stable(70),
          vocabulary: stable(75),
        }}
      />,
    );
    // attention=45 is lowest → combo-master
    expect(screen.getByText('brain.drills.combo-master.name')).toBeInTheDocument();
  });

  it('prioritizes a declining domain over a lower-scoring stable one', () => {
    render(
      <PersonalizedDrillRecommendation
        gamesPlayed={20}
        domains={{
          processingSpeed: stable(30),       // lowest score, but stable
          workingMemory: declining(60),      // declining trend wins
          attention: stable(70),
          flexibility: stable(80),
          vocabulary: stable(75),
        }}
      />,
    );
    expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
  });

  it('skips locked drills for new users — recommends next-weakest unlocked drill', () => {
    // gamesPlayed=0 → pattern-switcher (req 5) and rare-gems (req 10) are LOCKED.
    // Even though vocabulary=10 is the lowest score, the recommendation must
    // pick the next-weakest UNLOCKED drill (memory-hunt @ 30).
    render(
      <PersonalizedDrillRecommendation
        gamesPlayed={0}
        domains={{
          processingSpeed: stable(60),
          workingMemory: stable(30),
          attention: stable(50),
          flexibility: stable(20),  // pattern-switcher locked, must skip
          vocabulary: stable(10),   // rare-gems locked, must skip
        }}
      />,
    );
    // memory-hunt is the lowest UNLOCKED domain
    expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
    // not the locked drills
    expect(screen.queryByText('brain.drills.rare-gems.name')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.drills.pattern-switcher.name')).not.toBeInTheDocument();
  });

  it('skips a locked declining drill — recommends next declining or weakest unlocked', () => {
    render(
      <PersonalizedDrillRecommendation
        gamesPlayed={0}
        domains={{
          processingSpeed: stable(80),
          workingMemory: declining(60),       // declining + unlocked → win
          attention: stable(70),
          flexibility: declining(40),         // declining BUT locked
          vocabulary: declining(30),          // declining BUT locked
        }}
      />,
    );
    expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
  });

  it('partial unlock: pattern-switcher unlocked at 5 but rare-gems still locked', () => {
    render(
      <PersonalizedDrillRecommendation
        gamesPlayed={5}
        domains={{
          processingSpeed: stable(80),
          workingMemory: stable(70),
          attention: stable(60),
          flexibility: stable(15),  // unlocked at 5 ✓
          vocabulary: stable(10),   // still locked (req 10)
        }}
      />,
    );
    expect(screen.getByText('brain.drills.pattern-switcher.name')).toBeInTheDocument();
  });
});
