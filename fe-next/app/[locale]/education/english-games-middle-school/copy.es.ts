import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const es: LocaleContent = {
  metaTitle: 'Juegos de inglés para secundaria — vocabulario académico, duelos | LexiClash',
  metaDescription:
    'Juegos de inglés para una clase de secundaria: el alumnado entra desde el móvil con un código de seis caracteres, el tablero va al proyector y tú fijas Apoyo, Base o Desafío por estudiante. Vocabulario académico, duelos en vivo, seis idiomas, sin cuentas de estudiante.',
  ogTitle: 'Juegos de inglés para secundaria',
  ogDescription: 'Juegos de inglés dirigidos por la docente para adolescentes. Vocabulario académico, tablero compartido, duelos, seis diccionarios.',
  twitterDescription: 'Juegos de inglés para secundaria. Clase en vivo, duelos, 6 idiomas, sin cuentas de estudiante.',
  heroTag: '★ Inglés en secundaria ★ Gratis para empezar ★',
  heroH1: { highlight: 'Juegos de inglés para secundaria', rest1: 'en el', rest2: 'aula.' },
  heroSubtitle:
    'Juegos de inglés para secundaria dirigidos por la docente. Pegas vocabulario académico, la clase entra desde el móvil y el proyector muestra el tablero. Duelos en vivo, seis diccionarios, sin cuentas de estudiante y un nivel por estudiante para que un primero mixto siga jugando junto.',
  ctaLabel: 'Crear aula gratis',
  heroCtas: {
    primary: '▶ Empezar juego de secundaria',
    primaryNote: 'Toda la clase · 5 minutos',
    secondary: '⚔ Abrir un duelo',
    secondaryNote: 'Práctica de dos en dos',
  },
  related: {
    label: 'Recursos educativos relacionados',
    vocabulary: '→ Juegos ESL',
    teachers: '→ Juegos para profesores',
    hub: '→ Centro educativo',
  },
  depth: [
    {
      heading: 'Contra qué diccionario se comprueba una respuesta académica en inglés',
      answer: `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, no una lista corta de ficha. Español, sueco, hebreo, ruso y japonés tienen el suyo: más de ${dictionaryFloor('es', 'es')}, ${dictionaryFloor('sv', 'es')}, ${dictionaryFloor('he', 'es')}, ${dictionaryFloor('ru', 'es')} y ${dictionaryFloor('ja', 'es')} en hiragana.`,
      points: [
        'Si un adolescente encuentra una palabra inglesa real —incluso un término de ciencias que no estaba en la ficha— cuenta.',
        'Tu lista académica sigue alimentando los ejercicios, así que prefijos, raíces y las palabras de la unidad son las que se repiten.',
        'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
      ],
    },
    {
      heading: 'Cómo mantener un primero mixto en un solo tablero',
      answer:
        'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y tú fijas la duración y la longitud mínima. Cada estudiante lleva Apoyo, Base o Desafío, así el mismo tablero pide cosas distintas sin partir el aula.',
      points: [
        'Un turno usa por defecto el tablero 6x6 y un mínimo de tres letras; súbelo cuando la unidad traiga raíces más largas.',
        'La duración la fijas tú en minutos; por defecto son tres.',
        'El plan gratis cubre 3 clases de 50; Teacher Pro cuesta 9 $/mes y añade clases ilimitadas e informes.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} formas de practicar una lista académica',
    intro:
      'La misma lista de secundaria llega al adolescente en {count} formas distintas. {live} son modos de clase en vivo, incluido un duelo para dos; las otras {practice} son prácticas en solitario, y seis de ellas apuntan a una sola habilidad: definiciones, sinónimos, antónimos, pistas de contexto, sentidos múltiples y raíces.',
    liveLabel: '{live} modos de clase en vivo',
    practiceLabel: '{practice} prácticas en solitario, por habilidad',
  },
  workflow: {
    heading: 'Doce minutos de ronda académica',
    intro:
      'La vuelta cabe entre una lectura y el timbre. Pegas ocho a quince palabras académicas, pones un código en el proyector y la clase juega desde el móvil — o abres un duelo para dos mientras el resto mira el tablero.',
    steps: [
      { when: '0:00', what: 'Pega la lista académica de la semana: prefijos, raíces, términos de ciencias o historia.' },
      { when: '0:30', what: 'Elige Clásico para toda la clase, o manda a dos a un duelo. El código va a la pizarra.' },
      { when: '1:00', what: 'El alumnado abre el navegador y escribe seis caracteres. Sin correo, sin cuenta.' },
      { when: '2:00', what: 'Jugáis. Pausas por una raíz, sumas treinta segundos o saltas una palabra desde tu pantalla.' },
      { when: '10:00', what: 'Leéis juntas las raíces que se escaparon y pasas a Desafío a quien terminó antes.' },
    ],
  },
  arcadeNote: {
    heading: 'Cuándo un arcade para estudiantes encaja mejor',
    body: 'Esta página cubre un caso: una docente que dirige una ronda para un aula de secundaria. Si buscas decenas de minijuegos en autoservicio, un sitio-biblioteca es más amplio. Vuelve aquí cuando necesites a toda la clase en un tablero — o a dos en un duelo — y los controles en tu mano.',
    href: 'https://7esl.com/word-games/',
    cta: 'Juegos de 7ESL',
  },
  faqTitle: 'Preguntas frecuentes',
  features: [
    { icon: 'globe', text: 'Seis diccionarios; el inglés se juzga como inglés, no como lista traducida' },
    { icon: 'users', text: 'Juego en vivo para toda la clase y duelos de dos en dos; entran con un código de seis caracteres' },
    { icon: 'zap', text: 'Rondas cortas y competitivas que sostienen un primero sin un quiz solo de puntos' },
    { icon: 'book', text: 'Pega prefijos, raíces, términos de ciencias o la lista de la unidad' },
    { icon: 'monitor', text: 'Móviles, Chromebooks y el proyector del aula' },
    { icon: 'graduation', text: 'Apoyo, Base y Desafío en un tablero compartido para que nadie salga del grupo' },
  ],
  proficiencyLevels: [
    { tag: 'Apoyo', title: 'Armar la raíz', desc: 'Palabras académicas más cortas, temporizador largo y banco visible para que un primero callado también sume.' },
    { tag: 'Base', title: 'En la unidad', desc: 'Raíces y afijos mezclados, temporizador estándar. El tablero 6x6 es el de partida.' },
    { tag: 'Desafío', title: 'Listos para el duelo', desc: 'Palabras más largas y menos tiempo, en el mismo tablero, o un duelo de dos.' },
  ],
  sections: {
    builtFor: 'Hecho para adolescentes que aprenden inglés.',
    setLevelPerClass: 'Fija el nivel por clase.',
    ctaHeading: '¿El timbre en diez minutos?',
    ctaSubtitle: 'Lanza una ronda de vocabulario académico.',
    ctaPrimaryButtonLabel: '▶ Empezar juego de secundaria',
    ctaSecondaryButtonLabel: 'Volver a Educación',
  },
  faqs: [
    {
      q: '¿Qué juegos de inglés funcionan con adolescentes en secundaria?',
      a: 'Juegos cortos de tablero de letras y duelos breves. El alumnado busca vocabulario académico, prefijos y raíces en un tablero compartido mientras tú controlas el tiempo y la longitud mínima. Un duelo de dos da salida a quien termina antes sin vaciar el aula.',
    },
    {
      q: '¿Necesitan cuenta?',
      a: 'No. Entran con un código de seis caracteres desde el móvil o el Chromebook. Las cuentas quedan en la docente. El plan gratis cubre 3 clases de 50.',
    },
    {
      q: '¿Puedo pegar vocabulario académico y prefijos?',
      a: 'Sí. Pega las palabras de la unidad, raíces griegas y latinas o un glosario de ciencias. Las rondas en vivo siguen puntuando cualquier palabra inglesa real que el diccionario conozca.',
    },
    {
      q: '¿Cómo mantengo un primero mixto junto?',
      a: 'Un tablero compartido, tres niveles. Apoyo ve un banco de palabras; Desafío busca raíces más largas en la misma cuadrícula, o abres un duelo para dos. Nadie cambia de sala.',
    },
    {
      q: '¿Solo sirve en inglés?',
      a: 'La interfaz puede quedarse en español, hebreo, sueco, japonés o ruso mientras la ronda se juzga en inglés. El hebreo es de derecha a izquierda, también en el tablero.',
    },
    {
      q: '¿Por dónde empiezo con un aula de secundaria?',
      a: 'Abre el juego de aula, pega diez palabras académicas y pon el código en el proyector. Cinco minutos bastan para la primera ronda; abre un duelo si dos terminan antes.',
    },
  ],
};
