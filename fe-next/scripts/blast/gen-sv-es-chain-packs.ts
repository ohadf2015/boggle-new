/**
 * Generate curated CHAIN packs for Swedish (sv) and Spanish (es) Blast v2,
 * bringing them to onboarding parity with en/he.
 *
 * The chain *structure* (which theme + board width per level) is language-
 * agnostic, so we mirror the en template's theme order and use a gentler
 * 3→6 length escalation (sv/es onboarding can be softer than en; generated
 * levels 31+ scale difficulty anyway). Each candidate chain is run through the
 * real `verifyChainLevel` solver — only provably-solvable chains are written,
 * so `all-levels-solvable.test.ts` stays green when sv/es join CHAIN_LOCALES.
 *
 * Run:  npx tsx scripts/blast/gen-sv-es-chain-packs.ts
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyChainLevel } from '../../lib/blast/v2/solvability-verifier';
import { getBlastCommonWords } from '../../lib/blast/v2/engine/common-words';
import { LOCALE_CONFIGS } from '../../lib/blast/v2/locale-config';
import { buildChainLevel, type ExtraWordCheck } from '../../lib/blast/v2/engine/chain-builder';
import type { ChainLevelSpec, Locale, ThemeKey } from '../../lib/blast/v2/types';

const PACKS_ROOT = resolve(process.cwd(), 'content/blast/packs');

// Gentle escalation: L1-5 → 3 words, L6-10 → 4, L11-15 → 5, L16-30 → 6.
function chainLenForLevel(levelNumber: number): number {
  if (levelNumber <= 5) return 3;
  if (levelNumber <= 10) return 4;
  if (levelNumber <= 15) return 5;
  return 6;
}

// Enriched, common, tile-valid candidate words per theme (chain-used themes
// only). Words kept ≤7 letters (the locale wordLengthRange max) and short where
// possible so they place solvably on a 5-column board.
const CANDIDATES: Record<'sv' | 'es', Partial<Record<ThemeKey, string[]>>> = {
  sv: {
    onboarding: ['KATT', 'SOL', 'ÄGG', 'BIL', 'HUS'],
    fruits: ['ÄPPLE', 'BANAN', 'DRUVA', 'PÄRON', 'KIWI', 'CITRON', 'MELON', 'BÄR'],
    animals: ['LEJON', 'BJÖRN', 'VARG', 'HÄST', 'HUND', 'RÄV', 'GRIS', 'ANKA', 'ORM', 'KO'],
    food: ['BRÖD', 'RIS', 'SOPPA', 'KAKA', 'OST', 'KÖTT', 'MJÖLK', 'SMÖR', 'SOCKER'],
    colors: ['RÖD', 'BLÅ', 'GRÖN', 'GUL', 'SVART', 'VIT'],
    ocean: ['VÅG', 'FISK', 'SNÄCKA', 'HAJ', 'HAV', 'KORALL', 'SÄL', 'VAL', 'ALG', 'BÅT'],
    space: ['MÅNE', 'SOL', 'PLANET', 'KOMET', 'RYMD', 'RAKET', 'MARS', 'GALAX', 'STJÄRNA'],
    weather: ['REGN', 'SNÖ', 'VIND', 'MOLN', 'ÅSKA', 'DIMMA', 'STORM', 'IS'],
    nature: ['TRÄD', 'LÖV', 'ÄLV', 'STEN', 'BLOMMA', 'BERG', 'SKOG', 'SJÖ', 'GRÄS', 'GREN'],
    joy: ['GLAD', 'SKRATT', 'LEENDE', 'LYCKA', 'KUL', 'KRAM', 'DANS', 'FEST'],
    cozy: ['VARM', 'MJUK', 'MYSIG', 'LUGN', 'SOVA', 'HEM', 'FILT', 'TE'],
    spooky: ['SPÖKE', 'HÄXA', 'MASK', 'NATT', 'MÖRK', 'GAST', 'SPINDEL', 'BEN', 'GRAV'],
    magic: ['MAGI', 'TROLL', 'STAV', 'DRÖM', 'DRAKE', 'TRYLLA', 'ÄLVA', 'FE'],
    home: ['HUS', 'DÖRR', 'STOL', 'BORD', 'SÄNG', 'LAMPA', 'KÖK', 'SOFFA'],
    school: ['BOK', 'PENNA', 'KLASS', 'KRITA', 'REGEL', 'PAPPER', 'SUDD', 'VÄSKA', 'RAST'],
    transport: ['BIL', 'CYKEL', 'PLAN', 'TÅG', 'BÅT', 'BUSS', 'MOPED', 'TAXI'],
    adventure: ['KARTA', 'TÄLT', 'RESA', 'BERG', 'FLOD', 'KOMPASS', 'STIG', 'GROTTA', 'SKOG'],
    mythology: ['DRAKE', 'JÄTTE', 'HJÄLTE', 'GUD', 'ODEN', 'TOR', 'NÄCKEN', 'SAGA'],
    music: ['TRUMMA', 'LÅT', 'GITARR', 'PIANO', 'FLÖJT', 'NOT', 'TON', 'FIOL', 'KÖR'],
    science: ['ATOM', 'CELL', 'ENERGI', 'MAGNET', 'GAS', 'SYRA', 'LASER', 'ROBOT', 'FOSSIL'],
  },
  es: {
    onboarding: ['GATO', 'SOL', 'HUEVO', 'CASA', 'PAN'],
    fruits: ['MANZANA', 'NARANJA', 'UVA', 'PERA', 'KIWI', 'FRESA', 'LIMON', 'MANGO', 'MELON'],
    animals: ['LEON', 'OSO', 'LOBO', 'PERRO', 'PATO', 'RANA', 'TIGRE', 'ZORRO', 'VACA', 'GATO'],
    food: ['PAN', 'ARROZ', 'SOPA', 'PASTEL', 'QUESO', 'CARNE', 'FRUTA', 'LECHE', 'MIEL'],
    colors: ['ROJO', 'AZUL', 'VERDE', 'ROSA', 'GRIS', 'NEGRO'],
    ocean: ['OLA', 'PEZ', 'CONCHA', 'MAR', 'CORAL', 'FOCA', 'ALGA', 'BARCO', 'BALLENA'],
    space: ['LUNA', 'SOL', 'PLANETA', 'COMETA', 'NAVE', 'MARTE', 'CIELO', 'ORBITA', 'GALAXIA'],
    weather: ['LLUVIA', 'NIEVE', 'VIENTO', 'NUBE', 'HIELO', 'RAYO', 'NIEBLA', 'SOL'],
    nature: ['ARBOL', 'HOJA', 'RIO', 'PIEDRA', 'FLOR', 'MONTE', 'BOSQUE', 'LAGO', 'PLANTA', 'RAMA'],
    joy: ['ALEGRE', 'FELIZ', 'RISA', 'AMOR', 'PAZ', 'SONRISA', 'BAILE', 'FIESTA'],
    cozy: ['CALMA', 'SUAVE', 'TIBIO', 'SUENO', 'MANTA', 'HOGAR', 'TAZA', 'LANA'],
    spooky: ['MIEDO', 'BRUJA', 'NOCHE', 'OSCURO', 'ARANA', 'HUESO', 'TUMBA', 'GATO'],
    magic: ['MAGIA', 'HADA', 'GENIO', 'ELFO', 'POCION', 'VARITA', 'MAGO', 'DRAGON'],
    home: ['CASA', 'PUERTA', 'SILLA', 'MESA', 'CAMA', 'LAMPARA', 'COCINA', 'SOFA'],
    school: ['LIBRO', 'CLASE', 'LAPIZ', 'REGLA', 'PAPEL', 'TIZA', 'GOMA', 'MAPA'],
    transport: ['COCHE', 'TREN', 'BARCO', 'MOTO', 'CAMION', 'METRO', 'TAXI', 'AVION'],
    adventure: ['MAPA', 'VIAJE', 'TIENDA', 'RIO', 'MONTANA', 'SENDA', 'CUEVA', 'BOSQUE'],
    mythology: ['DRAGON', 'HEROE', 'DIOSA', 'NINFA', 'OGRO', 'SIRENA', 'TITAN', 'MITO'],
    music: ['TAMBOR', 'CANCION', 'PIANO', 'FLAUTA', 'NOTA', 'RITMO', 'VIOLIN', 'CORO'],
    science: ['ATOMO', 'CELULA', 'ENERGIA', 'IMAN', 'GAS', 'ACIDO', 'LASER', 'ROBOT', 'FOSIL'],
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function buildExtraWordCheck(locale: Locale): Promise<ExtraWordCheck | undefined> {
  try {
    const isCommon = await getBlastCommonWords(locale);
    const minLength = Math.max(4, LOCALE_CONFIGS[locale].wordLengthRange.min);
    return { isCommon, minLength };
  } catch {
    return undefined;
  }
}

type TemplateRow = { levelNumber: number; theme: ThemeKey; columns: number; decoyTiles: number };

async function loadTemplate(): Promise<TemplateRow[]> {
  const raw = await readFile(join(PACKS_ROOT, 'en', 'pack-chain.json'), 'utf8');
  const pack = JSON.parse(raw) as { levels: ChainLevelSpec[] };
  return pack.levels.map((l) => ({
    levelNumber: l.levelNumber,
    theme: l.theme,
    columns: l.columns,
    decoyTiles: l.decoyTiles,
  }));
}

const MAX_SUBSET_TRIES = 40;

function pickSolvableChain(
  locale: 'sv' | 'es',
  row: TemplateRow,
  extraCheck: ExtraWordCheck | undefined,
): string[] | null {
  const want = chainLenForLevel(row.levelNumber);
  const pool = (CANDIDATES[locale][row.theme] ?? []).filter((w) => w.length <= 7);
  if (pool.length < want) return null;
  // Prefer shorter words (place more reliably on a 5-col board), then shuffle
  // within length bands so repeated themes don't produce identical chains.
  for (let attempt = 0; attempt < MAX_SUBSET_TRIES; attempt++) {
    const ordered =
      attempt === 0
        ? [...pool].sort((a, b) => a.length - b.length)
        : shuffle(pool);
    const chain = ordered.slice(0, want);
    const spec: ChainLevelSpec = {
      id: `${locale}-chain-${String(row.levelNumber).padStart(2, '0')}`,
      levelNumber: row.levelNumber,
      theme: row.theme,
      locale,
      columns: row.columns,
      decoyTiles: row.decoyTiles,
      chain,
    };
    const res = verifyChainLevel(spec, extraCheck);
    if (res.ok) return chain;
  }
  return null;
}

async function generatePack(locale: 'sv' | 'es', template: TemplateRow[]): Promise<void> {
  const extraCheck = await buildExtraWordCheck(locale);
  const levels: ChainLevelSpec[] = [];
  const failures: string[] = [];
  for (const row of template) {
    const chain = pickSolvableChain(locale, row, extraCheck);
    if (!chain) {
      failures.push(`L${row.levelNumber} (${row.theme})`);
      continue;
    }
    levels.push({
      id: `${locale}-chain-${String(row.levelNumber).padStart(2, '0')}`,
      levelNumber: row.levelNumber,
      theme: row.theme,
      locale,
      columns: row.columns,
      decoyTiles: row.decoyTiles,
      chain,
    });
  }
  const dir = join(PACKS_ROOT, locale);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'pack-chain.json'),
    JSON.stringify({ locale, levels }, null, 2) + '\n',
    'utf8',
  );
  console.log(`[${locale}] wrote ${levels.length}/${template.length} levels` +
    (failures.length ? `  FAILED: ${failures.join(', ')}` : '  (all solvable)'));
}

async function main() {
  const template = await loadTemplate();
  for (const locale of ['sv', 'es'] as const) {
    await generatePack(locale, template);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
