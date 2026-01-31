/**
 * Skill Tree Page
 *
 * Displays the full skill tree with all paths and unlock functionality.
 * Accessible from adventure mode navigation.
 */

import { Metadata } from 'next';
import { SkillTreePageClient } from './SkillTreePageClient';

export const metadata: Metadata = {
  title: 'Skill Tree | LexiClash Adventure',
  description: 'Unlock skills to enhance your adventure gameplay',
};

export default function SkillTreePage() {
  return <SkillTreePageClient />;
}
