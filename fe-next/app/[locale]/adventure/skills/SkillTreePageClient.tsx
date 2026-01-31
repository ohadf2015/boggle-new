/**
 * SkillTreePageClient Component
 *
 * Client-side skill tree page with skill tree view and unlock modal.
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { SkillTreeView, SkillUnlockModal } from '@/components/adventure/SkillTree';
import type { SkillNode } from '@/types/skills';

export function SkillTreePageClient() {
  const { t } = useLanguage();
  const [unlockedSkill, setUnlockedSkill] = useState<SkillNode | null>(null);

  const handleSkillUnlock = useCallback((skill: SkillNode) => {
    setUnlockedSkill(skill);
  }, []);

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
          href="/adventure"
          className={cn(
            'inline-flex items-center gap-2',
            'text-neo-white/70 hover:text-neo-white',
            'mb-6 transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
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
