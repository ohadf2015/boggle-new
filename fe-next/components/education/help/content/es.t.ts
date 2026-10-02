import type { HelpLocaleContent, HelpQuickAnswer } from '../helpTypes';

export const esT: HelpLocaleContent = {
  'first-live-game-in-5-minutes': {
    title: 'Tu primer juego en directo en 5 minutos',
    summary: 'De iniciar sesión a una clase celebrando ante el podio, sin preparar nada antes. Hazlo una vez y no volverás a necesitar esta página.',
    keywords: 'primera clase, inicio rápido, principiante, primeros pasos, tutorial, cinco minutos, demo, primera vez',
    blocks: [
      { t: 'p', text: 'Necesitas: una pantalla que vea toda la clase, tu dispositivo y alumnado con móviles, tabletas o portátiles. No necesitas clase, lista de alumnos ni lista de palabras.' },
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Abre la Central del profe', body: 'Inicia sesión en la [Central del profe](app:/teacher). Aterrizas en [[teacher.nav.play]].' },
          { time: '0:30', title: 'Elige juego y palabras', body: 'Toca [[academy.hq.modes.classic]] y una de las listas iniciales bajo los pósteres. Están listas para jugar.', shot: 'hq-start-game' },
          { time: '1:00', title: 'En directo y a la pizarra', body: 'Pulsa [[teacher.playNow.goLive]] y proyecta tu pantalla. La sala de espera muestra un código grande, el enlace y un código QR.', shot: 'lobby' },
          { time: '1:30', title: 'El alumnado se une', body: 'Escanean el QR o escriben el código en lexiclash.live/join y eligen un nombre. Verás los nombres entrar volando.' },
          { time: '2:00', title: 'Juega una ronda', body: 'Pulsa [[hostView.startClassGame]]. Una ronda de [[academy.hq.modes.classic]] dura tres minutos. Tu pantalla muestra el reloj y la clasificación en directo.', shot: 'live-host' },
          { time: '5:00', title: 'Celebrad y otra vez', body: 'Aparece el podio. Pulsa [[education.results.playAgain]] para una segunda ronda con el mismo código, o [[eduLive.results.backToClass]] para terminar.' },
        ],
      },
      { t: 'tip', text: 'El alumnado llega a ritmos distintos. Mientras esperáis, pulsa [[tvLobby.tryPracticeRound]]: la clase ve jugar a dos bots y aprende las reglas sin que digas una palabra.' },
    ],
  },
  'five-minute-vocab-warm-up': {
    title: 'Un calentamiento de vocabulario en 5 minutos',
    summary: 'Un inicio de clase que comprueba el significado, no solo la ortografía: Test de vocabulario con las palabras que viste ayer.',
    keywords: 'inicio de clase, calentamiento, rutina de entrada, repaso, test de vocabulario, significados, definiciones',
    blocks: [
      { t: 'p', text: 'Funciona mejor con una lista que tenga definiciones. Tu propia lista es ideal; una lista de la Biblioteca con significados también sirve.' },
      {
        t: 'steps',
        items: [
          { time: 'Antes de clase', title: 'Prepara una lista con significados', body: 'Abre [[teacher.nav.lessons]] y elige una lista que muestre definiciones, o añade significados a la tuya con líneas **palabra - significado**.' },
          { time: '0:00', title: 'Elige Test de vocabulario', body: 'En la Central del profe, toca [[academy.hq.modes.vocabQuiz]] y tu lista, y pulsa [[teacher.playNow.goLive]]. Deja la sala de espera en la pizarra mientras entra el alumnado.' },
          { time: '0:30', title: 'Empieza cuando estén casi todos', body: 'Entrar tarde está activado por defecto, así que los rezagados aún pueden unirse. Pulsa [[hostView.startClassGame]].' },
          { time: '1:00', title: 'Deja correr el test', body: 'Cuatro opciones por palabra; la respuesta correcta más rápida suma más. Tú quedas libre para pasear por el aula.' },
          { time: '4:30', title: 'Leed juntos los resultados', body: 'Señala las palabras que la clase falló y da el significado de cada una en una frase. Esa es tu minilección.', shot: 'results' },
        ],
      },
      { t: 'tip', text: '¿Tienes alumnado con ansiedad? El modo calma de Teacher Pro te deja ocultar el tiempo y la clasificación en directo manteniendo el test.' },
    ],
  },
  'homework-in-3-minutes': {
    title: 'Los deberes de esta tarde en 3 minutos',
    summary: 'Elige una lista, asigna WordCraft, entrega mañana. El alumnado juega desde la página de su clase; tú ves quién ha terminado.',
    keywords: 'deberes, tarea, rápido, esta tarde, para mañana, práctica autónoma',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Ten las palabras listas', body: 'Usa una lista que jugasteis en clase o pega una nueva. Mira [crea una lista de palabras](help:make-a-word-list).' },
          { time: '1:00', title: 'Crea la tarea', body: 'En la Central del profe, abre [[teacher.dashboard.tools]] y pulsa [[teacher.assignment.create]]. Elige la lista.', shot: 'class-tools' },
          { time: '1:30', title: 'Deja el juego recomendado', body: 'Mantén **WordCraft** seleccionado: el alumnado juega solo contra un bot amable, ideal para deberes.', shot: 'assign-type' },
          { time: '2:00', title: 'Para mañana, y asigna', body: 'En [[teacher.assignment.dueDate]], toca mañana, añade una línea de instrucciones si quieres y pulsa [[teacher.assignment.create]].' },
          { time: '3:00', title: 'Revisa mañana', body: 'Abre [[teacher.dashboard.tools]] y luego [[eduHq.tools.assignments]] para ver las tareas activas, atrasadas y completadas.' },
        ],
      },
      { t: 'tip', text: 'Quien ya se unió a tu clase encuentra los deberes en la página de su clase. El alumnado nuevo puede unirse cuando quiera con el código de la clase.' },
      { t: 'pro', text: 'Plan gratuito: {assignments} tareas por clase. ¿Necesitas más? Con Teacher Pro los deberes son ilimitados.' },
    ],
  },
  'reteach-missed-words': {
    title: 'Repasa las palabras que falló la clase',
    summary: 'Convierte las palabras que nadie encontró en el calentamiento de mañana y en los deberes de hoy. Un ciclo de cinco minutos que fija las palabras.',
    keywords: 'repasar, palabras falladas, repaso, repaso espaciado, palabras difíciles, dificultades, refuerzo, seguimiento',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Localiza las palabras falladas', body: 'Tras un juego en directo, los resultados muestran qué palabras de la lección no encontró nadie. Apúntalas o haz una foto.', shot: 'results' },
          { time: '1:00', title: 'Mira la tarjeta de la clase', body: 'En [[teacher.nav.classes]], cada tarjeta de clase muestra las palabras difíciles de los últimos juegos y propone practicarlas.' },
          { time: '2:00', title: 'Haz una lista corta', body: 'En la Central del profe, pulsa [[teacher.playNow.changeWords]], luego [[teacher.playNow.sourcePaste]], y pega solo esas palabras. Con cinco o diez basta.', shot: 'hq-paste-words' },
          { time: '3:00', title: 'Calienta con ellas mañana', body: 'Empieza la clase de mañana con [[academy.hq.modes.wordHunt]] sobre esa lista: la clase compite por encontrar justo las palabras que falló.' },
          { time: '4:00', title: 'Mándalas también a casa', body: 'Asigna la misma lista como deberes para que cada alumno vuelva a encontrarse con esas palabras por su cuenta.' },
        ],
      },
      { t: 'pro', text: 'Teacher Pro hace el ciclo por ti: el dominio de palabras muestra cuáles sigue fallando la clase en todos los juegos, y las rondas de repaso espaciado traen de vuelta las palabras falladas al cabo de unos días.' },
    ],
  },
};

export const esQuick: HelpQuickAnswer[] = [
  { q: '¿El alumnado necesita cuenta?', a: 'No. Se unen con un código de seis caracteres, un enlace o un código QR y eligen un nombre. Sin email, sin contraseña, sin app.', slug: 'how-students-join' },
  { q: '¿LexiClash es gratis para docentes?', a: 'Sí. El plan gratuito no caduca e incluye {classes} clases de hasta {students} alumnos, juegos en directo, listas de palabras y deberes. Teacher Pro es opcional.', slug: 'teacher-pro-and-trial' },
  { q: '¿Cuántos alumnos pueden jugar un juego en directo?', a: 'Hasta {players} alumnos en un mismo juego en directo, con el plan gratuito y con Pro.', slug: 'start-a-live-game' },
  { q: '¿Qué dispositivos sirven?', a: 'Cualquier móvil, tableta, Chromebook o portátil con un navegador actual. El alumnado abre una página web; no hay nada que instalar.', slug: 'how-students-join' },
  { q: '¿Puedo usar mi propio vocabulario?', a: 'Sí. Pega tus palabras, añade significados si quieres modos de test y usa la lista para juegos en directo y deberes.', slug: 'make-a-word-list' },
  { q: '¿Cuánto cuesta Teacher Pro?', a: '{price} al mes tras una prueba gratis de {trialDays} días. Si cancelas antes de que termine la prueba, no pagas nada. El alumnado siempre es gratis.', slug: 'teacher-pro-and-trial' },
];
