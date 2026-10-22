import { dictionaryFloor } from '@/lib/seo/dictionaryStats';

/** Measured Spanish validation-Set floor. Never type a dict size by hand. */
export const ES_DICT_FLOOR = dictionaryFloor('es', 'es');

export type Tile = { ch: string; color: string; rotate: string };

export const HERO_TILES: Tile[] = [
  { ch: 'P', color: 'bg-neo-pink text-neo-navy', rotate: '-rotate-6' },
  { ch: 'A', color: 'bg-neo-cyan text-neo-navy', rotate: 'rotate-3' },
  { ch: 'L', color: 'bg-neo-lime text-neo-navy', rotate: '-rotate-2' },
  { ch: 'A', color: 'bg-neo-purple text-neo-white', rotate: 'rotate-6' },
  { ch: 'B', color: 'bg-neo-yellow text-neo-navy', rotate: '-rotate-3' },
  { ch: 'R', color: 'bg-neo-pink text-neo-navy', rotate: 'rotate-2' },
  { ch: 'A', color: 'bg-neo-cyan text-neo-navy', rotate: '-rotate-5' },
  { ch: 'S', color: 'bg-neo-lime text-neo-navy', rotate: 'rotate-4' },
];

export const STATS = [
  { num: `${ES_DICT_FLOOR}+`, label: 'palabras ES', color: 'text-neo-lime' },
  { num: '0€', label: 'precio total', color: 'text-neo-pink' },
  { num: '2-50', label: 'jugadores', color: 'text-neo-cyan' },
  { num: '6', label: 'idiomas', color: 'text-neo-purple-light' },
];

export const FEATURES = [
  { icon: '⚡', text: 'Batallas en tiempo real con puntos al instante', accent: 'border-neo-pink shadow-hard-pink' },
  { icon: '🔗', text: 'Crea sala e invita por enlace — sin registrarse', accent: 'border-neo-cyan shadow-hard-cyan' },
  { icon: '📚', text: `Más de ${ES_DICT_FLOOR} palabras en español`, accent: 'border-neo-lime shadow-hard-lime' },
  { icon: '🎮', text: 'Modos múltiples: Boggle, Cazador, Explosión', accent: 'border-neo-purple shadow-hard' },
  { icon: '📅', text: 'Desafíos diarios con clasificaciones', accent: 'border-neo-pink shadow-hard-pink' },
  { icon: '👹', text: 'Batallas de jefes con giros únicos', accent: 'border-neo-cyan shadow-hard-cyan' },
  { icon: '💸', text: '100 % gratis, sin descargas', accent: 'border-neo-lime shadow-hard-lime' },
  { icon: '🌍', text: 'Juega en 6 idiomas (EN, HE, SV, JA, ES, RU)', accent: 'border-neo-purple shadow-hard' },
];

export const STEPS = [
  {
    n: '01',
    title: 'Crea tu sala',
    body: 'Un clic en "Crear sala" y listo. Sin registrarse, sin email, sin esperas.',
    mascot: '/mascot/explorer-nobg.webp',
    bg: 'bg-neo-pink',
    text: 'text-neo-navy',
    rot: '-rotate-1',
  },
  {
    n: '02',
    title: 'Comparte el enlace',
    body: 'Pega el enlace en WhatsApp, Discord o donde quieras. Tus amigos entran al instante.',
    mascot: '/mascot/dance.webp',
    bg: 'bg-neo-cyan',
    text: 'text-neo-navy',
    rot: 'rotate-0',
  },
  {
    n: '03',
    title: '¡A jugar!',
    body: 'Encuentra palabras, suma puntos, gana la partida. Tiempo real puro.',
    mascot: '/mascot/flexing.webp',
    bg: 'bg-neo-lime',
    text: 'text-neo-navy',
    rot: 'rotate-1',
  },
];

export const MODES = [
  {
    name: 'Cazador de Palabras',
    desc: 'Encuentra todas las palabras escondidas en la rejilla antes que los demás.',
    color: 'bg-neo-pink',
    text: 'text-neo-navy',
    icon: '🔍',
    rot: '-rotate-1',
  },
  {
    name: 'Modo Explosión',
    desc: 'Las letras explotan, la rejilla cambia. Caos puro, palabras rápidas.',
    color: 'bg-neo-cyan',
    text: 'text-neo-navy',
    icon: '💥',
    rot: 'rotate-0',
  },
  {
    name: 'Batalla de Jefes',
    desc: 'PvE cooperativo. Tú y tus amigos contra una IA con habilidades raras.',
    color: 'bg-neo-purple',
    text: 'text-neo-white',
    icon: '👑',
    rot: 'rotate-1',
  },
];

export type CompareCell = boolean | string;

export const COMPARISON: {
  columns: [string, string, string];
  rows: { label: string; cells: [CompareCell, CompareCell, CompareCell] }[];
} = {
  columns: ['LexiClash', 'Scrabble (app)', 'Apalabrados'],
  rows: [
    { label: '100 % gratis, sin pagar por ganar', cells: [true, 'Compras', 'Compras'] },
    { label: 'Sin registrarse ni descargar', cells: [true, false, false] },
    { label: 'Multijugador en tiempo real', cells: ['2-50', 'Por turnos', 'Por turnos'] },
    { label: `Diccionario español ${ES_DICT_FLOOR}+`, cells: [true, true, true] },
    { label: 'Modos de juego', cells: ['8 modos', '1', '1'] },
    { label: 'Juega en el navegador', cells: [true, 'Solo app', 'Solo app'] },
    { label: 'Sin anuncios entre rondas', cells: [true, false, false] },
  ],
};

export const FAQ_ACCENTS = [
  'border-neo-pink shadow-hard-pink',
  'border-neo-cyan shadow-hard-cyan',
  'border-neo-lime shadow-hard-lime',
  'border-neo-purple shadow-hard',
  'border-neo-pink shadow-hard-pink',
];

export const FAQS = [
  {
    q: '¿Hay scrabble español online gratis sin registrarse?',
    a: 'Sí. LexiClash es scrabble español online gratis sin registrarse: abres el navegador, pulsas Crear sala y la partida empieza. No pide email ni contraseña. Si no tienes un nombre guardado, escribes un apodo — eso no crea una cuenta. Quien entra por el enlace de WhatsApp tampoco se registra.',
  },
  {
    q: '¿Dónde jugar scrabble online español multijugador gratis?',
    a: 'En LexiClash. Abre el navegador, pulsa Crear sala y comparte el enlace: hasta 50 jugadores en la misma cuadrícula, en tiempo real, sin turnos ni app. A diferencia de Minijuegos o JuegoSpot (solo contra la IA), aquí el multijugador es con amigos de verdad. Diccionario español medido, 100% gratis.',
  },
  {
    q: '¿Cómo puedo jugar al Scrabble online en español, gratis y con varios jugadores?',
    a: 'En LexiClash haces clic en "Crear sala" en la página multijugador, compartes el enlace con tus amigos y todos compiten en tiempo real al estilo Scrabble. LexiClash es una alternativa independiente al Scrabble — sin registro, sin descargas, 100% gratis. Funciona en móvil y ordenador.',
  },
  {
    q: '¿LexiClash es como Scrabble o Apalabrados pero online?',
    a: `Es la misma familia, pero sin la espera. LexiClash combina la profundidad estratégica de Scrabble, la velocidad de Boggle y el formato social de Apalabrados — con la diferencia de que todos juegan a la vez, en tiempo real, con más de ${ES_DICT_FLOOR} palabras en español.`,
  },
  {
    q: '¿Puedo jugar Scrabble online con amigos sin registrarme?',
    a: '¡Sí! Crea una sala, envía el enlace por WhatsApp, Discord o cualquier app, y tus amigos se unen al instante. Sin cuenta, sin email, sin descargas.',
  },
  {
    q: '¿Cuántas palabras en español tiene el diccionario?',
    a: `Más de ${ES_DICT_FLOOR} palabras en español validadas (suelo medido del Set de validación, no un recuento de líneas). Reconoce variantes de España y Latinoamérica.`,
  },
  {
    q: '¿Qué modos de juego multijugador hay?',
    a: 'Salas multijugador en tiempo real, desafíos diarios, cazadores de palabras, modo explosión, batallas de jefes y más. Cada modo tiene reglas y puntuación únicas.',
  },
  {
    q: '¿Dónde puedo jugar Scrabble en línea gratis en español?',
    a: `En LexiClash. Es una alternativa a Scrabble en línea, gratis y en español, jugable directamente en el navegador sin descargas ni registro. Más de ${ES_DICT_FLOOR} palabras en español validadas, salas multijugador en tiempo real (2-50 jugadores) y desafíos diarios con clasificación global. Para jugar Scrabble gratis en línea con amigos, simplemente comparte el enlace de tu sala.`,
  },
  {
    q: '¿Cuántos jugadores pueden jugar en la misma sala?',
    a: 'De 2 a 50 jugadores en la misma sala, todos en tiempo real sobre el mismo tablero. No hay turnos: todos buscan palabras a la vez durante la partida. Funciona igual de bien para un duelo entre dos personas que para una clase entera o una fiesta.',
  },
  {
    q: '¿Necesito descargar una app para jugar?',
    a: 'No. LexiClash se juega directamente en el navegador del móvil, la tablet o el ordenador. No hay que instalar nada, ni en Android ni en iPhone ni en PC. Abre lexiclash.live y ya estás jugando. Si quieres, puedes añadirlo a la pantalla de inicio como aplicación web (PWA).',
  },
  {
    q: '¿Cuál es la mejor alternativa a Scrabble online en español?',
    a: `LexiClash es la alternativa a Scrabble online en español más completa de 2026: gratis, sin descargas, multijugador en tiempo real, 8 modos de juego y diccionario español de más de ${ES_DICT_FLOOR} palabras. A diferencia de las apps oficiales, no hay anuncios entre rondas, no hay bots disfrazados de jugadores reales y nunca se paga por ganar.`,
  },
  {
    q: '¿Cómo se validan las palabras en español?',
    a: `Cada palabra se comprueba contra el diccionario español de LexiClash (más de ${ES_DICT_FLOOR} entradas, con variantes de España y Latinoamérica). Acentos se normalizan; la ñ se conserva. No hay árbitro ni “desafío”: si la palabra está en el diccionario, cuenta al instante para todos los jugadores de la sala.`,
  },
  {
    q: '¿Qué juegos son parecidos a Scrabble online en español?',
    a: 'Apalabrados y Words With Friends son por turnos (esperas horas). El Scrabble oficial es app + registro. Wordle es un puzzle diario en solitario. LexiClash es la partida multijugador en tiempo real: misma cuadrícula, 2–50 jugadores, 2–3 minutos, en el navegador.',
  },
  {
    q: '¿Cuál es el objetivo de una partida multijugador?',
    a: 'Sumar más puntos que el resto de la sala en la misma ronda. Todos ven la misma cuadrícula a la vez: no hay turnos ni atril. Gana quien encadena más palabras válidas antes de que el reloj llegue a cero.',
  },
  {
    q: '¿Hay niveles de dificultad?',
    a: 'Contra amigos, no: el tablero es el mismo para todos. Si juegas solo, elige bots (fácil / medio / difícil). A diferencia de Minijuegos o Locura de Letras, el rival no es una IA de Scrabble 15×15 — son buscadores de palabras en la misma rejilla.',
  },
  {
    q: '¿Cuándo termina la partida?',
    a: 'Cuando se acaba el temporizador de la ronda (unos 180 segundos en Clásico). No hay bolsa de fichas que vaciar ni restar puntos del atril. El marcador se congela y puedes repetir o cambiar de modo.',
  },
  {
    q: '¿Puedo desafiar una palabra colocada por otro jugador?',
    a: 'No hay desafío ni árbitro. Cada palabra se comprueba al instante contra el mismo diccionario español, también si la juega un bot. Si está, cuenta para quien la envió. Si no está, 0 puntos. En Locura de Letras la computadora tampoco se puede desafiar; aquí la regla es la misma para humanos y bots.',
  },
  {
    q: '¿Cómo se reparten las letras?',
    a: 'No se reparten. En el Scrabble de tablero cada quien recibe 7 fichas al azar de una bolsa de 100. En LexiClash no hay bolsa ni atril: la sala comparte una cuadrícula y todos buscan a la vez. Si el tablero no te gusta, la ronda dura unos 180 segundos y la siguiente trae otra rejilla.',
  },
  {
    q: '¿Puedo ver las letras del rival?',
    a: 'No hay atril que esconder ni que espiar. Todo el mundo ve la misma cuadrícula y el marcador en vivo. No ves las palabras que el otro aún no ha enviado. En el Scrabble de club el atril del rival está tapado; aquí no existe ese atril.',
  },
];

/** Classic-mode length scoring (also documented on /es/rules). */
export const LENGTH_SCORES: { letters: string; points: number }[] = [
  { letters: '3', points: 1 },
  { letters: '4', points: 1 },
  { letters: '5', points: 2 },
  { letters: '6', points: 3 },
  { letters: '7', points: 5 },
  { letters: '8+', points: 11 },
];

/**
 * Worked 4×4 Spanish round. Every word is in backend/es_nouns.txt and is
 * a legal adjacent path (including diagonals), same rules as Classic.
 *
 *   C A S A
 *   O R T E
 *   N I L A
 *   D E S A
 */
export const EXAMPLE_GRID: string[][] = [
  ['C', 'A', 'S', 'A'],
  ['O', 'R', 'T', 'E'],
  ['N', 'I', 'L', 'A'],
  ['D', 'E', 'S', 'A'],
];

export const EXAMPLE_WORDS: { word: string; letters: number; points: number; path: string }[] = [
  { word: 'CASA', letters: 4, points: 1, path: 'fila 1' },
  { word: 'CARO', letters: 4, points: 1, path: 'C–A–R–O' },
  { word: 'ARTE', letters: 4, points: 1, path: 'A–R–T–E' },
  { word: 'CARTA', letters: 5, points: 2, path: 'C–A–R–T–A' },
  { word: 'CARTAS', letters: 6, points: 3, path: 'C–A–R–T–A–S' },
  { word: 'TELA', letters: 4, points: 1, path: 'T–E–L–A' },
  { word: 'RATA', letters: 4, points: 1, path: 'R–A–T–A' },
  { word: 'ASA', letters: 3, points: 1, path: 'A–S–A' },
];

export const EXAMPLE_TOTAL_POINTS = EXAMPLE_WORDS.reduce((n, w) => n + w.points, 0);

export const TIPS: { title: string; body: string }[] = [
  { title: 'Empieza por el centro', body: 'Las letras del medio tocan a más vecinas. Una R o una A central abre CASA, CARO y ARTE en la misma ronda.' },
  { title: 'Las de 3 letras pagan el combo', body: 'ASA, ORA, TES: 1 punto cada una, pero encadenadas en 5 segundos suben el multiplicador. No las desprecies.' },
  { title: 'Una letra extra cambia el tramo', body: 'CARTA vale 2; añade la S adyacente y CARTAS vale 3. Revisa siempre si la palabra sigue un paso más.' },
  { title: 'No esperes turno', body: 'En Scrabble online clásico tu rival piensa 2 minutos. Aquí los 8 jugadores buscan a la vez: el reloj es de 180 segundos para todos.' },
];

export const SIMILAR_GAMES: { name: string; vs: string }[] = [
  { name: 'Scrabble (app oficial)', vs: 'Por turnos, registro, tablero 15×15. LexiClash: misma sala, todos a la vez, 2–3 min.' },
  { name: 'Apalabrados', vs: 'Asíncrono con amigos. LexiClash no te deja esperando el próximo movimiento.' },
  { name: 'Wordle / Wordle en español', vs: 'Un puzzle al día, solo. LexiClash tiene desafío diario y además salas de 2–50.' },
  { name: 'Boggle', vs: 'Misma idea de cuadrícula; LexiClash añade puntuación en vivo, 8 modos y 6 idiomas.' },
];

/** FISE-style Spanish Scrabble tile values vs LexiClash (length only). Public bag. */
export const SPANISH_TILES: { tile: string; scrabble: string; lexiclash: string }[] = [
  { tile: 'Ñ', scrabble: '8 pts · 1 ficha', lexiclash: 'Letra normal; no suma extra' },
  { tile: 'CH', scrabble: '5 pts · 1 ficha', lexiclash: 'No es ficha; C y H van aparte' },
  { tile: 'LL', scrabble: '8 pts · 1 ficha', lexiclash: 'No es ficha; L y L van aparte' },
  { tile: 'RR', scrabble: '8 pts · 1 ficha', lexiclash: 'No es ficha; R y R van aparte' },
  { tile: 'Z', scrabble: '10 pts · 1 ficha', lexiclash: 'Letra normal; paga la longitud' },
  { tile: 'Q / J / X', scrabble: '5 / 8 / 8 pts', lexiclash: 'Igual que una A: cuenta la palabra' },
];

/**
 * Public Spanish Scrabble bag (edición castellana fuera de Norteamérica, 100 fichas).
 * Not LexiClash's rack — we do not deal tiles. Counts sum to 100 including 2 blanks.
 */
export const SPANISH_BAG: { tile: string; count: number; points: number }[] = [
  { tile: 'A', count: 12, points: 1 },
  { tile: 'E', count: 12, points: 1 },
  { tile: 'O', count: 9, points: 1 },
  { tile: 'I', count: 6, points: 1 },
  { tile: 'S', count: 6, points: 1 },
  { tile: 'N', count: 5, points: 1 },
  { tile: 'R', count: 5, points: 1 },
  { tile: 'U', count: 5, points: 1 },
  { tile: 'L', count: 4, points: 1 },
  { tile: 'T', count: 4, points: 1 },
  { tile: 'D', count: 5, points: 2 },
  { tile: 'G', count: 2, points: 2 },
  { tile: 'C', count: 4, points: 3 },
  { tile: 'B', count: 2, points: 3 },
  { tile: 'M', count: 2, points: 3 },
  { tile: 'P', count: 2, points: 3 },
  { tile: 'H', count: 2, points: 4 },
  { tile: 'F', count: 1, points: 4 },
  { tile: 'V', count: 1, points: 4 },
  { tile: 'Y', count: 1, points: 4 },
  { tile: 'CH', count: 1, points: 5 },
  { tile: 'Q', count: 1, points: 5 },
  { tile: 'J', count: 1, points: 8 },
  { tile: 'LL', count: 1, points: 8 },
  { tile: 'Ñ', count: 1, points: 8 },
  { tile: 'RR', count: 1, points: 8 },
  { tile: 'X', count: 1, points: 8 },
  { tile: 'Z', count: 1, points: 10 },
  { tile: 'Comodín', count: 2, points: 0 },
];

export const SPANISH_BAG_TOTAL = SPANISH_BAG.reduce((n, row) => n + row.count, 0);

/** Classic 15×15 bonus squares. LexiClash does not use them (simultaneous grid). */
export const BONUS_SQUARES: { name: string; mark: string; effect: string }[] = [
  { name: 'Doble letra', mark: 'DL', effect: 'La ficha sobre esa casilla vale el doble al sumar la palabra.' },
  { name: 'Triple letra', mark: 'TL', effect: 'La ficha vale el triple. La Ñ o la Z aquí cambian la partida.' },
  { name: 'Doble palabra', mark: 'DP', effect: 'Toda la palabra (con sus dobles y triples de letra) se duplica.' },
  { name: 'Triple palabra', mark: 'TP', effect: 'Toda la palabra se triplica. La estrella central de la apertura es doble palabra.' },
];

export const CONTROLS = [
  { device: 'Móvil', how: 'Desliza el dedo por letras adyacentes (también en diagonal).' },
  { device: 'Ordenador', how: 'Clic y arrastra, o escribe la palabra. Ratón o teclado.' },
  { device: 'Tablet / TV', how: 'Táctil en tablet; en fiesta, el teléfono es el mando.' },
];
