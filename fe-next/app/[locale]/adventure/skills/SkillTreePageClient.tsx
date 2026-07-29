/**
 * SkillTreePageClient Component
 *
 * Client-side skill tree page with skill tree view and unlock modal.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgressionData } from '@/contexts/ProgressionContext';
import { useSkillTreeStore } from '@/hooks/useSkillTreeStore';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { SkillTreeView, SkillUnlockModal } from '@/components/adventure/SkillTree';
import { SKILL_CATALOG } from '@/utils/skillTreeUtils';
import type { SkillNode } from '@/types/adventure';

export function SkillTreePageClient() {
  const { t, language } = useLanguage();
  const { progression } = useProgressionData();
  const hydrateFromDB = useSkillTreeStore((s) => s.hydrateFromDB);
  const { earnAchievement } = useAdventureAchievements();
  const [unlockedSkill, setUnlockedSkill] = useState<SkillNode | null>(null);

  // Hydrate skill tree from DB on first load
  useEffect(() => {
    if (progression?.skillTree && progression?.skillPoints !== undefined) {
      hydrateFromDB(progression.skillTree, progression.skillPoints);
    }
  }, [progression?.skillTree, progression?.skillPoints, hydrateFromDB]);

  const handleSkillUnlock = useCallback((skill: SkillNode) => {
    setUnlockedSkill(skill);
    earnAchievement('SKILL_UNLOCKED');

    // Check if entire path is now complete (read fresh from Zustand store)
    const { unlockedSkills } = useSkillTreeStore.getState();
    const pathSkills = SKILL_CATALOG.filter(s => s.path === skill.path);
    if (pathSkills.length > 0 && pathSkills.every(s => unlockedSkills.has(s.id))) {
      earnAchievement('SKILL_PATH_COMPLETE');
    }
  }, [earnAchievement]);

  const handleCloseModal = useCallback(() => {
    setUnlockedSkill(null);
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen',
        'bg-neo-navy',
        'px-4 py-8 md:px-8'
      )}
    >
      <div className="max-w-6xl mx-auto">
        {/* Back Navigation */}
        <Link
          href={`/${language}/adventure`}
          className={cn(
            'inline-flex items-center gap-2',
            'text-neo-white hover:text-neo-white',
            'mb-6 transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
          {t('adventure.backToMap')}
        </Link>

        {/* Skill Tree */}
        <SkillTreeView onSkillUnlock={handleSkillUnlock} />

        {/* Unlock Modal */}
        <SkillUnlockModal
          skill={unlockedSkill}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}
