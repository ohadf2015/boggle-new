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
  { num: '10K+', label: 'palabras ES', color: 'text-neo-lime' },
  { num: '0€', label: 'precio total', color: 'text-neo-pink' },
  { num: '2-50', label: 'jugadores', color: 'text-neo-cyan' },
  { num: '5', label: 'idiomas', color: 'text-neo-purple-light' },
];

export const FEATURES = [
  { icon: '⚡', text: 'Batallas en tiempo real con puntos al instante', accent: 'border-neo-pink shadow-hard-pink' },
  { icon: '🔗', text: 'Crea sala e invita por enlace — sin registro', accent: 'border-neo-cyan shadow-hard-cyan' },
  { icon: '📚', text: 'Más de 10.000 palabras en español', accent: 'border-neo-lime shadow-hard-lime' },
  { icon: '🎮', text: 'Modos múltiples: Boggle, Cazador, Explosión', accent: 'border-neo-purple shadow-hard' },
  { icon: '📅', text: 'Desafíos diarios con clasificaciones', accent: 'border-neo-pink shadow-hard-pink' },
  { icon: '👹', text: 'Batallas de jefes con giros únicos', accent: 'border-neo-cyan shadow-hard-cyan' },
  { icon: '💸', text: '100 % gratis, sin descargas', accent: 'border-neo-lime shadow-hard-lime' },
  { icon: '🌍', text: 'Juega en 5 idiomas (EN, HE, SV, JA, ES)', accent: 'border-neo-purple shadow-hard' },
];

export const STEPS = [
  {
    n: '01',
    title: 'Crea tu sala',
    body: 'Un clic en "Crear sala" y listo. Sin formularios, sin email, sin esperas.',
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
    { label: 'Sin registro ni descarga', cells: [true, false, false] },
    { label: 'Multijugador en tiempo real', cells: ['2-50', 'Por turnos', 'Por turnos'] },
    { label: 'Diccionario español 10.000+', cells: [true, true, true] },
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
    q: '¿Cómo juego una alternativa a Scrabble online en español multijugador gratis?',
    a: 'En LexiClash haces clic en "Crear sala" en la página multijugador, compartes el enlace con tus amigos y todos compiten en tiempo real al estilo Scrabble. LexiClash es una alternativa independiente al Scrabble — sin registro, sin descargas, 100% gratis. Funciona en móvil y ordenador.',
  },
  {
    q: '¿LexiClash es como Scrabble o Apalabrados pero online?',
    a: 'Sí. LexiClash combina la profundidad estratégica de Scrabble, la velocidad de Boggle y el formato social de Apalabrados, todo en tiempo real con más de 10,000 palabras en español.',
  },
  {
    q: '¿Puedo jugar Scrabble online con amigos sin registrarme?',
    a: '¡Sí! Crea una sala, envía el enlace por WhatsApp, Discord o cualquier app, y tus amigos se unen al instante. Sin cuenta, sin email, sin descargas.',
  },
  {
    q: '¿Cuántas palabras en español tiene el diccionario?',
    a: 'Más de 10,000 palabras en español validadas, actualizadas continuamente. Reconoce variantes de España y Latinoamérica.',
  },
  {
    q: '¿Qué modos de juego multijugador hay?',
    a: 'Salas multijugador en tiempo real, desafíos diarios, cazadores de palabras, modo explosión, batallas de jefes y más. Cada modo tiene reglas y puntuación únicas.',
  },
  {
    q: '¿Dónde puedo jugar Scrabble en línea gratis en español?',
    a: 'En LexiClash. Es una alternativa a Scrabble en línea, gratis y en español, jugable directamente en el navegador sin descargas ni registro. Más de 10,000 palabras en español validadas, salas multijugador en tiempo real (2-50 jugadores) y desafíos diarios con clasificación global. Para jugar Scrabble gratis en línea con amigos, simplemente comparte el enlace de tu sala.',
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
    a: 'LexiClash es la alternativa a Scrabble online en español más completa de 2026: gratis, sin descargas, multijugador en tiempo real, 8 modos de juego y diccionario español de 10,000+ palabras. A diferencia de las apps oficiales, no hay anuncios entre rondas, no hay bots disfrazados de jugadores reales y nunca se paga por ganar.',
  },
];
