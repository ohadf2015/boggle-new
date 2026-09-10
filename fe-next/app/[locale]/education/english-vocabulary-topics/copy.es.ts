import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const es: LocaleContent = {
  metaTitle: 'Vocabulario en inglés por temas — comida, animales, viaje, escuela | LexiClash',
  metaDescription:
    'Vocabulario en inglés por temas: pegas una lista de comida, animales, viaje o escuela, la lanzas como juego de aula o Caza de palabras y fijas Apoyo, Base o Desafío por estudiante. Seis idiomas, sin cuentas de estudiante.',
  ogTitle: 'Vocabulario en inglés por temas',
  ogDescription: 'Listas jugables de inglés: comida, animales, viaje y escuela. Clase en vivo, seis diccionarios.',
  twitterDescription: 'Vocabulario en inglés por temas. Comida, animales, viaje, escuela — listas jugables, 6 idiomas.',
  heroTag: '★ Listas por tema ★ Gratis para empezar ★',
  heroH1: { highlight: 'Vocabulario en inglés por temas', rest1: 'para el', rest2: 'aula.' },
  heroSubtitle:
    'Listas jugables de inglés: comida, animales, viaje y escuela. Pegas el tema, la clase entra desde el móvil y el proyector muestra el tablero. Seis diccionarios, sin cuentas de estudiante y un nivel por alumno para que el grupo mixto siga junto.',
  ctaLabel: 'Crear aula gratis',
  heroCtas: {
    primary: '🔍 Jugar una caza por tema',
    primaryNote: 'Solo o en clase · 3 minutos',
    secondary: '▶ Lanzarlo para la clase',
    secondaryNote: 'Toda la clase · 5 minutos',
  },
  related: {
    label: 'Recursos educativos relacionados',
    vocabulary: '→ Juegos de vocabulario para el aula',
    teachers: '→ Juegos ESL',
    hub: '→ Centro educativo',
  },
  depth: [
    {
      heading: 'Contra qué diccionario se comprueba una palabra de tema',
      answer: `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, así que bread, tiger, passport y pencil son entradas reales, no un mazo de fichas. Español, sueco, hebreo, ruso y japonés tienen el suyo: más de ${dictionaryFloor('es', 'es')}, ${dictionaryFloor('sv', 'es')}, ${dictionaryFloor('he', 'es')}, ${dictionaryFloor('ru', 'es')} y ${dictionaryFloor('ja', 'es')} en hiragana.`,
      points: [
        'Si un estudiante encuentra una palabra real del tema, cuenta aunque no estuviera en la lista de la semana.',
        'Tu lista sigue alimentando los ejercicios, así que comida, animales, viaje o escuela es lo que se repite.',
        'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
      ],
    },
    {
      heading: 'Cómo convertir una lista temática en una ronda en vivo',
      answer:
        'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y tú fijas la duración y la longitud mínima. Cada estudiante lleva Apoyo, Base o Desafío, así el mismo tablero puede pedir bread a uno y recipe a otro.',
      points: [
        'Un turno usa por defecto el tablero 6x6 y un mínimo de tres letras.',
        'Caza de palabras recorre la misma lista temática sin abrir un aula.',
        'El plan gratis cubre 3 clases de 50; Teacher Pro cuesta 9 $/mes y añade clases ilimitadas e informes.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} formas de practicar una lista por tema',
    intro:
      'La misma lista de comida o de viaje llega al estudiante en {count} formas distintas. {live} son modos de clase en vivo; las otras {practice} son prácticas en solitario, y seis de ellas apuntan a una sola habilidad: definiciones, sinónimos, antónimos, pistas de contexto, sentidos múltiples y raíces.',
    liveLabel: '{live} modos de clase en vivo',
    practiceLabel: '{practice} prácticas en solitario, por habilidad',
  },
  workflow: {
    heading: 'Diez minutos, de principio a fin',
    intro:
      'Toda la vuelta cabe en los últimos diez minutos de una clase temática. Pegas doce palabras de comida, animales, viaje o escuela, pones un código en el proyector y la clase juega desde el móvil.',
    steps: [
      { when: '0:00', what: 'Pega el tema de la semana: comida, animales, viaje o escuela.' },
      { when: '0:30', what: 'Elige Caza de palabras o Clásico. El código va a la pizarra.' },
      { when: '1:00', what: 'El alumnado abre el navegador y escribe seis caracteres. Sin correo, sin cuenta.' },
      { when: '2:00', what: 'Jugáis. Desde tu pantalla puedes pausar, sumar treinta segundos o saltar una palabra.' },
      { when: '8:00', what: 'Leéis las palabras del tema que se escaparon y pasas a Apoyo a quien se atascó.' },
    ],
  },
  arcadeNote: {
    heading: 'Cuándo un arcade para estudiantes encaja mejor',
    body: 'Esta página cubre a una docente que recorre una lista temática con toda la sala. Si buscas decenas de minijuegos en autoservicio, un sitio-biblioteca es más amplio. Vuelve aquí cuando necesites comida, animales, viaje o escuela en un tablero y los controles en tu mano.',
    href: 'https://7esl.com/word-games/',
    cta: 'Juegos de 7ESL',
  },
  faqTitle: 'Preguntas frecuentes',
  features: [
    { icon: 'globe', text: 'Seis diccionarios; las palabras de tema se juzgan como inglés, no como ficha traducida' },
    { icon: 'users', text: 'Juego en vivo para toda la clase, o Caza de palabras en silencio con una lista' },
    { icon: 'timer', text: 'Rondas de tres minutos que caben en un hueco temático' },
    { icon: 'book', text: 'Pega listas de comida, animales, viaje o escuela — o la tuya' },
    { icon: 'monitor', text: 'Móviles, Chromebooks y el proyector del aula' },
    { icon: 'lock', text: 'Sin cuentas de estudiante. El plan gratis cubre 3 clases de 50' },
  ],
  proficiencyLevels: [
    { tag: 'Apoyo', title: 'Palabras con dibujo', desc: 'Palabras cortas del tema, temporizador largo y banco visible.' },
    { tag: 'Base', title: 'En la lista', desc: 'Mezcla de longitudes, temporizador estándar. El tablero 6x6 basta.' },
    { tag: 'Desafío', title: 'Fuera de lista', desc: 'Palabras más largas del tema y menos tiempo, en el mismo tablero.' },
  ],
  sections: {
    builtFor: 'Hecho para el vocabulario por temas.',
    setLevelPerClass: 'Fija el nivel por clase.',
    ctaHeading: '¿Quedan cinco minutos?',
    ctaSubtitle: 'Lanza una ronda por tema.',
    ctaPrimaryButtonLabel: '▶ Empezar juego por tema',
    ctaSecondaryButtonLabel: 'Volver a Educación',
  },
  faqs: [
    {
      q: '¿Qué temas de inglés puedo jugar como lista?',
      a: 'Comida, animales, viaje y escuela salen como listas de partida en esta página. Pégalas en un juego de aula o en Caza de palabras. Las rondas en vivo siguen puntuando cualquier palabra inglesa real, así que quien encuentra bread en una ronda de comida suma aunque hubieras escrito toast.',
    },
    {
      q: '¿El alumnado necesita cuenta?',
      a: 'No. Entran con un código de seis caracteres. Las cuentas quedan en la docente. El plan gratis cubre 3 clases de 50.',
    },
    {
      q: '¿Puedo mezclar dos temas?',
      a: 'Sí. Pega comida y viaje juntas si esa es la unidad de la semana. El tablero no distingue; el diccionario sigue juzgando inglés.',
    },
    {
      q: '¿Cómo mantengo niveles mixtos en un solo tema?',
      a: 'Un tablero compartido, tres niveles. Apoyo ve el banco; Desafío busca palabras más largas del tema en la misma cuadrícula.',
    },
    {
      q: '¿La interfaz puede quedarse en español?',
      a: 'Sí. Español, hebreo, sueco, japonés o ruso en la interfaz, inglés en el tablero. El hebreo es de derecha a izquierda en todo.',
    },
    {
      q: '¿Por dónde empiezo?',
      a: 'Copia una lista de comida, animales, viaje o escuela, abre Caza de palabras o el juego de aula y pégala. Cinco minutos bastan.',
    },
  ],
  topics: {
    title: 'Listas jugables por tema',
    intro: 'Pega cualquier grupo en un juego de aula o en Caza de palabras. Son palabras inglesas que el diccionario ya conoce.',
    groups: [
      { label: 'Comida (food)', words: ['bread', 'apple', 'rice', 'cheese', 'water', 'sugar', 'lemon', 'onion', 'pasta', 'honey'] },
      { label: 'Animales (animals)', words: ['tiger', 'horse', 'whale', 'mouse', 'eagle', 'snake', 'sheep', 'camel', 'panda', 'wolf'] },
      { label: 'Viaje (travel)', words: ['train', 'hotel', 'ticket', 'passport', 'airport', 'map', 'luggage', 'bridge', 'beach', 'taxi'] },
      { label: 'Escuela (school)', words: ['pencil', 'desk', 'teacher', 'lesson', 'book', 'ruler', 'paper', 'board', 'class', 'exam'] },
    ],
  },
};
