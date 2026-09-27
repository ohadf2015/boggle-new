import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const es: LocaleContent = {
  metaTitle: 'Juegos de inglés para primaria — 6 idiomas | LexiClash',
  metaDescription:
    'Juegos de inglés para una clase de primaria: el alumnado entra desde la tableta con un código de seis caracteres, el tablero va al proyector y tú fijas Apoyo, Base o Desafío por niño. Seis idiomas, sin cuentas de estudiante.',
  ogTitle: 'Juegos de inglés para primaria',
  ogDescription: 'Juegos de inglés dirigidos por la docente para primaria. Palabras cortas, tablero compartido, seis diccionarios.',
  twitterDescription: 'Juegos de inglés para primaria. Clase en vivo, 6 idiomas, sin cuentas de estudiante.',
  heroTag: '★ Inglés en primaria ★ Gratis para empezar ★',
  heroH1: { highlight: 'Juegos de inglés para primaria', rest1: 'en el', rest2: 'aula.' },
  heroSubtitle:
    'Juegos de inglés para primaria dirigidos por la docente. Eliges una lista corta, la clase entra desde la tableta y el proyector muestra el tablero. Seis diccionarios, sin cuentas de estudiante y un nivel por niño para que un tercero mixto siga jugando junto.',
  ctaLabel: 'Crear aula gratis',
  heroCtas: {
    primary: '▶ Empezar juego de primaria',
    primaryNote: 'Toda la clase · 5 minutos',
    secondary: '🔍 Caza de palabras',
    secondaryNote: 'Práctica en silencio',
  },
  related: {
    label: 'Recursos educativos relacionados',
    vocabulary: '→ Juegos ESL',
    teachers: '→ Juegos para profesores',
    hub: '→ Centro educativo',
  },
  depth: [
    {
      heading: 'Contra qué diccionario se comprueba una respuesta en inglés',
      answer: `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, no una lista corta de ficha. Español, sueco, hebreo, ruso y japonés tienen el suyo: más de ${dictionaryFloor('es', 'es')}, ${dictionaryFloor('sv', 'es')}, ${dictionaryFloor('he', 'es')}, ${dictionaryFloor('ru', 'es')} y ${dictionaryFloor('ja', 'es')} en hiragana.`,
      points: [
        'Si un niño encuentra una palabra inglesa real, cuenta aunque no estuviera en la ficha de la semana.',
        'Tu lista corta sigue alimentando los ejercicios, así que las palabras de la semana son las que se repiten.',
        'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
      ],
    },
    {
      heading: 'Cómo fijar la dificultad en un aula mixta',
      answer:
        'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y tú fijas la duración y la longitud mínima. Cada niño lleva Apoyo, Base o Desafío, así el mismo tablero pide cosas distintas.',
      points: [
        'Un turno usa por defecto el tablero 6x6 y un mínimo de tres letras.',
        'La duración la fijas tú en minutos; por defecto son tres.',
        'El plan gratis cubre 3 clases de 50; Teacher Pro cuesta 9 $/mes y añade clases ilimitadas e informes.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} formas de practicar una lista en inglés',
    intro:
      'La misma lista de vocabulario llega al estudiante en {count} formas distintas. {live} son modos de clase en vivo; las otras {practice} son prácticas en solitario, y seis de ellas apuntan a una sola habilidad: definiciones, sinónimos, antónimos, pistas de contexto, sentidos múltiples y raíces.',
    liveLabel: '{live} modos de clase en vivo',
    practiceLabel: '{practice} prácticas en solitario, por habilidad',
  },
  workflow: {
    heading: 'Diez minutos, de principio a fin',
    intro:
      'Toda la vuelta cabe en los últimos diez minutos de una clase de primaria. Pegas ocho a doce palabras cortas, pones un código en el proyector y la clase juega desde la tableta.',
    steps: [
      { when: '0:00', what: 'Pega las palabras cortas de la semana: CVC, colores, objetos del aula.' },
      { when: '0:30', what: 'Elige Clásico o Caza de palabras y una ronda de dos minutos. El código va a la pizarra.' },
      { when: '1:00', what: 'El alumnado abre el navegador y escribe seis caracteres. Sin correo, sin cuenta.' },
      { when: '2:00', what: 'Jugáis. Desde tu pantalla puedes pausar, sumar treinta segundos o saltar una palabra.' },
      { when: '8:00', what: 'Leéis juntas las palabras que se escaparon y pasas a Apoyo a quien se atascó.' },
    ],
  },
  arcadeNote: {
    heading: 'Cuándo un arcade para estudiantes encaja mejor',
    body: 'Esta página cubre un caso: una docente que dirige una ronda para primaria. Si buscas decenas de minijuegos en autoservicio, un sitio-biblioteca es más amplio. Vuelve aquí cuando necesites a toda la clase en un tablero y los controles en tu mano.',
    href: 'https://7esl.com/word-games/',
    cta: 'Juegos de 7ESL',
  },
  faqTitle: 'Preguntas frecuentes',
  features: [
    { icon: 'globe', text: 'Seis diccionarios; el inglés se juzga como inglés, no como lista traducida' },
    { icon: 'users', text: 'Juego en vivo para toda la clase; entran con un código de seis caracteres' },
    { icon: 'timer', text: 'Rondas de dos y tres minutos que caben en un hueco de fonética' },
    { icon: 'book', text: 'Pega CVC, colores, animales o la lista del lector de la semana' },
    { icon: 'monitor', text: 'Tabletas, Chromebooks y el proyector del aula' },
    { icon: 'lock', text: 'Sin cuentas de estudiante. El plan gratis cubre 3 clases de 50' },
  ],
  proficiencyLevels: [
    { tag: 'Apoyo', title: 'Primeros pasos', desc: 'Palabras de 3 letras, temporizador largo y banco visible para que quien empieza a leer también sume.' },
    { tag: 'Base', title: 'En marcha', desc: 'Mezcla de 3 a 5 letras, temporizador estándar. El tablero 5x5 basta.' },
    { tag: 'Desafío', title: 'Listos para más', desc: 'Palabras más largas y menos tiempo, en el mismo tablero para que nadie salga del grupo.' },
  ],
  sections: {
    builtFor: 'Hecho para quienes empiezan el inglés en primaria.',
    setLevelPerClass: 'Fija el nivel por clase.',
    ctaHeading: '¿Quedan cinco minutos?',
    ctaSubtitle: 'Lanza una ronda de palabras cortas.',
    ctaPrimaryButtonLabel: '▶ Empezar juego de primaria',
    ctaSecondaryButtonLabel: 'Volver a Educación',
  },
  faqs: [
    {
      q: '¿Qué juegos de inglés funcionan en primaria?',
      a: 'Juegos cortos de tablero de letras. El alumnado busca palabras CVC, colores y objetos del aula en un tablero compartido mientras tú controlas el tiempo y la longitud mínima. Combínalo con un calentamiento sin dispositivo para no atar a quien aún lee despacio.',
    },
    {
      q: '¿Los niños necesitan cuenta?',
      a: 'No. Entran con un código de seis caracteres desde la tableta o el Chromebook. Las cuentas quedan en la docente. El plan gratis cubre 3 clases de 50.',
    },
    {
      q: '¿Puedo usar mi lista de fonética?',
      a: 'Sí. Pega los grafemas o las palabras del lector de la semana. Las rondas en vivo siguen puntuando cualquier palabra inglesa real que el diccionario conozca.',
    },
    {
      q: '¿Cómo mantengo un tercero mixto junto?',
      a: 'Un tablero compartido, tres niveles. Apoyo ve un banco de palabras; Desafío busca palabras más largas en la misma cuadrícula. Nadie cambia de sala.',
    },
    {
      q: '¿Solo sirve en inglés?',
      a: 'La interfaz puede quedarse en español, hebreo, sueco, japonés o ruso mientras la ronda se juzga en inglés. El hebreo es de derecha a izquierda, también en el tablero.',
    },
    {
      q: '¿Por dónde empiezo?',
      a: 'Abre el juego de aula, pega ocho palabras cortas y pon el código en el proyector. Cinco minutos bastan para la primera ronda.',
    },
  ],
};
