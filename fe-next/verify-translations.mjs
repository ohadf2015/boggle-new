import { es } from './translations/es.js';

console.log('=== VERIFICATION REPORT ===\n');

const checks = [
  ['Root skills object', () => Object.keys(es.skills || {}).length > 0],
  ['skills.title', () => !!es.skills?.title],
  ['skills.available', () => !!es.skills?.available],
  ['skills.unlocked', () => !!es.skills?.unlocked],
  ['skills.paths.power', () => !!es.skills?.paths?.power],
  ['skills.paths.strategy', () => !!es.skills?.paths?.strategy],
  ['skills.paths.utility', () => !!es.skills?.paths?.utility],
  ['Multiplayer.playersJoined', () => !!es.multiplayer?.playersJoined],
  ['Errors.loadFailed', () => !!es.errors?.loadFailed],
  ['Education.lessonWords', () => !!es.education?.lessonWords],
  ['Education.students', () => !!es.education?.students],
  ['Education.template.boardSize', () => !!es.education?.template?.boardSize],
  ['Education.template.lateJoin', () => !!es.education?.template?.lateJoin],
  ['Teacher.lesson.namePlaceholder', () => !!es.teacher?.lesson?.namePlaceholder],
  ['Teacher.lesson.descriptionPlaceholder', () => !!es.teacher?.lesson?.descriptionPlaceholder],
  ['Adventure.combo.incredible', () => !!es.adventure?.combo?.incredible],
  ['Adventure.combo.unstoppable', () => !!es.adventure?.combo?.unstoppable],
  ['Adventure.chapters.archipelago', () => !!es.adventure?.chapters?.archipelago],
  ['Adventure.chapters.canyon', () => !!es.adventure?.chapters?.canyon],
  ['Adventure.bosses.phases.phase1', () => !!es.adventure?.bosses?.phases?.phase1],
  ['Adventure.bosses.phases.phase2', () => !!es.adventure?.bosses?.phases?.phase2],
  ['Adventure.bosses.telegraph.prepare', () => !!es.adventure?.bosses?.telegraph?.prepare],
  ['Adventure.bosses.telegraph.warning', () => !!es.adventure?.bosses?.telegraph?.warning],
  ['Adventure.bosses.cinematics.victory', () => !!es.adventure?.bosses?.cinematics?.victory],
  ['Adventure.bosses.cinematics.defeated', () => !!es.adventure?.bosses?.cinematics?.defeated],
  ['Adventure.bosses.cinematics.bossApproaches', () => !!es.adventure?.bosses?.cinematics?.bossApproaches],
  ['Adventure.bosses.cinematics.prepareForBattle', () => !!es.adventure?.bosses?.cinematics?.prepareForBattle],
  ['Adventure.cinematics.victory', () => !!es.adventure?.cinematics?.victory],
  ['Adventure.cinematics.timesUp', () => !!es.adventure?.cinematics?.timesUp],
  ['Adventure.cinematics.score', () => !!es.adventure?.cinematics?.score],
  ['Adventure.cinematics.timeRemaining', () => !!es.adventure?.cinematics?.timeRemaining],
  ['Adventure.cinematics.stars', () => !!es.adventure?.cinematics?.stars],
];

const abilities = ['popQuiz', 'redPen', 'detention', 'beeSwarm', 'spellingSting',
  'synonymShuffle', 'verboseCurse', 'etymologyLock', 'islandLock', 'figurativeStorm',
  'assemblyLine', 'constructionZone', 'puzzleScramble', 'anagramCurse', 'puzzleChaos',
  'mirrorFlip', 'palindromePower', 'starScatter', 'novaBurst', 'babelCurse',
  'polyglotLock', 'wordFlame', 'lexiconStorm', 'ultimateWord'];

abilities.forEach(a => {
  checks.push([`Adventure.bosses.abilities.${a}.name`, () => !!es.adventure?.bosses?.abilities?.[a]?.name]);
  checks.push([`Adventure.bosses.abilities.${a}.desc`, () => !!es.adventure?.bosses?.abilities?.[a]?.desc]);
});

let passed = 0;
let failed = 0;

checks.forEach(([key, check]) => {
  const result = check();
  if (result) {
    passed++;
    console.log(`✅ ${key}`);
  } else {
    failed++;
    console.log(`❌ ${key}`);
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}/${checks.length}`);
console.log(`Failed: ${failed}/${checks.length}`);

if (failed === 0) {
  console.log('\n🎉 All checks passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} checks failed`);
  process.exit(1);
}
