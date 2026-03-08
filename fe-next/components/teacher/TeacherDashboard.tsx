/**
 * TeacherDashboard - Game HUD Edition
 *
 * "Battle Station" command center aesthetic:
 * - neo-title text stroke headings + italic
 * - Oversized CTA panels with ghost background icons
 * - XP bar divider between sections
 * - HUD-style accordion headers (rotated icon boxes, slanted badge pills)
 * - Bouncing COMMANDER'S INTEL tip card
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';
import { cn } from '@/lib/utils';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import QuickStartButton from './QuickStartButton';
import { useRecentGameSettings, type GameConfiguration } from '@/hooks/useRecentGameSettings';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentTrackingPanel, AssignmentCreator } from './assignments';
import { DuelMonitoringPanel } from './dashboard';
import {
  Gamepad2, BookPlus, ChevronDown, Swords, ClipboardList, Users,
  ListTodo, Hammer,
} from 'lucide-react';

// --- Animation variants ---

const pageEntrance = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const slideInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 340, damping: 24 } },
};

const cardEntrance = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 380, damping: 20 } },
};

const accordionBody = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { type: 'spring' as const, stiffness: 280, damping: 30 },
      opacity: { duration: 0.15 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { type: 'spring' as const, stiffness: 300, damping: 35 },
      opacity: { duration: 0.08 },
    },
  },
};

// --- XP Bar decorative divider ---

function XpDivider() {
  return (
    <div className="flex items-center gap-3 mb-10 h-5">
      <div className="flex-1 bg-neo-gray border-3 border-black rounded-neo-pill h-full p-0.5 flex gap-0.5 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 h-full bg-neo-yellow"
            style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)' }}
          />
        ))}
        <motion.div
          className="w-[12%] h-full bg-neo-yellow/40"
          style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <span className="font-neo-body font-black text-[10px] uppercase tracking-widest text-neo-yellow whitespace-nowrap">
        LVL UP: 75%
      </span>
    </div>
  );
}

// --- HUD Section ---

interface HudSectionProps {
  label: string;
  badge: string;
  badgeColor: 'yellow' | 'pink' | 'cyan';
  icon: React.ReactNode;
  emoji: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const badgePalette = {
  yellow: 'bg-neo-yellow text-black border-black',
  pink: 'bg-neo-pink text-white border-black',
  cyan: 'bg-neo-cyan text-black border-black',
};

const headerActiveBg = {
  yellow: 'bg-neo-yellow text-black border-b-black',
  pink: 'bg-neo-pink text-black',
  cyan: 'bg-neo-cyan text-black',
};

const headerCollapsedHover = {
  yellow: 'hover:bg-neo-yellow',
  pink: 'hover:bg-neo-pink',
  cyan: 'hover:bg-neo-cyan',
};

function HudSection({ label, badge, badgeColor, emoji, icon, isOpen, onToggle, children }: HudSectionProps) {
  return (
    <section
      className={cn(
        'rounded-neo-xl border-4 border-black bg-neo-navy overflow-hidden shadow-hard-lg',
        // Party mode: thick left accent when collapsed
        !isOpen && cn('border-l-[10px]', {
          yellow: 'border-l-neo-yellow',
          pink: 'border-l-neo-pink',
          cyan: 'border-l-neo-cyan',
        }[badgeColor])
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between p-6 border-b-4 border-black transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-neo-yellow',
          isOpen
            ? headerActiveBg[badgeColor]
            : cn('bg-white text-black', headerCollapsedHover[badgeColor])
        )}
      >
        <div className="flex items-center gap-4">
          {/* Party mode: emoji that wobbles when section opens */}
          <motion.span
            className="text-2xl"
            animate={isOpen ? { rotate: [0, -12, 10, -5, 0], scale: [1, 1.25, 1.1, 1.2, 1] } : {}}
            transition={{ duration: 0.45 }}
          >
            {emoji}
          </motion.span>
          {/* Game HUD: rotated icon box */}
          <div
            className={cn(
              'w-10 h-10 rounded-neo border-2 border-black flex items-center justify-center shadow-hard-sm',
              isOpen ? 'bg-black rotate-[-2deg]' : 'bg-black rotate-[2deg]'
            )}
          >
            <span className={isOpen ? 'text-neo-yellow' : 'text-white'}>{icon}</span>
          </div>
          <h2 className="text-3xl font-neo-display font-black uppercase tracking-tighter italic text-black">
            {label}
          </h2>
          {/* Slanted badge */}
          <span
            className={cn(
              'px-3 py-0.5 border-2 text-[10px] font-black rounded shadow-hard-sm uppercase tracking-widest',
              isOpen ? 'bg-black text-neo-yellow border-black' : badgePalette[badgeColor],
              isOpen ? '' : 'rotate-2'
            )}
          >
            {badge}
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring' as const, stiffness: 350, damping: 25 }}>
          <ChevronDown className="w-8 h-8 text-black" aria-hidden="true" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            variants={accordionBody}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ overflow: 'hidden' }}
            className="bg-neo-gray/50"
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// --- Main dashboard ---

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [showClassrooms, setShowClassrooms] = useState(true);
  const [showLessons, setShowLessons] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [showDuels, setShowDuels] = useState(false);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const { getMostRecent, hasRecentConfig } = useRecentGameSettings();
  const { classrooms } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  useState(() => {
    if (classrooms.length === 1 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].id);
    }
  });

  const handleQuickStart = useCallback(
    (config: GameConfiguration) => {
      const lessonParam = config.lessonIds[0] || '';
      router.push(`/${language}/education/classroom-game?lessonId=${lessonParam}`);
    },
    [router, language]
  );

  const classroomSelect = (
    <select
      value={selectedClassroomId}
      onChange={(e) => setSelectedClassroomId(e.target.value)}
      className="px-4 py-2 bg-white border-2 border-black text-black font-neo-body font-bold shadow-hard-sm rounded-neo focus:outline-none focus:ring-2 focus:ring-neo-cyan"
    >
      {classrooms.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />
      <TeacherOnboarding />

      <motion.div
        className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1"
        variants={pageEntrance}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header — game HUD + party mode blend */}
        <motion.div variants={slideInUp} className="mb-10 flex items-center gap-5">
          <div className="flex gap-2">
            {/* Party mode: floating school emoji */}
            <motion.span
              className="text-3xl"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              🏫
            </motion.span>
            {/* Game HUD: controller in pink rotated box */}
            <motion.div
              className="p-3 bg-neo-pink border-4 border-black rounded-neo-xl shadow-hard-lg"
              style={{ rotate: -3 }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            >
              <span className="text-3xl">🎮</span>
            </motion.div>
          </div>
          <div>
            <h1 className="neo-title text-5xl sm:text-6xl font-neo-display font-black text-neo-white uppercase italic tracking-tighter">
              {t('teacher.dashboard.title')}
            </h1>
            <p className="text-neo-cyan font-neo-body font-black uppercase tracking-widest text-xs bg-black/40 inline-block px-3 py-1 rounded-neo mt-2">
              {t('teacher.dashboard.subtitle')}
            </p>
          </div>
        </motion.div>

        {/* Quick Actions — oversized game panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <motion.button
            variants={cardEntrance}
            onClick={() => router.push(`/${language}/education/classroom-game`)}
            style={{ rotate: -1.5 }}
            whileHover={{ rotate: 0, y: -6, x: -3, boxShadow: '10px 10px 0px black' }}
            whileTap={{ rotate: 0, scale: 0.97, y: 1, x: 1, boxShadow: '2px 2px 0px black' }}
            className={cn(
              'group relative overflow-hidden p-10 rounded-neo-xl border-4 border-black',
              'bg-neo-cyan shadow-hard-xl text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            {/* Ghost background icon */}
            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-300">
              <Gamepad2 className="w-60 h-60 text-black" />
            </div>
            <div className="flex items-center gap-6 relative">
              <div className="w-24 h-24 rounded-neo-xl bg-black border-4 border-black flex items-center justify-center shadow-hard group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-12 h-12 text-neo-cyan" />
              </div>
              <div>
                <h3 className="text-4xl font-neo-display font-black text-black uppercase tracking-tight italic">
                  {t('education.classroomGame.startGame')}
                </h3>
                <p className="text-sm text-black/70 font-neo-body font-bold mt-1 leading-snug max-w-xs">
                  {t('education.classroomGame.startGameDescription')}
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            variants={cardEntrance}
            onClick={() => setShowLessons(true)}
            style={{ rotate: 1 }}
            whileHover={{ rotate: 0, y: -6, x: -3, boxShadow: '10px 10px 0px black' }}
            whileTap={{ rotate: 0, scale: 0.97, y: 1, x: 1, boxShadow: '2px 2px 0px black' }}
            className={cn(
              'group relative overflow-hidden p-10 rounded-neo-xl border-4 border-black',
              'bg-neo-pink shadow-hard-xl text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            {/* Ghost background icon */}
            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none group-hover:-rotate-12 transition-transform duration-300">
              <Hammer className="w-60 h-60 text-black" />
            </div>
            <div className="flex items-center gap-6 relative">
              <div className="w-24 h-24 rounded-neo-xl bg-black border-4 border-black flex items-center justify-center shadow-hard group-hover:scale-110 transition-transform">
                <BookPlus className="w-12 h-12 text-neo-pink" />
              </div>
              <div>
                <h3 className="text-4xl font-neo-display font-black text-black uppercase tracking-tight italic">
                  {t('teacher.dashboard.createLesson')}
                </h3>
                <p className="text-sm text-black/70 font-neo-body font-bold mt-1 leading-snug max-w-xs">
                  {t('teacher.dashboard.createLessonDescription')}
                </p>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Quick Start */}
        {hasRecentConfig && (
          <motion.div variants={slideInUp} className="mb-8">
            <QuickStartButton config={getMostRecent()} onClick={handleQuickStart} />
          </motion.div>
        )}

        {/* XP Bar divider */}
        <motion.div variants={slideInUp}>
          <XpDivider />
        </motion.div>

        {/* HUD Sections */}
        <div className="space-y-6">
          {/* Assignments */}
          <motion.div variants={slideInUp}>
            <HudSection
              label={t('teacher.dashboard.assignments')}
              badge={t('teacher.dashboard.track')}
              badgeColor="yellow"
              emoji="📝"
              icon={<ListTodo className="w-5 h-5" />}
              isOpen={showAssignments}
              onToggle={() => setShowAssignments(!showAssignments)}
            >
              {classrooms.length === 0 ? (
                <p className="text-neo-white/60 font-neo-body font-bold text-center py-4">
                  {t('teacher.dashboard.createClassroomFirst')}
                </p>
              ) : (
                <div className="space-y-4">
                  {classrooms.length > 1 && (
                    <div className="flex items-center gap-3">
                      <label className="text-neo-white font-neo-body font-bold">
                        {t('teacher.dashboard.selectClassroom')}:
                      </label>
                      {classroomSelect}
                    </div>
                  )}
                  {selectedClassroomId && (
                    <AssignmentTrackingPanel
                      classroomId={selectedClassroomId}
                      onCreateAssignment={() => setShowAssignmentCreator(true)}
                    />
                  )}
                </div>
              )}
            </HudSection>
          </motion.div>

          {/* Duels */}
          {classrooms.length > 0 && (
            <motion.div variants={slideInUp}>
              <HudSection
                label={t('teacher.dashboard.duelActivity')}
                badge={t('teacher.dashboard.live')}
                badgeColor="pink"
                emoji="⚔️"
                icon={<Swords className="w-5 h-5" />}
                isOpen={showDuels}
                onToggle={() => setShowDuels(!showDuels)}
              >
                {classrooms.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-neo-white font-neo-body font-bold">
                      {t('teacher.dashboard.selectClassroom')}:
                    </label>
                    {classroomSelect}
                  </div>
                )}
                {selectedClassroomId && <DuelMonitoringPanel classroomId={selectedClassroomId} />}
              </HudSection>
            </motion.div>
          )}

          {/* Classrooms */}
          <motion.div variants={slideInUp}>
            <HudSection
              label={t('teacher.dashboard.classrooms')}
              badge={t('teacher.dashboard.manage')}
              badgeColor="cyan"
              emoji="👥"
              icon={<Users className="w-5 h-5" />}
              isOpen={showClassrooms}
              onToggle={() => setShowClassrooms(!showClassrooms)}
            >
              <ClassroomManager />
            </HudSection>
          </motion.div>

          {/* Lessons */}
          <motion.div variants={slideInUp}>
            <HudSection
              label={t('teacher.dashboard.lessons')}
              badge={t('teacher.dashboard.build')}
              badgeColor="pink"
              emoji="📖"
              icon={<ClipboardList className="w-5 h-5" />}
              isOpen={showLessons}
              onToggle={() => setShowLessons(!showLessons)}
            >
              <LessonBuilder />
            </HudSection>
          </motion.div>
        </div>

        {/* Commander's Intel tip card */}
        <motion.div
          variants={slideInUp}
          whileHover={{ y: -3, boxShadow: '8px 8px 0px black' }}
          className="mt-12 p-6 rounded-neo-xl border-4 border-black bg-neo-yellow shadow-hard text-black relative overflow-hidden"
        >
          {/* Decorative circle */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rotate-12 -me-16 -mt-16 rounded-full pointer-events-none" />
          <div className="flex items-start gap-5 relative z-10">
            <motion.div
              className="p-3 bg-black rounded-neo shadow-hard-sm flex-shrink-0"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
            >
              <span className="text-2xl">💡</span>
            </motion.div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-neo-display font-black uppercase tracking-tight italic">
                  {t('teacher.dashboard.quickTip')}
                </h3>
                <span className="text-[10px] font-black bg-black text-neo-yellow px-2 py-0.5 rounded uppercase tracking-widest">
                  PRO
                </span>
              </div>
              <p className="font-bold leading-relaxed text-black/80">
                {t('teacher.dashboard.quickTipDescription')}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {selectedClassroomId && (
        <AssignmentCreator
          classroomId={selectedClassroomId}
          isOpen={showAssignmentCreator}
          onClose={() => setShowAssignmentCreator(false)}
          onComplete={() => setShowAssignmentCreator(false)}
        />
      )}
    </div>
  );
}
