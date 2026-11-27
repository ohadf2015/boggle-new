import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EDU_SKY_LAYOUTS,
  classLiterals,
  listCodemodFiles,
  listDarkRenderedFiles,
  listSharedFiles,
  transformSource,
} from '../../../scripts/edu-sky-codemod.mjs';

const REPO = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

describe('classroom sky skin', () => {
  const files: string[] = listCodemodFiles(REPO);
  const shared = new Set<string>(listSharedFiles(REPO));

  it('scans the whole classroom file set (guard against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(800);
  });

  it('leaves no dark-only colour class the sky codemod would still rewrite', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      const src = read(rel);
      const out = transformSource(src, rel, { shared: shared.has(rel) });
      if (out === src) continue;
      const before = src.split('\n');
      out.split('\n').forEach((line, i) => {
        if (line !== before[i]) offenders.push(`${rel}:${i + 1}: ${before[i].trim()}`);
      });
    }
    expect(
      offenders,
      `Run \`node scripts/edu-sky-codemod.mjs\` or use edu-* tokens:\n${offenders.slice(0, 40).join('\n')}`,
    ).toEqual([]);
  });

  it('never puts white ink on a lime, cyan, yellow or pink fill', () => {
    const fill = /(^|\s)bg-neo-(lime|cyan|yellow|pink)(\s|$)/;
    const whiteInk = /(^|\s)text-(white|neo-white|neo-cream)(\/\d+)?(\s|$)/;
    const offenders: string[] = [];
    for (const rel of files) {
      for (const lit of classLiterals(read(rel), rel)) {
        // A shared file keeps master's white ink for the dark page; its edu-sky: twin inks the sky.
        if (fill.test(lit) && whiteInk.test(lit) && !/(^|\s)edu-sky:text-/.test(lit)) offenders.push(`${rel}: ${lit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('marks every in-scope route root and gives it a light viewport', () => {
    expect(EDU_SKY_LAYOUTS.length).toBeGreaterThan(8);
    for (const rel of EDU_SKY_LAYOUTS) {
      const src = read(rel);
      expect(src, `${rel} must render <EduSkyScope>`).toMatch(/<EduSkyScope>/);
      expect(src, `${rel} must export the sky viewport`).toMatch(
        /export const viewport = EDU_SKY_VIEWPORT/,
      );
    }
  });

  it('keeps the academy on the sky theme now its map art is drawn for daylight', () => {
    for (const rel of ['components/student/academy/AcademyHubView.tsx', 'components/student/pages/AcademyPageFrame.tsx']) {
      expect(read(rel), rel).not.toMatch(/data-edu-theme="dark"/);
    }
  });

  it('never marks a wrapper shared with dark pages', () => {
    for (const rel of [
      'app/layout.tsx',
      'app/[locale]/layout.tsx',
      'app/[locale]/education/layout.tsx',
      'components/teacher/TeacherEducationShell.tsx',
    ]) {
      expect(read(rel), rel).not.toMatch(/EduSkyScope|data-edu-theme/);
    }
  });

  it('reads dark neo pieces only through their edu twins', () => {
    const dark = /import\s*\{[^}]*\b(NEO_DARK_EDGE|NEO_FOCUS|NEO_QUIET_FOCUS|NEO_BLOCK_TONES|NEO_BUTTON)\b[^}]*\}\s*from\s*'@\/components\/ui\/neoStyles'/;
    const offenders = files.filter((rel) => !rel.endsWith('eduNeoStyles.ts') && dark.test(read(rel)));
    expect(offenders, 'import the EDU_* twin from components/education/eduNeoStyles').toEqual([]);
  });

  it('paints the shared portal and form primitives as sky surfaces under the scope', () => {
    for (const rel of [
      'components/ui/dialog.tsx',
      'components/ui/alert-dialog.tsx',
      'components/ui/popover.tsx',
      'components/ui/select.tsx',
      'components/ui/textarea.tsx',
    ]) {
      expect(read(rel), rel).toMatch(/edu-sky:bg-edu-surface edu-sky:text-edu-ink/);
    }
    expect(read('app/globals.css')).toMatch(/@custom-variant edu-sky \(html:has\(\[data-edu-theme='sky'\]\) &\)/);
  });

  it('defaults every edu token to the dark app and flips them only under the sky scope', () => {
    const css = read('app/edu-sky.css');
    // A dark island (academy art, the rays stage) shares the dark defaults, so edu ink stays white there.
    const rootBlock = /:root,\s*\[data-edu-theme='dark'\],\s*\.edu-rays-dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rootBlock).toMatch(/--edu-page:\s*var\(--neo-navy\)/);
    expect(rootBlock).toMatch(/--edu-ink:\s*rgb\(var\(--neo-white\)\)/);
    expect(css).toMatch(/html:has\(\[data-edu-theme='sky'\]\)\s*\{[^}]*--edu-page:\s*#9ed8ff/i);
    expect(css).not.toMatch(/--neo-[a-z-]+\s*:/);
    expect(css).not.toMatch(/!important/);

    const layout = read('app/layout.tsx');
    const globals = layout.indexOf("import './globals.css'");
    const sky = layout.indexOf("import './edu-sky.css'");
    expect(globals).toBeGreaterThanOrEqual(0);
    expect(sky, 'edu-sky.css must load after globals.css').toBeGreaterThan(globals);
  });
});

/**
 * Shared game files stay navy for the main game and carry a classroom branch for the sky page.
 * The ratchet above can't scan them (it would ban the arcade's navy), so each one must keep its
 * classroom signal and the sky classes that branch paints. Deleting a branch fails here.
 */
const HOOK = /useClassroomBoard\(\)/;
const CLASSROOM_BRANCHES: ReadonlyArray<readonly [string, RegExp, readonly string[]]> = [
  ['player/components/PlayerInGameView.tsx', /<ClassroomBoardProvider value=\{classroom\}>/, ['MP_ROUND_CONTAINER_CLASSROOM_CLASS']],
  ['host/components/TvBroadcastView.tsx', /<ClassroomBoardProvider value=\{isClassroom\}>/, ['CLASSROOM_WALL.root', 'CLASSROOM_WALL.leaderboardCard']],
  ['host/components/tv-broadcast/classroomWallSkin.ts', /CLASSROOM_WALL/, ['bg-edu-page text-edu-ink', 'bg-edu-surface text-edu-ink']],
  ['host/components/tv-broadcast/TvLeaderboard.tsx', HOOK, ['text-edu-ink', 'border-edu-line']],
  ['host/components/tv-broadcast/TvPlayerCard.tsx', HOOK, ['bg-edu-surface shadow-hard-sm', 'text-edu-ink']],
  ['host/components/tv-broadcast/TvActivityPanel.tsx', HOOK, ['bg-edu-surface text-edu-ink', 'text-edu-cyan-ink']],
  ['host/components/tv-broadcast/TvGapIndicator.tsx', HOOK, ['text-edu-ink/70']],
  ['host/components/tv-broadcast/TvBattleBar.tsx', /classroom/, ['bg-edu-page']],
  ['host/components/tv-broadcast/TvJoinBar.tsx', /classroom/, ['bg-edu-page']],
  ['components/multiplayer/round/roundContainer.ts', /MP_ROUND_CONTAINER_CLASSROOM_CLASS/, ['bg-edu-page']],
  ['components/multiplayer/round/MpRoundLayout.tsx', HOOK, ['bg-edu-page', 'bg-edu-surface']],
  ['components/multiplayer/round/MpRoundMute.tsx', HOOK, ['bg-edu-surface text-edu-ink']],
  ['components/multiplayer/round/MpComboMeter.tsx', HOOK, ['bg-edu-surface']],
  ['components/multiplayer/round/MpRecentWords.tsx', HOOK, ['bg-edu-surface', 'text-edu-ink']],
  ['components/multiplayer/shell/MpBackButton.tsx', HOOK, ['bg-edu-surface text-edu-ink']],
  ['components/multiplayer/shell/MpRankChip.tsx', HOOK, ['bg-edu-surface', 'text-edu-ink']],
  ['components/multiplayer/shell/MpRosterStrip.tsx', HOOK, ['bg-edu-surface', 'text-edu-ink']],
  ['components/multiplayer/WheelRushView.tsx', HOOK, ['bg-edu-page', 'bg-edu-surface']],
  ['components/multiplayer/WheelRushHeader.tsx', HOOK, ['HUD_EXIT_BUTTON_CLASSROOM', 'bg-edu-surface']],
  ['components/multiplayer/WheelRushPieces.tsx', HOOK, ['bg-edu-surface', 'text-edu-ink']],
  ['components/multiplayer/crossword/CrosswordVersus.tsx', HOOK, ['bg-edu-page', 'bg-edu-surface']],
  ['components/multiplayer/wordcraft/WordcraftLiveView.tsx', HOOK, ['bg-edu-page', 'bg-edu-surface']],
  ['components/wordTower/WordTowerVersus.tsx', HOOK, ['bg-edu-page', 'bg-edu-surface']],
  ['components/wordTower/WordTowerVersusRail.tsx', HOOK, ['bg-edu-surface text-edu-ink']],
  ['components/game/hud/GameHud.tsx', HOOK, ['bg-edu-surface text-edu-ink']],
  ['components/game/hud/actionBar.ts', /ACTION_ROUND_CLASSROOM/, ['bg-edu-surface text-edu-ink']],
  ['components/daily/wheel/WheelActionBar.tsx', HOOK, ['ACTION_ROUND_CLASSROOM', '{ classroom }']],
  ['components/daily/WordWheelParts.tsx', HOOK, ['bg-edu-tile']],
  ['components/game/QuickReactions.tsx', HOOK, ['bg-edu-surface']],
  ['components/ExitRoomButton.tsx', HOOK, ['HUD_EXIT_BUTTON_CLASSROOM']],
  ['components/InGameAudioButton.tsx', /edu-sky:/, ['edu-sky:bg-edu-surface', 'edu-sky:text-edu-ink']],
  ['components/blast/legacy/board/BlastBoardTray.tsx', HOOK, ['CLASSROOM_BOARD_FRAME']],
  ['components/blast/legacy/BlastStage.tsx', /blastStageSkin\(useClassroomBoard\(\)\)/, []],
  ['components/blast/legacy/blastStageSkin.ts', /classroom/, ['bg-edu-surface', 'text-edu-ink']],
  ['components/GridComponent.tsx', HOOK, ['CLASSROOM_BOARD_FRAME']],
  ['lib/multiplayer/inGameContainerClass.ts', /classroom/, ['bg-edu-page']],
  ['components/blast/legacy/BlastHUD.tsx', HOOK, ['bg-edu-surface text-edu-ink']],
  ['components/blast/legacy/hud/BlastHudClearMeter.tsx', HOOK, ['text-edu-lime-ink', 'text-edu-ink']],
  ['components/blast/legacy/BlastLoadingGate.tsx', HOOK, ['text-edu-ink text-sm font-bold']],
  ['components/blast/legacy/BlastTileFirstUseCallout.tsx', HOOK, ['bg-edu-surface']],
  ['components/daily/survival/SurvivalClueBoxes.tsx', HOOK, ['bg-edu-surface border-neo-black', 'CLUE_UNKNOWN_CLASSROOM']],
  ['components/daily/survival/SurvivalClueLegend.tsx', HOOK, ['text-edu-ink', 'text-edu-cyan-ink']],
  ['components/wordhunt/WordHuntGameLayout.tsx', /wordHuntLayoutSkin\(useClassroomBoard\(\)\)/, []],
  ['components/wordhunt/wordHuntLayoutSkin.ts', /classroom/, ['bg-edu-surface', 'text-edu-ink']],
  ['components/keyboard/KeyboardInlineHint.tsx', HOOK, ["classroom ? 'bg-edu-surface' : 'bg-neo-navy/80'"]],
  ['components/game/WordFormingArea.tsx', HOOK, ['border-edu-line/30 bg-edu-surface']],
  ['host/components/tv-broadcast/TvGameHeader.tsx', /classroom \? \(/, ['TIMER_PLATE']],
  ['host/components/tv-broadcast/TvClassroomJoinCards.tsx', /TvClassroomJoinCards/, []],
  // Only the classroom header slot (inline placement) passes `wrap`.
  ['host/components/tv-broadcast/notifications/MinimalToastLayout.tsx', /if \(wrap\)/, ['bg-edu-paper']],
  // The boss art stays dark, so its title and HP readout keep the dark edu tokens.
  ['components/education/boss/ProjectorBossStage.tsx', /<header data-edu-theme="dark"/, []],
];

describe('classroom branches in shared game files', () => {
  it('covers the live round, projector wall and every gridless mode', () => {
    expect(CLASSROOM_BRANCHES.length).toBeGreaterThanOrEqual(45);
  });

  it.each(CLASSROOM_BRANCHES)('%s keeps its classroom branch', (rel, signal, sky) => {
    const src = read(rel);
    expect(src, `${rel} lost its classroom signal`).toMatch(signal);
    for (const cls of sky) expect(src, `${rel} lost "${cls}"`).toContain(cls);
  });
});


/**
 * A file any dark page imports must render exactly as on master outside the sky scope, so its
 * sky look rides only behind `edu-sky:` (`border-neo-cream/40 edu-sky:border-edu-line`). A bare
 * edu token there changes the dark page: `border-edu-line` drops the master alpha and
 * `bg-edu-surface` swaps navy for navy-light. Classroom-only branches of shared game files are
 * pinned above instead.
 */
const BARE_EDU = /^(?:(?:bg|text|border(?:-[xytrblse])?|ring|ring-offset|divide|outline|shadow|from|via|to|fill|stroke|placeholder|caret|accent|decoration)-edu-[a-z-]+(?:\/\d+)?|edu-(?:card|btn|btn-primary|tile|rays-dark|rays-gold))$/;
const CLASSROOM_ONLY = new Set<string>([
  ...CLASSROOM_BRANCHES.map(([rel]) => rel),
  // Rendered only behind a classroom recap (classroomSummary); dark routes reach it through a results preload.
  'components/education/results/WinnerSpotlight.tsx',
  // Classroom style tables. A dark page reads only PRO_BANNER_CTA from them, pinned below.
  'components/teacher/nb/nbStyles.ts',
  'components/education/eduNeoStyles.ts',
]);

function bareEduTokens(src: string, rel: string): string[] {
  const hits: string[] = [];
  for (const lit of classLiterals(src, rel)) {
    for (const token of lit.split(/\s+/)) {
      const cut = token.lastIndexOf(':');
      const prefix = token.slice(0, cut + 1);
      const base = token.slice(cut + 1).replace(/^!|!$/g, '');
      if (!prefix.split(':').includes('edu-sky') && BARE_EDU.test(base)) hits.push(token);
    }
  }
  return hits;
}

describe('files a dark page imports', () => {
  it('give the SEO pages the Pro CTA without a bare edu token', async () => {
    const { PRO_BANNER_CTA } = await import('@/components/teacher/pro/ProBanner');
    expect(bareEduTokens(`const c = '${PRO_BANNER_CTA}';`, 'cta.ts')).toEqual([]);
  });

  const reachable: string[] = listDarkRenderedFiles(REPO);

  it('walks the real import graph (guard against a vacuous pass)', () => {
    expect(reachable.length).toBeGreaterThan(1000);
    expect(reachable).toContain('components/education/HomeEducationCard.tsx');
    expect(reachable).toContain('components/landing/education/EducationKitRelated.tsx');
    expect(reachable).toContain('components/teacher/pro/ProBanner.tsx');
    expect(reachable).toContain('host/components/tv-broadcast/notifications/MinimalToastLayout.tsx');
    expect(reachable).not.toContain('app/[locale]/teacher/layout.tsx');
    // Only /multiplayer imports it, and a classroom room there is always sky.
    expect(reachable).not.toContain('components/education/projector/ProjectorLobby.tsx');
  });

  it('paint the sky only behind edu-sky:, keeping every master alpha and navy', () => {
    const offenders: string[] = [];
    for (const rel of reachable) {
      if (CLASSROOM_ONLY.has(rel)) continue;
      const hits = bareEduTokens(read(rel), rel);
      if (hits.length) offenders.push(`${rel}: ${[...new Set(hits)].join(' ')}`);
    }
    expect(
      offenders,
      `Run \`node scripts/edu-sky-codemod.mjs\` (it twins shared files) or write master-class edu-sky:twin pairs:\n${offenders.slice(0, 60).join('\n')}`,
    ).toEqual([]);
  });
});
