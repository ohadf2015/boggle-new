#!/usr/bin/env node
/**
 * One-off builder for the 2026-06-04 English "variety wave" puzzle batch.
 *
 * Each row is [word1, bridge, word2, difficulty, comp1, comp2] where comp1 is
 * the real word1+bridge compound and comp2 the real bridge+word2 compound
 * (with their genuine spelling — closed / open / hyphenated). We SELF-VALIDATE
 * that comp1 == word1+bridge and comp2 == bridge+word2 once separators/case are
 * stripped, so a mis-aligned bridge can never reach the database.
 *
 * Sources: claude-council (gemini-3-flash + grok-4.20), vetted by hand against
 * native-English compound knowledge. Bridges are disjoint from the existing
 * en pool; near-duplicate candidates were dropped.
 *
 * Output: prints a SQL INSERT to stdout. Themes are NOT stored (code-side
 * inferTheme handles dispersal).
 */

/** [word1, bridge, word2, difficulty, comp1, comp2] */
const ROWS = [
  // — gemini set —
  ['BLACK', 'MAIL', 'MAN', 'easy', 'blackmail', 'mailman'],
  ['GIRL', 'SCOUT', 'MASTER', 'easy', 'girl scout', 'scoutmaster'],
  ['SPACE', 'SHIP', 'WRECK', 'easy', 'spaceship', 'shipwreck'],
  ['KICK', 'START', 'UP', 'easy', 'kickstart', 'startup'],
  ['LONG', 'SHOT', 'GUN', 'easy', 'long shot', 'shotgun'],
  ['EAR', 'RING', 'MASTER', 'easy', 'earring', 'ringmaster'],
  ['TREE', 'TOP', 'SHELF', 'easy', 'treetop', 'top shelf'],
  ['JIG', 'SAW', 'DUST', 'easy', 'jigsaw', 'sawdust'],
  ['RAIN', 'DROP', 'ZONE', 'easy', 'raindrop', 'drop zone'],
  ['FINGER', 'NAIL', 'POLISH', 'easy', 'fingernail', 'nail polish'],
  ['LATE', 'NIGHT', 'LIFE', 'easy', 'late night', 'nightlife'],
  ['BATTLE', 'SHIP', 'SHAPE', 'easy', 'battleship', 'shipshape'],
  ['SNOW', 'CAP', 'SIZE', 'medium', 'snowcap', 'capsize'],
  ['BATTLE', 'FIELD', 'TRIP', 'medium', 'battlefield', 'field trip'],
  ['DRAG', 'RACE', 'COURSE', 'medium', 'drag race', 'racecourse'],
  ['TABLE', 'SPOON', 'FED', 'medium', 'tablespoon', 'spoon-fed'],
  ['STAR', 'FISH', 'HOOK', 'medium', 'starfish', 'fishhook'],
  ['KEY', 'HOLE', 'PUNCH', 'medium', 'keyhole', 'hole punch'],
  ['EYE', 'BROW', 'BEAT', 'medium', 'eyebrow', 'browbeat'],
  ['BULL', 'PEN', 'NAME', 'medium', 'bullpen', 'pen name'],
  ['OFF', 'SHORE', 'BIRD', 'medium', 'offshore', 'shorebird'],
  ['LIFE', 'GUARD', 'RAIL', 'easy', 'lifeguard', 'guardrail'],
  ['OVER', 'FLOW', 'CHART', 'medium', 'overflow', 'flowchart'],
  ['SUN', 'FLOWER', 'POWER', 'medium', 'sunflower', 'flower power'],
  ['BLUE', 'PRINT', 'OUT', 'medium', 'blueprint', 'printout'],
  ['SEA', 'LEVEL', 'HEADED', 'medium', 'sea level', 'level-headed'],
  ['COW', 'BELL', 'BOTTOM', 'medium', 'cowbell', 'bell-bottom'],
  ['SAND', 'STORM', 'CLOUD', 'medium', 'sandstorm', 'storm cloud'],
  ['UNDER', 'HAND', 'SOME', 'hard', 'underhand', 'handsome'],
  ['THUNDER', 'BOLT', 'UPRIGHT', 'hard', 'thunderbolt', 'bolt upright'],
  ['COLD', 'SHOULDER', 'BLADE', 'hard', 'cold shoulder', 'shoulder blade'],
  ['WHALE', 'BONE', 'DRY', 'hard', 'whalebone', 'bone-dry'],
  ['HEART', 'BEAT', 'GENERATION', 'hard', 'heartbeat', 'beat generation'],
  ['SMOKE', 'SCREEN', 'PLAY', 'hard', 'smokescreen', 'screenplay'],
  // — grok set (dups & near-dups already removed) —
  ['PINE', 'APPLE', 'SAUCE', 'easy', 'pineapple', 'applesauce'],
  ['BUTTER', 'CUP', 'CAKE', 'easy', 'buttercup', 'cupcake'],
  ['COW', 'BOY', 'FRIEND', 'easy', 'cowboy', 'boyfriend'],
  ['RAIN', 'BOW', 'TIE', 'easy', 'rainbow', 'bow tie'],
  ['GRAND', 'CHILD', 'HOOD', 'easy', 'grandchild', 'childhood'],
  ['SEA', 'HORSE', 'POWER', 'easy', 'seahorse', 'horsepower'],
  ['HORSE', 'SHOE', 'STRING', 'medium', 'horseshoe', 'shoestring'],
  ['SHORT', 'HAND', 'WRITING', 'medium', 'shorthand', 'handwriting'],
  ['TOOTH', 'PICK', 'UP', 'easy', 'toothpick', 'pickup'],
  ['HONEY', 'COMB', 'OVER', 'medium', 'honeycomb', 'comb-over'],
  ['HAND', 'SHAKE', 'DOWN', 'medium', 'handshake', 'shakedown'],
  ['HAND', 'CUFF', 'LINK', 'easy', 'handcuff', 'cufflink'],
  ['BRAIN', 'STORM', 'TROOPER', 'medium', 'brainstorm', 'stormtrooper'],
  ['SUPER', 'MARKET', 'PLACE', 'easy', 'supermarket', 'marketplace'],
  ['POST', 'CARD', 'GAME', 'easy', 'postcard', 'card game'],
  ['MAIL', 'MAN', 'KIND', 'easy', 'mailman', 'mankind'],
  ['NEWS', 'CAST', 'AWAY', 'medium', 'newscast', 'castaway'],
  ['CLOCK', 'WISE', 'CRACK', 'medium', 'clockwise', 'wisecrack'],
  ['POT', 'BELLY', 'LAUGH', 'easy', 'potbelly', 'belly laugh'],
  ['HOLE', 'PUNCH', 'LINE', 'medium', 'hole punch', 'punchline'],
  ['PUNCH', 'BOWL', 'GAME', 'medium', 'punch bowl', 'bowl game'],
  ['CAT', 'FISH', 'BOWL', 'easy', 'catfish', 'fishbowl'],
  ['OVER', 'KILL', 'JOY', 'medium', 'overkill', 'killjoy'],
  ['ROCK', 'STAR', 'FISH', 'easy', 'rock star', 'starfish'],
  ['BED', 'SPREAD', 'SHEET', 'medium', 'bedspread', 'spreadsheet'],
  ['SPREAD', 'SHEET', 'MUSIC', 'medium', 'spreadsheet', 'sheet music'],
  ['THUMB', 'SCREW', 'DRIVER', 'hard', 'thumbscrew', 'screwdriver'],
  ['OUT', 'LOOK', 'ALIKE', 'medium', 'outlook', 'lookalike'],
  ['WAR', 'FARE', 'WELL', 'medium', 'warfare', 'farewell'],
  ['PIT', 'STOP', 'WATCH', 'easy', 'pit stop', 'stopwatch'],
  ['JACK', 'KNIFE', 'EDGE', 'hard', 'jackknife', 'knife-edge'],
];

const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`;

const errors = [];
const seenBridges = new Set();
const seenTriples = new Set();
const values = [];

ROWS.forEach(([w1, bridge, w2, diff, comp1, comp2], i) => {
  const id = `en-v-${String(i + 1).padStart(3, '0')}`;
  // Self-validation: the bridge must align with both compounds.
  if (norm(comp1) !== norm(w1) + norm(bridge)) {
    errors.push(`${id} ${w1}+${bridge}: comp1 "${comp1}" != ${norm(w1) + norm(bridge)}`);
  }
  if (norm(comp2) !== norm(bridge) + norm(w2)) {
    errors.push(`${id} ${bridge}+${w2}: comp2 "${comp2}" != ${norm(bridge) + norm(w2)}`);
  }
  // Non-degeneracy (en-pool.test invariant): word1 != bridge != word2.
  if (norm(w1) === norm(bridge) || norm(bridge) === norm(w2) || norm(w1) === norm(w2)) {
    errors.push(`${id}: degenerate (word1/bridge/word2 collide)`);
  }
  const triple = `${w1}|${bridge}|${w2}`;
  if (seenTriples.has(triple)) errors.push(`${id}: duplicate triple ${triple}`);
  seenTriples.add(triple);
  seenBridges.add(bridge);

  const examples = JSON.stringify([{ w1: comp1, w2: comp2, bridge: bridge.toLowerCase() }]);
  values.push(
    `(${sqlStr(id)}, 'en', ${sqlStr(w1)}, ${sqlStr(bridge)}, ${sqlStr(w2)}, ` +
      `${sqlStr(examples)}::jsonb, ${sqlStr(diff)}, 'council-seed', true)`,
  );
});

if (errors.length) {
  console.error('VALIDATION FAILED:\n' + errors.join('\n'));
  process.exit(1);
}

const sql =
  `INSERT INTO public.connections_puzzles\n` +
  `  (id, locale, word1, bridge, word2, examples, difficulty, source, is_active)\n` +
  `VALUES\n  ${values.join(',\n  ')}\n` +
  `ON CONFLICT (id) DO NOTHING;`;

console.error(`OK: ${ROWS.length} rows, ${seenBridges.size} distinct bridges, 0 validation errors.`);
console.log(sql);
