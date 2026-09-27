import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const es: LocaleContent = {
  metaTitle: 'Juegos de verbos irregulares — go, went, gone | LexiClash',
  metaDescription:
    'Juegos de verbos irregulares para una clase de inglés: pegas go/went/gone, eat/ate/eaten y see/saw/seen, el alumnado entra con un código de seis caracteres y el tablero va al proyector. Apoyo, Base o Desafío por estudiante, seis idiomas, sin cuentas de estudiante.',
  ogTitle: 'Juegos de verbos irregulares',
  ogDescription: 'Ejercicios de verbos irregulares dirigidos por la docente. Go/went/gone en un tablero compartido, seis diccionarios.',
  twitterDescription: 'Juegos de verbos irregulares. Clase en vivo, go/went/gone, 6 idiomas, sin cuentas de estudiante.',
  heroTag: '★ Verbos irregulares ★ Gratis para empezar ★',
  heroH1: { highlight: 'Juegos de verbos irregulares', rest1: 'en el', rest2: 'aula.' },
  heroSubtitle:
    'Ejercicios de verbos irregulares dirigidos por la docente. Pegas go, went, gone y el resto de raíces de la semana, la clase entra desde la tableta y el proyector muestra el tablero. Seis diccionarios, sin cuentas de estudiante y un nivel por estudiante para que los tres tiempos sigan jugando juntos.',
  ctaLabel: 'Crear aula gratis',
  heroCtas: {
    primary: '▶ Empezar ronda de irregulares',
    primaryNote: 'Toda la clase · 5 minutos',
    secondary: '🔤 Práctica de ortografía',
    secondaryNote: 'Raíces letra a letra',
  },
  related: {
    label: 'Recursos educativos relacionados',
    vocabulary: '→ Juegos ESL',
    teachers: '→ Práctica de spelling bee',
    hub: '→ Centro educativo',
  },
  depth: [
    {
      heading: 'Contra qué diccionario se comprueba una forma irregular',
      answer: `Las respuestas en inglés se comprueban contra un diccionario de más de ${dictionaryFloor('en', 'es')} palabras, no una lista corta de ficha. Español, sueco, hebreo, ruso y japonés tienen el suyo: más de ${dictionaryFloor('es', 'es')}, ${dictionaryFloor('sv', 'es')}, ${dictionaryFloor('he', 'es')}, ${dictionaryFloor('ru', 'es')} y ${dictionaryFloor('ja', 'es')} en hiragana.`,
      points: [
        'Si un estudiante encuentra una forma inglesa real — went, gone, eaten — cuenta aunque no fuera la de la ficha de la semana.',
        'Tu lista sigue alimentando los ejercicios, así que go/went/gone y las otras raíces que pegaste son las que se repiten.',
        'Seis idiomas con diccionario propio: inglés, hebreo, sueco, japonés, español y ruso.',
      ],
    },
    {
      heading: 'Cómo dejar presente, pasado y participio en un solo tablero',
      answer:
        'El tablero tiene tres tamaños — 5x5, 6x6 y 7x7 — y tú fijas la duración y la longitud mínima. Cada estudiante lleva Apoyo, Base o Desafío, así el mismo tablero puede pedir go a uno y gone a otro sin partir el aula.',
      points: [
        'Un turno usa por defecto el tablero 6x6 y un mínimo de tres letras, que sigue puntuando go, ate y saw.',
        'La duración la fijas tú en minutos; por defecto son tres.',
        'El plan gratis cubre 3 clases de 50; Teacher Pro cuesta 9 $/mes y añade clases ilimitadas e informes.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} formas de practicar una lista go/went/gone',
    intro:
      'La misma lista de go/went/gone llega al estudiante en {count} formas distintas. {live} son modos de clase en vivo; las otras {practice} son prácticas en solitario, y seis de ellas apuntan a una sola habilidad: definiciones, sinónimos, antónimos, pistas de contexto, sentidos múltiples y raíces, para que una raíz irregular se vea más de una vez.',
    liveLabel: '{live} modos de clase en vivo',
    practiceLabel: '{practice} prácticas en solitario, por habilidad',
  },
  workflow: {
    heading: 'Ocho minutos de go, went, gone',
    intro:
      'La vuelta cabe en un hueco de gramática. Pegas los irregulares de la semana — presente, pasado y participio — pones un código en el proyector y la clase busca las formas en un tablero mientras tú llevas los controles.',
    steps: [
      { when: '0:00', what: 'Pega las raíces de la semana: go/went/gone, eat/ate/eaten, see/saw/seen.' },
      { when: '0:30', what: 'Elige Clásico o Ortografía y una ronda de dos minutos. El código va a la pizarra.' },
      { when: '1:00', what: 'El alumnado abre el navegador y escribe seis caracteres. Sin correo, sin cuenta.' },
      { when: '2:00', what: 'Jugáis. Saltas una raíz si el aula se atasca, o sumas treinta segundos para un participio duro.' },
      { when: '7:00', what: 'Leéis juntas las formas de pasado que se escaparon y pasas a Apoyo los irregulares que resbalaron.' },
    ],
  },
  arcadeNote: {
    heading: 'Cuándo un arcade para estudiantes encaja mejor',
    body: 'Esta página cubre un caso: una docente que dirige una ronda de verbos irregulares. Si buscas decenas de minijuegos en autoservicio, un sitio-biblioteca es más amplio. Vuelve aquí cuando necesites a toda la clase en un tablero buscando go, went y gone y los controles en tu mano.',
    href: 'https://7esl.com/word-games/',
    cta: 'Juegos de 7ESL',
  },
  faqTitle: 'Preguntas frecuentes',
  features: [
    { icon: 'book', text: 'Pega go/went/gone, eat/ate/eaten, see/saw/seen — cualquier lista irregular' },
    { icon: 'timer', text: 'Rondas de dos minutos que caben en un hueco de gramática sin comerse la clase' },
    { icon: 'users', text: 'Juego en vivo para toda la clase; entran con un código de seis caracteres' },
    { icon: 'zap', text: 'Presente, pasado y participio en un tablero compartido, no en tres fichas' },
    { icon: 'monitor', text: 'Tabletas, Chromebooks y el proyector del aula' },
    { icon: 'lock', text: 'Sin cuentas de estudiante. El plan gratis cubre 3 clases de 50' },
  ],
  proficiencyLevels: [
    { tag: 'Apoyo', title: 'La forma base', desc: 'Raíces más cortas, temporizador largo y banco visible para que go y eat sumen mientras went aún es nuevo.' },
    { tag: 'Base', title: 'Pasado y participio', desc: 'Go/went/gone mezclados en la misma lista, temporizador estándar. El tablero 6x6 basta.' },
    { tag: 'Desafío', title: 'Los difíciles', desc: 'Irregulares más largos y menos tiempo — brought, thought, caught — en el mismo tablero.' },
  ],
  sections: {
    builtFor: 'Hecho para practicar verbos irregulares.',
    setLevelPerClass: 'Fija el nivel por clase.',
    ctaHeading: '¿Toca un ejercicio de verbos?',
    ctaSubtitle: 'Lanza una ronda de go/went/gone.',
    ctaPrimaryButtonLabel: '▶ Empezar juego de irregulares',
    ctaSecondaryButtonLabel: 'Volver a Educación',
  },
  faqs: [
    {
      q: '¿Cómo practico los verbos irregulares con toda la clase?',
      a: 'Pega las tres formas — go, went, gone — en una lista y lanza una ronda corta en un tablero compartido. El alumnado busca las formas que ya conoce mientras tú controlas el tiempo y la longitud mínima. Combínalo con un coro sin dispositivo de las mismas raíces para que también las oiga el oído.',
    },
    {
      q: '¿Necesitan cuenta?',
      a: 'No. Entran con un código de seis caracteres desde la tableta o el Chromebook. Las cuentas quedan en la docente. El plan gratis cubre 3 clases de 50.',
    },
    {
      q: '¿Puedo pegar listas de go/went/gone?',
      a: 'Sí. Pega presente, pasado y participio juntos, o una columna cada vez. Las rondas en vivo siguen puntuando cualquier palabra inglesa real que el diccionario conozca, así que quien ve ate mientras tú trabajabas gone también suma.',
    },
    {
      q: '¿Cómo dejo presente, pasado y participio juntos?',
      a: 'Un tablero compartido, tres niveles. Apoyo busca la forma base; Desafío busca el participio en la misma cuadrícula. Nadie cambia de sala, y las tres formas se quedan en la misma ronda.',
    },
    {
      q: '¿Solo sirve en inglés?',
      a: 'La interfaz puede quedarse en español, hebreo, sueco, japonés o ruso mientras la ronda se juzga en inglés. El hebreo es de derecha a izquierda, también en el tablero. Los verbos siguen en inglés: son el ejercicio.',
    },
    {
      q: '¿Por dónde empiezo una ronda de verbos?',
      a: 'Abre el juego de aula, pega ocho irregulares en tres formas y pon el código en el proyector. Cinco minutos bastan para la primera ronda de go/went/gone.',
    },
  ],
};
