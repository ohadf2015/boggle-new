/**
 * BossIntro Component
 *
 * Pre-battle boss introduction cutscene displayed before a boss level starts.
 * Shows the boss character with a dramatic entrance animation, their name,
 * twist mechanic description, and a start taunt.
 */

'use client';

import { memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import { Mascot } from '@/components/ui/Mascot';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { BossIntroProps } from '@/types/boss';

// ==============================================
// COMPONENT
// ==============================================

const BossIntro = memo<BossIntroProps>(({ boss, worldNumber: _worldNumber, onStart, onSkip }) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onSkip);

  const bossName = t(boss.displayName);
  const mechanicDescription = t(boss.twistMechanic.description);
  const startTaunt = boss.taunts.onStart.length > 0
    ? t(boss.taunts.onStart[0])
    : '';

  return (
    <>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="boss-intro-title"
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-neo-black/90 backdrop-blur-md animate-in fade-in-0 duration-300'
        )}
      >
        {/* Modal Content */}
        <div
          className={cn(
            'relative w-full max-w-md mx-4',
            'bg-neo-navy border-4 border-neo-black',
            'rounded-neo shadow-hard-lg',
            'p-6 md:p-8',
            'flex flex-col items-center',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
          )}
        >
          {/* Boss Battle Heading */}
          <h1
            style={{ animationDelay: '0.1s' }}
            className={cn(
              'text-center text-2xl md:text-3xl font-black',
              'text-neo-yellow mb-4',
              'uppercase tracking-wider',
              'drop-shadow-[0_0_10px_rgba(255,225,53,0.6)]',
              'animate-in fade-in-0 slide-in-from-top-4 duration-300 fill-mode-both'
            )}
          >
            {t('adventure.bosses.bossIntro')}
          </h1>

          {/* Boss Image with dramatic reveal + scared mascot */}
          <div className="relative mb-4">
            {/* Danger glow behind boss portrait */}
            <div
              style={{ animationDelay: '0.15s', background: bossFightTheme.avatarGlow }}
              className="absolute -inset-3 rounded-neo blur-md animate-in fade-in-0 duration-300 fill-mode-both"
              aria-hidden="true"
            />
            <div
              style={{ animationDelay: '0.2s', boxShadow: `0 0 20px ${bossFightTheme.avatarGlow}` }}
              className={cn(
                'relative w-40 h-40 md:w-48 md:h-48',
                'border-neo-thick border-neo-black',
                'rounded-neo shadow-hard-lg',
                'overflow-hidden bg-neo-navy/50',
                'animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both'
              )}
            >
              <img
                src={boss.imagePath}
                alt={bossName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Scared mascot bounces in from bottom-right */}
            <div
              style={{ animationDelay: '0.6s' }}
              className="absolute -bottom-2 -right-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 fill-mode-both"
            >
              <Mascot variant="scared" size="sm" />
            </div>
          </div>

          {/* Boss Name */}
          <h1
            id="boss-intro-title"
            style={{ animationDelay: '0.3s' }}
            className={cn(
              'text-center text-xl md:text-2xl font-black',
              bossFightTheme.bossNameColor,
              'mb-2',
              'animate-in fade-in-0 duration-300 fill-mode-both'
            )}
          >
            {bossName}
          </h1>

          {/* Storyline Text */}
          {boss.storylineIntro && (
            <div
              style={{ animationDelay: '0.35s' }}
              className={cn(
                'w-full p-3 mb-3 rounded-neo',
                'bg-neo-cyan/5 border-2 border-neo-cyan/20',
                'text-center',
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              <p className="text-neo-white text-xs md:text-sm italic leading-relaxed">
                {t(boss.storylineIntro)}
              </p>
            </div>
          )}

          {/* Twist Mechanic Section */}
          <div
            style={{ animationDelay: '0.4s' }}
            className={cn(
              'w-full p-3 mb-4 rounded-neo',
              'bg-neo-orange/10 border-2 border-neo-orange/40',
              'text-center',
              'animate-in fade-in-0 duration-300 fill-mode-both'
            )}
          >
            <p className="text-neo-orange text-xs font-bold uppercase tracking-wider mb-1">
              {t('adventure.bosses.twistMechanic')}
            </p>
            <p className="text-neo-white font-bold text-sm md:text-base">
              {mechanicDescription}
            </p>
          </div>

          {/* Start Taunt */}
          {startTaunt && (
            <p
              style={{ animationDelay: '0.6s' }}
              className={cn(
                'text-center text-neo-white italic font-bold',
                'text-sm md:text-base mb-6',
                'px-4',
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              &ldquo;{startTaunt}&rdquo;
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            {/* Fight Button */}
            <div
              style={{ animationDelay: '0.7s' }}
              className="animate-in fade-in-0 duration-300 fill-mode-both"
            >
              <button
                onClick={onStart}
                className={cn(
                  'w-full py-3 px-4',
                  'bg-neo-lime text-neo-black',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                {t('adventure.bosses.readyToFight')}
              </button>
            </div>

            {/* Skip Button */}
            <div
              style={{ animationDelay: '0.9s' }}
              className="animate-in fade-in-0 duration-300 fill-mode-both"
            >
              <button
                onClick={onSkip}
                className={cn(
                  'w-full py-2 px-4',
                  'bg-transparent text-neo-white',
                  'font-bold text-base',
                  'hover:text-neo-white hover:bg-neo-white/5',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                  'rounded-neo transition-all duration-200'
                )}
              >
                {t('adventure.bosses.skipIntro')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

BossIntro.displayName = 'BossIntro';

export default BossIntro;
