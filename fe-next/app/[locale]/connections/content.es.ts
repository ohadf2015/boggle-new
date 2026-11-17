import type { ConnectionsLandingCopy } from './content.types';

/**
 * Spanish landing copy — written natively, not translated. The Spanish pool
 * (the smallest of the six) splits compounds and set phrases:
 * pasa|tiempo|libre. Samples are real puzzles from
 * lib/connections/puzzles/generated/es.generated.ts.
 */
export const ES_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Juego de palabras compuestas online gratis | LexiClash',
  metaDescription:
    'Juego de palabras compuestas gratis: encuentra la palabra que falta entre dos. CUMPLE … LUZ → AÑOS (cumpleaños, años luz). Reto diario y sin registro.',
  metaKeywords:
    'juego de palabras compuestas, palabras compuestas juegos online, juego online de palabras compuestas, acertijos de palabras, acertijos de palabras para adultos, acertijos de palabras con respuestas, palabra puente',
  ogTitle: 'Juego de palabras compuestas: ¿qué palabra va en medio?',
  ogDescription:
    'CUMPLE … LUZ. Una palabra forma cumpleaños y años luz. Acertijos gratis en el navegador.',
  twitterTitle: 'Juego de palabras compuestas gratis',
  twitterDescription: 'CUMPLE … LUZ. ¿Qué palabra encaja en los dos lados?',
  badge: 'GRATIS • SIN REGISTRO',
  h1Pre: 'El juego de palabras compuestas',
  h1Highlight: '¿Qué palabra va en medio?',
  h1Sub: 'Palabra Puente: acertijos de palabras para jugar online',
  introP1:
    'Ves dos palabras con un hueco entre ellas y tienes que llenarlo con una sola palabra que funcione con las dos. CUMPLE … LUZ? AÑOS, porque existen cumpleaños y años luz. PARA … NACIENTE? SOL: parasol y sol naciente.',
  introP2:
    'Unas veces el puente es una palabra compuesta y otras una expresión de las de toda la vida, como juego de mesa o día laborable. Hay un reto nuevo cada día, una lista de niveles que se va complicando y una pista para cuando te atascas. Es gratis y no tienes que crear cuenta.',
  ctaPrimary: 'Jugar gratis',
  ctaSecondary: 'Cómo se juega ↓',
  demo: {
    label: 'Prueba: toca la casilla del medio',
    puzzle: { word1: 'PASA', word2: 'LIBRE', bridge: 'TIEMPO', difficulty: 'easy' },
    reveal: 'Ver la respuesta',
    success: '¡Pasatiempo y tiempo libre!',
  },
  howTo: {
    heading: 'Cómo se juega',
    steps: [
      'Lee las dos palabras. La respuesta va entre ellas: detrás de la primera y delante de la segunda.',
      'Escribe la palabra que falta. Tiene que formar algo que exista con cada lado, como medio + día y día laborable.',
      '¿Atascado? La pista te orienta. En los niveles cada fallo cuesta una vida y cada acierto abre el siguiente acertijo.',
    ],
    examplesLabel: 'Tres ejemplos resueltos',
    examples: [
      { word1: 'CUMPLE', bridge: 'AÑOS', word2: 'LUZ', left: 'cumpleaños', right: 'años luz' },
      { word1: 'PARA', bridge: 'SOL', word2: 'NACIENTE', left: 'parasol', right: 'sol naciente' },
      { word1: 'MEDIO', bridge: 'DÍA', word2: 'LABORABLE', left: 'mediodía', right: 'día laborable' },
    ],
  },
  samples: {
    heading: 'Ahora te toca',
    sub: 'Toca una tarjeta para ver la respuesta',
    revealLabel: 'Toca para revelar',
    difficultyLabels: { easy: 'Fácil', medium: 'Media', hard: 'Difícil' },
    items: [
      { word1: 'VIDEO', word2: 'MESA', bridge: 'JUEGO', difficulty: 'easy' },
      { word1: 'SACA', word2: 'DEL JUICIO', bridge: 'MUELAS', difficulty: 'medium' },
      { word1: 'QUITA', word2: 'ETERNAS', bridge: 'NIEVES', difficulty: 'hard' },
    ],
  },
  modes: {
    heading: 'Formas de jugar',
    items: [
      {
        key: 'daily',
        title: 'Reto diario',
        body: 'Cinco acertijos al día, los mismos para todo el mundo, de más fácil a más difícil. Mañana hay otros cinco.',
      },
      {
        key: 'play',
        title: 'Niveles',
        body: 'Más de cien acertijos seguidos. Tienes tres vidas y cada vida perdida vuelve a los 20 minutos.',
      },
      {
        key: 'community',
        title: 'Acertijos de la comunidad',
        body: 'Acertijos que escriben otros jugadores. Vota los que más te gusten o manda el tuyo.',
      },
    ],
  },
  why: {
    heading: 'Por qué engancha',
    cards: [
      {
        title: 'Se juega en un rato',
        body: 'Casi todos los acertijos se resuelven en menos de un minuto. Uno cabe en un café y el reto entero en un trayecto de metro.',
      },
      {
        title: 'Te fijas en cómo están hechas las palabras',
        body: 'Después de unas rondas empiezas a ver palabras compuestas por todas partes: en carteles, en menús, en titulares.',
      },
      {
        title: 'La respuesta parece obvia cuando sale',
        body: 'Los mejores puentes están a la vista. Dar con uno después de un buen rato mirándolo es justo lo divertido.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: '¿En qué se diferencia?',
    sub: 'Otro juego de palabras diario, pero con un acertijo distinto',
    columns: ['Juego', 'Qué haces', 'Duración', 'Qué pone a prueba'],
    rows: [
      {
        name: 'Palabra Puente (este juego)',
        doing: 'Buscas la palabra que encaja entre otras dos',
        length: 'Menos de un minuto por acertijo',
        skill: 'Vocabulario, palabras compuestas',
      },
      {
        name: 'Apalabrados',
        doing: 'Colocas palabras en un tablero por puntos',
        length: '10–30 min',
        skill: 'Vocabulario, táctica',
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
        skill: 'Cultura general, ortografía',
      },
    ],
  },
  faq: {
    heading: 'Preguntas frecuentes',
    items: [
      {
        q: '¿Cómo funciona este juego de palabras compuestas?',
        a: 'Te damos dos palabras y buscas una tercera que vaya en medio. Con la primera tiene que formar una palabra o expresión real, y con la segunda otra. Por ejemplo, ABRE … DE CONSERVA es LATAS: abrelatas y latas de conserva.',
      },
      {
        q: '¿Sirve para adultos o es para niños?',
        a: 'Para los dos. Los primeros niveles son sencillos, pero a medida que avanzas los puentes se vuelven bastante más difíciles de ver.',
      },
      {
        q: '¿Es lo mismo que Connections del NYT?',
        a: 'No. En Connections ordenas 16 palabras en cuatro grupos. Aquí tienes dos palabras y buscas la única que las une.',
      },
      {
        q: '¿Es gratis? ¿Hay que registrarse?',
        a: 'Es gratis y puedes empezar a jugar ahora mismo, sin registrarte ni descargar nada.',
      },
      {
        q: '¿Cómo funcionan las pistas?',
        a: 'Tienes una pista gratis al día. Es una definición corta que te orienta hacia la palabra que falta, nunca la palabra en sí.',
      },
      {
        q: '¿Los acertijos están escritos en español o traducidos?',
        a: 'Escritos en español. Las palabras compuestas no se traducen bien: cortauñas o ferrocarril no tienen un equivalente directo en inglés, así que cada idioma tiene su propio banco.',
      },
      {
        q: '¿Dónde veo las respuestas?',
        a: 'Dentro del juego. En el reto diario tienes cuatro intentos por acertijo, y si se acaban te enseñamos la respuesta antes de pasar al siguiente.',
      },
    ],
  },
  footerCta: {
    heading: '¿Te animas con los cinco de hoy?',
    body: 'Gratis, en el navegador y sin descargas.',
    button: 'Empezar a jugar',
  },
  videoGameName: 'Palabra Puente',
  videoGameDescription:
    'Juego de palabras compuestas gratis en español. Cada acertijo muestra dos palabras y el jugador busca la que encaja entre ambas, como CUMPLE + AÑOS + LUZ. Tiene reto diario, niveles y acertijos de la comunidad.',
};
