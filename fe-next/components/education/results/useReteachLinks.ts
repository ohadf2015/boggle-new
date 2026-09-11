/**
 * Every follow-up a teacher can take on the class's missed words, in one hook.
 *
 * Extracted verbatim from ClassroomResultsCard so the card can go back to being
 * a layout: the card decides what the room SEES, this decides where each button
 * GOES. Every builder is wrapped in try/catch and returns null on failure —
 * a malformed lesson name must hide one button, never blank the results screen.
 *
 * Class-level words only, never student names: these links leave the room.
 */

'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildClassGapShareUrl } from '@/lib/education/classGapShare';
import { buildMissGapPracticeShareUrl } from '@/lib/education/missGapPracticeShare';
import { buildMissGapAssignmentPath } from '@/lib/education/missGapAsyncAssignment';
import { buildUnpluggedReteachPath, buildUnpluggedReteachUrl } from '@/lib/education/unpluggedReteachLive';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { openUnpluggedReteachPrintablePack } from '@/lib/education/unpluggedReteachPrintablePack';
import { shareWithFallback } from '@/utils/shareWithFallback';
import type { ClassroomSummary } from '@/shared/types/classroom';

export type ShareState = 'idle' | 'copied' | 'shared';

export interface ReteachLinks {
  classGapUrl: string | null;
  googleClassroomReteachHref: string | null;
  googleClassroomAssignHref: string | null;
  googleClassroomUnpluggedAssignHref: string | null;
  unpluggedReteachHref: string | null;
  missGapAsyncAssignHref: string | null;
  shareState: ShareState;
  missGapShareState: ShareState;
  onPrintPracticeSheet: () => void;
  onPrintUnpluggedPack: () => void;
  onShareMissGapPractice: () => Promise<void>;
  onShareGap: () => Promise<void>;
}

export function useReteachLinks(summary: ClassroomSummary, isTeacher: boolean): ReteachLinks {
  const { t, language } = useLanguage();
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [missGapShareState, setMissGapShareState] = useState<ShareState>('idle');

  const hasMisses = isTeacher && summary.missedWords.length > 0;
  const lesson = summary.lessonNames.join(', ');
  const gapArgs = {
    locale: language,
    lessonNames: summary.lessonNames,
    teacherName: summary.teacherName,
    found: summary.classFoundCount,
    total: summary.totalWords,
    missedWords: summary.missedWords,
  };

  const safely = <T,>(build: () => T): T | null => {
    try {
      return build();
    } catch {
      return null;
    }
  };

  const classGapUrl = hasMisses ? safely(() => buildClassGapShareUrl(gapArgs)) : null;

  /**
   * Google Classroom add-on MVP: post the class-gap card (missed words, no names)
   * to the Stream so the teacher can start a 3-min reteach Live from that link.
   * Phase-1 share dialog — no OAuth. Absolute lexiclash.live URL.
   */
  const googleClassroomReteachHref = classGapUrl
    ? safely(() =>
        buildGoogleClassroomShareUrl({
          joinUrl: classGapUrl,
          title: t('education.results.postReteachGoogleClassroomTitle', { lesson }),
          body: t('education.results.postReteachGoogleClassroomBody', {
            missed: summary.missedWords.slice(0, 8).join(', '),
          }),
          itemType: 'announcement',
        })
      )
    : null;

  /**
   * After Live ends: assign the same class-gap card as Google Classroom *homework*
   * (itemtype=assignment). Students open practice-at-home words from Classwork;
   * teacher sets due date in Google's dialog. Still Phase-1 share — no OAuth.
   */
  const googleClassroomAssignHref = classGapUrl
    ? safely(() =>
        buildGoogleClassroomShareUrl({
          joinUrl: classGapUrl,
          title: t('education.results.assignPracticeGoogleClassroomTitle', { lesson }),
          body: t('education.results.assignPracticeGoogleClassroomBody', {
            missed: summary.missedWords.slice(0, 8).join(', '),
          }),
          itemType: 'assignment',
        })
      )
    : null;

  const unpluggedReteachHref = hasMisses ? safely(() => buildUnpluggedReteachPath(gapArgs)) : null;

  /**
   * Google Classroom *assignment* that ships Unplugged reteach (#959) + the #957
   * printable practice sheet as device-free homework. Foils Kahootopia Assignments
   * / Classic Unplugged. Absolute Unplugged Live deep-link on lexiclash.live;
   * class-level missed words only — no student names. Phase-1 share — no OAuth.
   */
  const googleClassroomUnpluggedAssignHref = hasMisses
    ? safely(() =>
        buildGoogleClassroomShareUrl({
          joinUrl: buildUnpluggedReteachUrl(gapArgs),
          title: t('education.results.assignUnpluggedGoogleClassroomTitle', { lesson }),
          body: t('education.results.assignUnpluggedGoogleClassroomBody', {
            missed: summary.missedWords.slice(0, 8).join(', '),
          }),
          itemType: 'assignment',
        })
      )
    : null;

  /**
   * Async miss-gap homework (#972 practice card + due date → class streak).
   * Foil Kahootopia Assignments (live-game homework). NOT Unplugged Live.
   */
  const missGapAsyncAssignHref = hasMisses ? safely(() => buildMissGapAssignmentPath(gapArgs)) : null;

  const sheetLabels = () => ({
    title: t('education.results.printPracticeSheetTitle', { lesson }),
    subtitle: t('education.results.printPracticeSheetSubtitle'),
    writeLabel: t('education.results.printPracticeSheetWriteLabel'),
    sentenceLabel: t('education.results.printPracticeSheetSentenceLabel'),
    nameLine: t('education.results.printPracticeSheetNameLine'),
    dateLine: t('education.results.printPracticeSheetDateLine'),
  });

  /**
   * Device-free reteach: printable missed-words practice sheet (foil Kahoot
   * Classic Unplugged / Team Tiles). Class-level words only — no student names.
   */
  const onPrintPracticeSheet = () => {
    if (!hasMisses) return;
    openMissedWordsPracticeSheet({
      lesson,
      teacher: summary.teacherName,
      missedWords: summary.missedWords,
      locale: language,
      labels: { ...sheetLabels(), footer: t('education.results.printPracticeSheetFooter') },
    });
  };

  /**
   * Unplugged reteach printable pack PDF (#957 practice pages + QR deep-link to
   * #959 Live). Foil Kahoot Classic Unplugged. Class words only — no names.
   */
  const onPrintUnpluggedPack = () => {
    if (!hasMisses) return;
    openUnpluggedReteachPrintablePack({
      lesson,
      teacher: summary.teacherName,
      missedWords: summary.missedWords,
      found: summary.classFoundCount,
      total: summary.totalWords,
      locale: language,
      labels: {
        ...sheetLabels(),
        footer: t('education.results.unpluggedReteachPackFooter'),
        packTitle: t('education.results.unpluggedReteachPackTitle', { lesson }),
        packSubtitle: t('education.results.unpluggedReteachPackSubtitle'),
        packFoil: t('education.results.unpluggedReteachPackFoil'),
        qrHint: t('education.results.unpluggedReteachPackQrHint'),
        packHowTo: t('education.results.unpluggedReteachPackHowTo'),
        practiceHeading: t('education.results.unpluggedReteachPackPracticeHeading'),
      },
    });
  };

  /**
   * Shareable miss-gap practice card / PDF after Unplugged Classroom assign.
   * Foil: Kahoot Unplugged has no take-home. Parents get a lexiclash.live link
   * that prints the #957 practice sheet (Save as PDF). Class words only.
   */
  const onShareMissGapPractice = async () => {
    if (!hasMisses) return;
    const url = buildMissGapPracticeShareUrl(gapArgs);
    const text = t('education.results.shareMissGapPracticeText', {
      lesson,
      missed: summary.missedWords.join(', '),
    });
    const result = await shareWithFallback({
      title: t('education.results.shareMissGapPracticeTitle'),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setMissGapShareState(result);
  };

  const onShareGap = async () => {
    const url = buildClassGapShareUrl(gapArgs);
    const text = summary.missedWords.length
      ? t('education.results.shareGapText', {
          lesson,
          found: summary.classFoundCount,
          total: summary.totalWords,
          missed: summary.missedWords.join(', '),
        })
      : t('education.results.shareGapAllFoundText', { lesson });
    const result = await shareWithFallback({
      title: t('education.results.shareGapTitle'),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  return {
    classGapUrl,
    googleClassroomReteachHref,
    googleClassroomAssignHref,
    googleClassroomUnpluggedAssignHref,
    unpluggedReteachHref,
    missGapAsyncAssignHref,
    shareState,
    missGapShareState,
    onPrintPracticeSheet,
    onPrintUnpluggedPack,
    onShareMissGapPractice,
    onShareGap,
  };
}
