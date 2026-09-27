import type { ConnectionsLandingCopy } from './content.types';

/**
 * Spanish landing copy — written natively, not translated. The Spanish pool
 * (53 puzzles, the smallest of the six) splits compounds and set phrases:
 * pasa|tiempo|libre. Samples are real puzzles from
 * lib/connections/puzzles/generated/es.generated.ts.
 */
export const ES_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Palabra Puente — encuentra la palabra que une | LexiClash',
  metaDescription:
    'Juego de palabras gratis online. Dos mitades, una palabra en medio: PASA … LIBRE → TIEMPO. Sin registro y sin descargas, juega en el navegador.',
  metaKeywords:
    'juego de palabras, juegos de palabras gratis, palabras encadenadas, acertijos de palabras, juego de palabras online, pasatiempos de palabras, gimnasia mental palabras',
  ogTitle: 'Palabra Puente — encuentra la palabra que une',
  ogDescription: 'Dos mitades, una palabra en medio. Juego de palabras gratis en el navegador.',
  twitterTitle: 'Palabra Puente — juego de palabras gratis',
  twitterDescription: 'Dos mitades, una palabra en medio. ¿Encuentras el puente?',
  badge: 'GRATIS • SIN REGISTRO',
  h1Pre: 'Dos mitades. Un puente.',
  h1Highlight: 'Encuentra lo que las une.',
  h1Sub: 'Palabra Puente — acertijos con palabras compuestas',
  introP1:
    'El juego muestra dos mitades, una a cada lado. Hay que encontrar la única palabra que encaja en medio de forma que las dos combinaciones suenen naturales en español. PASA … LIBRE? TIEMPO. VIDEO … MESA? JUEGO. Las reglas se aprenden en diez segundos.',
  introP2:
    'Los acertijos salen de palabras compuestas y expresiones fijas: las que usas a diario sin fijarte en cómo están armadas. Una ronda dura medio minuto, ningún anuncio interrumpe la partida y no hay nada que instalar.',
  ctaPrimary: 'Jugar gratis',
  ctaSecondary: 'Cómo se juega ↓',
  demo: {
    label: 'Prueba — toca la casilla del medio',
    puzzle: { word1: 'PASA', word2: 'LIBRE', bridge: 'TIEMPO', difficulty: 'easy' },
    reveal: 'Ver el puente',
    success: '¡Es un puente!',
  },
  samples: {
    heading: 'Tres para probar',
    sub: 'Toca una tarjeta para ver la respuesta',
    revealLabel: 'Toca para revelar',
    difficultyLabels: { easy: 'Fácil', medium: 'Media', hard: 'Difícil' },
    items: [
      { word1: 'VIDEO', word2: 'MESA', bridge: 'JUEGO', difficulty: 'easy' },
      { word1: 'AUTO', word2: 'ATERRIZAJE', bridge: 'PISTA', difficulty: 'medium' },
      { word1: 'BALÓN', word2: 'DURA', bridge: 'MANO', difficulty: 'hard' },
    ],
  },
  why: {
    heading: 'Por qué le viene bien a tu cabeza',
    cards: [
      {
        title: 'Activa el vocabulario dormido',
        body: 'La palabra que «te suena» hay que sacarla en treinta segundos. Ese es justo el paso que la mueve del vocabulario pasivo al activo.',
      },
      {
        title: 'Entrena el pensamiento lateral',
        body: 'El camino obvio casi nunca funciona. El cerebro aprende a repasar sinónimos, compuestos y sentidos figurados a toda velocidad.',
      },
      {
        title: 'Mantiene la memoria semántica',
        body: 'Buscar el puente es recordar y asociar a la vez: la misma habilidad que te rescata cuando tienes la palabra en la punta de la lengua.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: '¿En qué se diferencia?',
    sub: 'Lo hicimos a propósito distinto de otro Wordle más',
    columns: ['Juego', 'Qué haces', 'Duración', 'Qué entrena'],
    rows: [
      {
        name: 'Palabra Puente (este juego)',
        doing: 'Buscas la palabra entre dos mitades',
        length: '30 s por acertijo',
        skill: 'Asociación + vocabulario',
      },
      {
        name: 'Apalabrados',
        doing: 'Colocas palabras en un tablero por puntos',
        length: '10–30 min',
        skill: 'Vocabulario + táctica',
      },
      {
        name: 'Wordle',
        doing: 'Adivinas una palabra de 5 letras en 6 intentos',
        length: '3–5 min',
        skill: 'Lógica de letras',
      },
      {
        name: 'Crucigrama',
        doing: 'Rellenas una cuadrícula con pistas',
        length: '10–60 min',
        skill: 'Cultura general + ortografía',
      },
    ],
  },
  faq: {
    heading: 'Preguntas frecuentes',
    items: [
      {
        q: '¿Qué es Palabra Puente?',
        a: 'Un acertijo de asociación. Ves dos mitades y buscas la palabra que va en medio, de modo que las dos combinaciones sean expresiones reales en español. Ejemplo: CUMPLE … LUZ → AÑOS (cumpleaños, años luz).',
      },
      {
        q: '¿Es lo mismo que Connections del NYT?',
        a: 'No. Allí ordenas 16 palabras en cuatro grupos temáticos. Aquí te damos dos mitades y buscas la que las une. Mecánicas distintas, la misma sensación de «¡ajá!».',
      },
      {
        q: '¿De verdad es gratis?',
        a: 'Sí. Sin registro, sin muro de pago y sin descargas. La cuenta solo hace falta si quieres guardar el progreso y aparecer en las clasificaciones.',
      },
      {
        q: '¿Los anuncios cortan la partida?',
        a: 'No. Nada salta en mitad de un acertijo ni tapa el tablero. Puedes ver un vídeo corto si quieres una pista, pero es opcional.',
      },
      {
        q: '¿Los acertijos están escritos en español o traducidos?',
        a: 'Escritos en español. Las palabras compuestas no se pueden traducir: cortauñas y ferrocarril no tienen equivalente directo en inglés. Por eso cada idioma tiene su propio banco.',
      },
      {
        q: '¿Cómo funcionan las pistas?',
        a: 'Una por acertijo. No revela la respuesta, orienta: por ejemplo «Por donde van coches o aviones» para PISTA.',
      },
      {
        q: '¿Hay un reto diario?',
        a: 'Sí. Cinco puentes al día, iguales para todo el mundo, con clasificación común. Cambia a medianoche UTC.',
      },
      {
        q: '¿Funcionan las tildes?',
        a: 'Sí, y no hace falta escribirlas. «Balón» y «balon» cuentan igual: no gastas intento por una tilde.',
      },
    ],
  },
  footerCta: {
    heading: '¿Listo para buscar puentes?',
    body: 'Gratis. En el navegador. Sin descargas.',
    button: 'Empezar a jugar',
  },
  videoGameName: 'Palabra Puente',
  videoGameDescription:
    'Juego de palabras gratis online en español. Se muestran dos mitades y el jugador debe encontrar la palabra que va en medio para formar dos expresiones reales.',
};
