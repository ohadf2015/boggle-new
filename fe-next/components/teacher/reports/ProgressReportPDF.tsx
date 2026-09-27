/**
 * ProgressReportPDF — the printable student / class progress report.
 *
 * Rendered by `pdf(<ProgressReportPDF/>)` in react-pdf's own root, so it must
 * not read React context: language, direction, `t` and the font family all
 * arrive as props (see downloadReportPdf). This is the Pro deliverable a
 * teacher hands a parent or a head of department — it carries the app's
 * neo-brutalist identity (navy band, hard offset shadows, lime accents) in a
 * print-safe form: white paper, black ink, accents only as fills.
 */

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { StudentRecommendation } from '@/lib/supabase/analyticsTypes';
import {
  RECOMMENDATION_LABEL_KEY,
  ISSUE_LABEL_KEY,
  formatPracticeMinutes,
  formatReportDate,
  percentOf,
  type AttentionIssue,
  type ReportT,
} from './reportLabels';

// =============================================
// TYPES
// =============================================

export interface StudentReportPDFData {
  type: 'student';
  studentName: string;
  classroomName: string;
  generatedAt: Date;
  metrics: {
    wordsLearned: number;
    totalWords: number;
    accuracy: number;
    practiceTimeMinutes: number;
    currentStreak: number;
    longestStreak: number;
    sessionsCompleted: number;
    averageScore: number;
    masteryLevel: string;
  };
  wordMastery: Array<{ word: string; mastered: boolean; accuracy: number; attempts: number }>;
  recommendations?: StudentRecommendation[];
}

export interface ClassReportPDFData {
  type: 'class';
  classroomName: string;
  teacherName: string;
  generatedAt: Date;
  metrics: {
    totalStudents: number;
    activeStudents: number;
    classAverageAccuracy: number;
    classAverageWordsLearned: number;
    completionRate: number;
    participationRate: number;
  };
  topPerformers: Array<{ studentName: string; accuracy: number; wordsLearned: number }>;
  studentsNeedingAttention?: Array<{ studentName: string; accuracy: number; issue: AttentionIssue }>;
  studentRankings: Array<{ rank: number; studentName: string; score: number; accuracy: number; wordsLearned: number }>;
}

export type ReportPDFData = StudentReportPDFData | ClassReportPDFData;

interface ProgressReportPDFProps {
  data: ReportPDFData;
  t: ReportT;
  language: string;
  dir: 'ltr' | 'rtl';
  /** Registered by registerReportFonts; omitted only in DOM-mocked tests. */
  fontFamily?: string;
}

// =============================================
// STYLES
// =============================================

const INK = '#111111';
const NAVY = '#1a1a2e';
const MUTED = '#55556a';
const RULE = '#dcdce6';
const PAPER_ALT = '#f6f6f9';
const LIME = '#BFFF00';
const CYAN = '#00E5E5';
const PINK = '#FF1493';
const ORANGE = '#FF6B35';
const YELLOW = '#FFE14D';
const TILE_ACCENTS = [LIME, CYAN, PINK, ORANGE];
const PODIUM = [LIME, CYAN, PINK];

function makeStyles(fontFamily: string, rtl: boolean) {
  const row = rtl ? ('row-reverse' as const) : ('row' as const);
  const align = rtl ? ('right' as const) : ('left' as const);
  // Bidi base direction. react-pdf does NOT inherit `direction`, and without it
  // a Hebrew "3 ימים" or a date lays out LTR — so text styles carry it. Measured
  // on 4.3.2: an RTL Text with INTRINSIC width inside a row draws offset from
  // its box, so short single-script labels (pills, brand) skip it and mixed
  // strings sit in a flex-width box.
  const text = { direction: rtl ? ('rtl' as const) : ('ltr' as const) };
  return StyleSheet.create({
    page: { fontFamily, fontSize: 10, color: INK, backgroundColor: '#ffffff', paddingTop: 36, paddingBottom: 64, paddingHorizontal: 36 },
    band: { backgroundColor: NAVY, marginTop: -36, marginHorizontal: -36, paddingHorizontal: 36, paddingTop: 28, paddingBottom: 22, marginBottom: 22 },
    bandTop: { flexDirection: row, justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    brandRow: { flexDirection: row, alignItems: 'center', gap: 8 },
    brand: { fontSize: 10, color: '#c9c9d6' },
    brandMark: { fontSize: 10, fontWeight: 700, color: LIME, letterSpacing: 1.2 },
    proChip: { backgroundColor: LIME, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1.5, borderColor: INK },
    proChipText: { fontSize: 8, fontWeight: 700, color: INK },
    subject: { ...text, fontSize: 26, fontWeight: 700, color: '#ffffff', textAlign: align },
    meta: { ...text, fontSize: 10, color: '#c9c9d6', textAlign: align, marginTop: 6 },
    section: { marginBottom: 18 },
    h2: { ...text, fontSize: 13, fontWeight: 700, color: NAVY, textAlign: align, marginBottom: 8 },
    tiles: { flexDirection: row, gap: 10, marginBottom: 18 },
    tileWrap: { flex: 1, position: 'relative', paddingBottom: 3, [rtl ? 'paddingLeft' : 'paddingRight']: 3 },
    tileShadow: { position: 'absolute', top: 3, bottom: 0, [rtl ? 'left' : 'right']: 0, [rtl ? 'right' : 'left']: 3, backgroundColor: INK },
    tile: { borderWidth: 1.5, borderColor: INK, backgroundColor: '#ffffff' },
    tileAccent: { height: 5, borderBottomWidth: 1.5, borderBottomColor: INK },
    tileBody: { paddingVertical: 8, paddingHorizontal: 9 },
    tileLabel: { ...text, fontSize: 8, color: MUTED, textAlign: align, marginBottom: 3 },
    tileValue: { ...text, fontSize: 17, fontWeight: 700, textAlign: align },
    progressHead: { flexDirection: row, justifyContent: 'space-between', marginBottom: 5 },
    track: { height: 12, borderWidth: 1.5, borderColor: INK, backgroundColor: PAPER_ALT, flexDirection: row },
    fill: { height: '100%', backgroundColor: LIME },
    inlineStats: { flexDirection: row, gap: 18, marginTop: 8 },
    inlineStat: { ...text, fontSize: 9, color: MUTED, textAlign: align },
    table: { borderWidth: 1.5, borderColor: INK },
    thead: { flexDirection: row, backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 8 },
    th: { ...text, color: '#ffffff', fontSize: 8.5, fontWeight: 700, textAlign: align },
    tr: { flexDirection: row, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 0.75, borderTopColor: RULE },
    trAlt: { backgroundColor: PAPER_ALT },
    td: { ...text, fontSize: 9.5, textAlign: align },
    tdStrong: { ...text, fontSize: 9.5, fontWeight: 700, textAlign: align },
    barCell: { flexDirection: row, alignItems: 'center', gap: 6 },
    miniTrack: { width: 60, height: 6, backgroundColor: RULE, flexDirection: row },
    pill: { paddingVertical: 2, paddingHorizontal: 6, borderWidth: 1, borderColor: INK },
    pillText: { fontSize: 7.5, fontWeight: 700, color: INK },
    cellStart: { alignItems: rtl ? 'flex-end' : 'flex-start' },
    podium: { flexDirection: row, gap: 10 },
    podiumCard: { flex: 1, borderWidth: 1.5, borderColor: INK, padding: 9, flexDirection: row, alignItems: 'center', gap: 8 },
    podiumRank: { width: 22, height: 22, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
    podiumRankText: { fontSize: 11, fontWeight: 700 },
    podiumName: { ...text, fontSize: 10.5, fontWeight: 700, textAlign: align },
    podiumStat: { ...text, fontSize: 8.5, color: MUTED, textAlign: align, marginTop: 2 },
    listRow: { flexDirection: row, alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: RULE },
    bullet: { width: 6, height: 6, backgroundColor: LIME, borderWidth: 1, borderColor: INK },
    grow: { flex: 1 },
    footer: { position: 'absolute', bottom: 26, left: 36, right: 36, flexDirection: row, justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: INK, paddingTop: 8 },
    footerText: { ...text, fontSize: 8, color: MUTED },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// =============================================
// PRIMITIVES
// =============================================

function Band({ s, t, title, subject, meta }: { s: Styles; t: ReportT; title: string; subject: string; meta: string }) {
  return (
    <View style={s.band}>
      <View style={s.bandTop}>
        <View style={s.brandRow}>
          <Text style={s.brandMark}>LEXICLASH</Text>
          <Text style={s.brand}>{title}</Text>
        </View>
        <View style={s.proChip}>
          <Text style={s.proChipText}>{t('teacher.plan.pro')}</Text>
        </View>
      </View>
      <Text style={s.subject}>{subject}</Text>
      <Text style={s.meta}>{meta}</Text>
    </View>
  );
}

function Tiles({ s, items }: { s: Styles; items: Array<{ label: string; value: string | number }> }) {
  return (
    <View style={s.tiles} wrap={false}>
      {items.map((item, i) => (
        <View key={item.label} style={s.tileWrap}>
          <View style={s.tileShadow} />
          <View style={s.tile}>
            <View style={[s.tileAccent, { backgroundColor: TILE_ACCENTS[i % TILE_ACCENTS.length] }]} />
            <View style={s.tileBody}>
              <Text style={s.tileLabel}>{item.label}</Text>
              <Text style={s.tileValue}>{item.value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function MiniBar({ s, pct, color = NAVY }: { s: Styles; pct: number; color?: string }) {
  return (
    <View style={s.miniTrack}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

function Footer({ s, t, language, generatedAt }: { s: Styles; t: ReportT; language: string; generatedAt: Date }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{t('teacher.reports.generatedOn', { date: formatReportDate(generatedAt, language) })}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => t('teacher.reports.pageOf', { page: pageNumber, total: totalPages })} />
    </View>
  );
}

// =============================================
// STUDENT REPORT
// =============================================

function StudentReport({ data, t, language, s }: { data: StudentReportPDFData; t: ReportT; language: string; s: Styles }) {
  const { metrics } = data;
  const masteredPct = percentOf(metrics.wordsLearned, metrics.totalWords);
  const col = { word: { width: '34%' }, status: { width: '22%' }, acc: { width: '30%' }, att: { width: '14%' } };

  return (
    <Page size="A4" style={s.page}>
      <Band
        s={s}
        t={t}
        title={t('teacher.reports.studentReport')}
        subject={data.studentName}
        meta={`${data.classroomName} · ${formatReportDate(data.generatedAt, language)}`}
      />

      <Tiles
        s={s}
        items={[
          { label: t('teacher.reports.metrics.wordsLearned'), value: `${metrics.wordsLearned} / ${metrics.totalWords}` },
          { label: t('teacher.reports.metrics.accuracy'), value: `${metrics.accuracy}%` },
          { label: t('teacher.reports.metrics.practiceTime'), value: formatPracticeMinutes(t, metrics.practiceTimeMinutes) },
          { label: t('teacher.reports.metrics.currentStreak'), value: t('teacher.reports.streakDays', { count: metrics.currentStreak }) },
        ]}
      />

      <View style={s.section} wrap={false}>
        <View style={s.progressHead}>
          <Text style={s.h2}>{t('teacher.reports.sections.wordMastery')}</Text>
          <Text style={s.tdStrong}>{t('teacher.reports.masteredShare', { percent: masteredPct })}</Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${masteredPct}%` }]} />
        </View>
        <View style={s.inlineStats}>
          {[
            `${t('teacher.reports.metrics.sessionsCompleted')}: ${metrics.sessionsCompleted}`,
            `${t('teacher.reports.metrics.averageScore')}: ${metrics.averageScore}`,
            `${t('teacher.reports.metrics.longestStreak')}: ${t('teacher.reports.streakDays', { count: metrics.longestStreak })}`,
          ].map((line) => (
            <View key={line} style={s.grow}>
              <Text style={s.inlineStat}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      {data.wordMastery.length > 0 && (
        <View style={[s.section, s.table]}>
          <View style={s.thead} fixed>
            <Text style={[s.th, col.word]}>{t('teacher.reports.columns.word')}</Text>
            <Text style={[s.th, col.status]}>{t('teacher.reports.columns.status')}</Text>
            <Text style={[s.th, col.acc]}>{t('teacher.reports.columns.accuracy')}</Text>
            <Text style={[s.th, col.att]}>{t('teacher.reports.columns.attempts')}</Text>
          </View>
          {data.wordMastery.map((w, i) => (
            <View key={w.word} style={i % 2 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
              <Text style={[s.tdStrong, col.word]}>{w.word}</Text>
              <View style={[col.status, s.cellStart]}>
                <View style={[s.pill, { backgroundColor: w.mastered ? LIME : YELLOW }]}>
                  <Text style={s.pillText}>
                    {w.mastered ? t('teacher.reports.mastery.mastered') : t('teacher.reports.mastery.practicing')}
                  </Text>
                </View>
              </View>
              <View style={[s.barCell, col.acc]}>
                <MiniBar s={s} pct={w.accuracy} />
                <Text style={s.td}>{w.accuracy}%</Text>
              </View>
              <Text style={[s.td, col.att]}>{w.attempts}</Text>
            </View>
          ))}
        </View>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{t('teacher.reports.sections.recommendations')}</Text>
          {data.recommendations.map((code) => (
            <View key={code} style={s.listRow}>
              <View style={s.bullet} />
              <Text style={[s.td, s.grow]}>{t(RECOMMENDATION_LABEL_KEY[code])}</Text>
            </View>
          ))}
        </View>
      )}

      <Footer s={s} t={t} language={language} generatedAt={data.generatedAt} />
    </Page>
  );
}

// =============================================
// CLASS REPORT
// =============================================

function ClassReport({ data, t, language, s }: { data: ClassReportPDFData; t: ReportT; language: string; s: Styles }) {
  const { metrics } = data;
  const col = { rank: { width: '10%' }, name: { width: '34%' }, score: { width: '14%' }, acc: { width: '28%' }, words: { width: '14%' } };
  const attention = data.studentsNeedingAttention ?? [];

  return (
    <Page size="A4" style={s.page}>
      <Band
        s={s}
        t={t}
        title={t('teacher.reports.classReport')}
        subject={data.classroomName}
        meta={`${t('teacher.reports.teacherLine', { name: data.teacherName })} · ${formatReportDate(data.generatedAt, language)}`}
      />

      <Tiles
        s={s}
        items={[
          { label: t('teacher.reports.metrics.totalStudents'), value: metrics.totalStudents },
          { label: t('teacher.reports.metrics.activeStudents'), value: metrics.activeStudents },
          { label: t('teacher.reports.metrics.classAverageAccuracy'), value: `${metrics.classAverageAccuracy}%` },
          { label: t('teacher.reports.metrics.completionRate'), value: `${metrics.completionRate}%` },
        ]}
      />

      {data.topPerformers.length > 0 && (
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{t('teacher.reports.sections.topPerformers')}</Text>
          <View style={s.podium}>
            {data.topPerformers.slice(0, 3).map((p, i) => (
              <View key={`${p.studentName}-${i}`} style={s.podiumCard}>
                <View style={[s.podiumRank, { backgroundColor: PODIUM[i] }]}>
                  <Text style={s.podiumRankText}>{String(i + 1)}</Text>
                </View>
                <View style={s.grow}>
                  <Text style={s.podiumName}>{p.studentName}</Text>
                  <Text style={s.podiumStat}>
                    {`${p.accuracy}% · ${t('education.classroomGame.words', { count: p.wordsLearned })}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {attention.length > 0 && (
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{t('teacher.reports.sections.needsAttention')}</Text>
          {attention.map((a, i) => (
            <View key={`${a.studentName}-${i}`} style={s.listRow}>
              <Text style={[s.tdStrong, s.grow]}>{a.studentName}</Text>
              <Text style={s.td}>{a.accuracy}%</Text>
              <View style={[s.pill, { backgroundColor: PINK }]}>
                <Text style={s.pillText}>{t(ISSUE_LABEL_KEY[a.issue])}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {data.studentRankings.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>{t('teacher.reports.sections.studentRankings')}</Text>
          <View style={s.table}>
            <View style={s.thead} fixed>
              <Text style={[s.th, col.rank]}>{t('teacher.reports.columns.rank')}</Text>
              <Text style={[s.th, col.name]}>{t('teacher.reports.columns.student')}</Text>
              <Text style={[s.th, col.score]}>{t('teacher.reports.columns.score')}</Text>
              <Text style={[s.th, col.acc]}>{t('teacher.reports.columns.accuracy')}</Text>
              <Text style={[s.th, col.words]}>{t('teacher.reports.columns.words')}</Text>
            </View>
            {data.studentRankings.map((r, i) => (
              <View key={`${r.rank}-${r.studentName}`} style={i % 2 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
                <Text style={[s.tdStrong, col.rank]}>{r.rank}</Text>
                <Text style={[s.tdStrong, col.name]}>{r.studentName}</Text>
                <Text style={[s.td, col.score]}>{r.score}</Text>
                <View style={[s.barCell, col.acc]}>
                  <MiniBar s={s} pct={r.accuracy} />
                  <Text style={s.td}>{r.accuracy}%</Text>
                </View>
                <Text style={[s.td, col.words]}>{r.wordsLearned}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Footer s={s} t={t} language={language} generatedAt={data.generatedAt} />
    </Page>
  );
}

// =============================================
// DOCUMENT
// =============================================

export function ProgressReportPDF({ data, t, language, dir, fontFamily = 'Helvetica' }: ProgressReportPDFProps) {
  const s = makeStyles(fontFamily, dir === 'rtl');
  const title = data.type === 'student' ? data.studentName : data.classroomName;
  return (
    <Document title={title} author="LexiClash" creator="LexiClash" language={language}>
      {data.type === 'student' ? (
        <StudentReport data={data} t={t} language={language} s={s} />
      ) : (
        <ClassReport data={data} t={t} language={language} s={s} />
      )}
    </Document>
  );
}

export default ProgressReportPDF;
