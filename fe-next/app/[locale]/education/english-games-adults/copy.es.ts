import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const es: LocaleContent = {
  metaTitle: 'Aprender inglés jugando para adultos — vocabulario laboral | LexiClash',
  metaDescription:
    'Juegos de inglés para un aula de adultos: el grupo entra desde el móvil con un código de seis caracteres, el tablero va al proyector y tú fijas Apoyo, Base o Desafío por persona. Verbos del trabajo, registro, arranques de conversación, seis idiomas, sin cuentas de estudiante.',
  ogTitle: 'Aprender inglés jugando para adultos',
  ogDescription: 'Juegos de inglés dirigidos por la docente para aulas de adultos. Colocaciones laborales, tablero compartido, seis diccionarios.',
  twitterDescription: 'Juegos de inglés para adultos. Clase en vivo, vocabulario laboral, 6 idiomas, sin cuentas de estudiante.',
  heroTag: '★ Inglés para adultos ★ Gratis para empezar ★',
  heroH1: { highlight: 'Aprender inglés jugando para adultos', rest1: 'en el', rest2: 'aula laboral.' },
  heroSubtitle:
    'Juegos de inglés para un aula de adultos, dirigidos por la docente. Pegas verbos y colocaciones del trabajo, el grupo entra desde el móvil y el proyector muestra el tablero. Seis diccionarios, sin cuentas de estudiante y un nivel por persona para que un grupo mixto de tarde siga jugando junto.',
  ctaLabel: 'Crear aula gratis',
  heroCtas: {
    primary: '▶ Empezar juego para adultos',
    primaryNote: 'Todo el grupo · 5 minutos',
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
      heading: 'Contra qué diccionario se comprueba una respuesta de inglés laboral',
      answer: `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, no una lista corta de ficha. Español, sueco, hebreo, ruso y japonés tienen el suyo: más de ${dictionaryFloor('es', 'es')}, ${dictionaryFloor('sv', 'es')}, ${dictionaryFloor('he', 'es')}, ${dictionaryFloor('ru', 'es')} y ${dictionaryFloor('ja', 'es')} en hiragana.`,
      points: [
        'Si alguien encuentra una colocación inglesa real —aunque no estuviera en la lista laboral de la semana— cuenta.',
        'Tu lista sigue alimentando los ejercicios, así que los verbos de reunión y las frases de registro son las que se repiten.',
        'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
      ],
    },
    {
      heading: 'Cómo fijar la dificultad en un grupo mixto de tarde',
      answer:
        'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y tú fijas la duración y la longitud mínima. Cada adulto lleva Apoyo, Base o Desafío, así el mismo tablero pide cosas distintas a quien empieza y a un colega fluido, sin partir el aula.',
      points: [
        'Un turno usa por defecto el tablero 6x6 y un mínimo de tres letras; súbelo cuando la lista traiga raíces laborales más largas.',
        'La duración la fijas tú en minutos; por defecto son tres.',
        'El plan gratis cubre 3 clases de 50; Teacher Pro cuesta 9 $/mes y añade clases ilimitadas e informes.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} formas de practicar una lista laboral',
    intro:
      'La misma lista del trabajo llega a un adulto en {count} formas distintas. {live} son modos de clase en vivo; las otras {practice} son prácticas en solitario, y seis de ellas apuntan a una sola habilidad: definiciones, sinónimos, antónimos, pistas de contexto, sentidos múltiples y raíces, para que una colocación se vea más de una vez.',
    liveLabel: '{live} modos de clase en vivo',
    practiceLabel: '{practice} prácticas en solitario, por habilidad',
  },
  workflow: {
    heading: 'Un hueco de tarde, de principio a fin',
    intro:
      'La vuelta cabe en los últimos diez minutos de una clase de tarde. Pegas ocho a doce verbos del trabajo, pones un código en el proyector y el grupo juega desde el móvil mientras tú llevas los controles — incluida una pausa si arranca una conversación de registro.',
    steps: [
      { when: '0:00', what: 'Pega la lista laboral de la semana: verbos de reunión, frases de correo, rechazos corteses.' },
      { when: '0:30', what: 'Elige Clásico o Caza de palabras y una ronda de tres minutos. El código va a la pizarra.' },
      { when: '1:00', what: 'El grupo abre el navegador y escribe seis caracteres. Sin correo, sin cuenta.' },
      { when: '2:00', what: 'Jugáis. Pausas si una colocación pide una nota de registro, sumas treinta segundos o saltas una palabra.' },
      { when: '8:00', what: 'Leéis juntas las frases que se escaparon y pasas a Apoyo a quien tropezó con un falso amigo.' },
    ],
  },
  arcadeNote: {
    heading: 'Cuándo un arcade para estudiantes encaja mejor',
    body: 'Esta página cubre un caso: una docente que dirige una ronda para un aula de adultos. Si buscas decenas de minijuegos en autoservicio en casa, un sitio-biblioteca es más amplio. Vuelve aquí cuando necesites a todo el grupo en un tablero y los controles en tu mano.',
    href: 'https://7esl.com/word-games/',
    cta: 'Juegos de 7ESL',
  },
  faqTitle: 'Preguntas frecuentes',
  features: [
    { icon: 'globe', text: 'Seis diccionarios; el inglés se juzga como inglés, no como lista traducida' },
    { icon: 'users', text: 'Juego en vivo para todo el grupo; entran con un código de seis caracteres desde el móvil' },
    { icon: 'timer', text: 'Rondas de tres minutos que caben al final de una clase de tarde' },
    { icon: 'book', text: 'Pega verbos del trabajo, colocaciones, frases de correo o arranques de conversación' },
    { icon: 'monitor', text: 'Móviles, portátiles y el proyector del aula' },
    { icon: 'lock', text: 'Sin cuentas de estudiante. El plan gratis cubre 3 clases de 50' },
  ],
  proficiencyLevels: [
    { tag: 'Apoyo', title: 'Encontrar la frase', desc: 'Palabras laborales más cortas, temporizador largo y banco visible para que quien acaba de llegar también sume.' },
    { tag: 'Base', title: 'En la lista del trabajo', desc: 'Colocaciones mezcladas, temporizador estándar. El tablero 6x6 basta para un grupo mixto de tarde.' },
    { tag: 'Desafío', title: 'Registro y tono', desc: 'Colocaciones más largas y menos tiempo, en el mismo tablero para que nadie salga del grupo.' },
  ],
  sections: {
    builtFor: 'Hecho para clases de inglés laboral.',
    setLevelPerClass: 'Fija el nivel por clase.',
    ctaHeading: '¿Quedan veinte minutos de clase?',
    ctaSubtitle: 'Lanza una ronda de vocabulario laboral.',
    ctaPrimaryButtonLabel: '▶ Empezar juego para adultos',
    ctaSecondaryButtonLabel: 'Volver a Educación',
  },
  faqs: [
    {
      q: '¿Qué juegos de inglés funcionan con adultos?',
      a: 'Juegos cortos de tablero de letras alrededor del vocabulario laboral. El grupo busca colocaciones, verbos de reunión y arranques de conversación en un tablero compartido mientras tú controlas el tiempo y la longitud mínima. Pausa si sale una pregunta de registro: el tablero puede esperar.',
    },
    {
      q: '¿Necesitan cuenta?',
      a: 'No. Entran con un código de seis caracteres desde el móvil o el portátil. Las cuentas quedan en la docente. El plan gratis cubre 3 clases de 50.',
    },
    {
      q: '¿Puedo trabajar el inglés laboral y el registro?',
      a: 'Sí. Pega los verbos de reunión, las frases de correo o los rechazos corteses de la semana. Las rondas en vivo siguen puntuando cualquier palabra inglesa real que el diccionario conozca.',
    },
    {
      q: '¿Cómo llevo un grupo mixto de tarde?',
      a: 'Un tablero compartido, tres niveles. Apoyo ve un banco de palabras; Desafío busca colocaciones más largas en la misma cuadrícula. Nadie cambia de sala, y eso importa cuando el grupo solo se ve una vez por semana.',
    },
    {
      q: '¿La interfaz puede quedarse en el idioma del alumno?',
      a: 'Sí. La interfaz puede quedarse en español, hebreo, sueco, japonés o ruso mientras la ronda se juzga en inglés. El hebreo es de derecha a izquierda, también en el tablero.',
    },
    {
      q: '¿Por dónde empieza un aula de adultos?',
      a: 'Abre el juego de aula, pega ocho frases laborales y pon el código en el proyector. Cinco minutos bastan para la primera ronda al final de una sesión de tarde.',
    },
  ],
};
