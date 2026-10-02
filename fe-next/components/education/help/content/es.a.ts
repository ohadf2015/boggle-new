import type { HelpLocaleContent } from '../helpTypes';

export const esA: HelpLocaleContent = {
  'create-teacher-account': {
    title: 'Crea tu cuenta docente gratis',
    summary: 'Regístrate con Google o con un enlace de un solo uso por email, recibe la aprobación al momento y entra en la Central del profe. Un minuto, sin tarjeta.',
    keywords: 'registro, crear cuenta, iniciar sesión, entrar, cuenta, acceso docente, aprobación, contraseña, google, enlace mágico',
    blocks: [
      { t: 'p', text: 'Tu alumnado nunca necesita cuenta. Tú sí, para que tus clases, listas de palabras y resultados queden guardados en un solo sitio. Es gratis, y el plan gratuito no caduca.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre el registro docente', body: 'Entra en la [Central del profe](app:/teacher) y elige [[education.access.auth_required_cta]]. Si ya tienes una cuenta de LexiClash, elige [[education.access.auth_signin_cta]].' },
          { title: 'Elige cómo entrar', body: '[[auth.continueWithGoogle]] es lo más rápido. ¿Prefieres el email? Escribe tu dirección del centro y te enviamos un enlace de un solo uso, sin contraseña que recordar. También puedes elegir [[auth.magicLink.usePassword]].', shot: 'teacher-signup' },
          { title: 'Recibe la aprobación', body: 'El acceso docente se aprueba al instante. Sin lista de espera y sin llamadas.' },
          { title: 'Conoce la Central del profe', body: 'Aterrizas en [[teacher.nav.play]] con un juego listo para lanzar. El menú lateral (o la barra inferior en el móvil) tiene [[teacher.nav.classes]], [[teacher.nav.lessons]], [[teacher.nav.reports]] y [[teacher.nav.me]].', shot: 'hq-overview' },
        ],
      },
      { t: 'tip', text: 'No tienes que preparar nada antes de tu primer juego. Pulsa [[teacher.playNow.goLive]] y LexiClash crea una clase por ti mientras el código aparece en la pizarra.' },
      { t: 'pro', text: 'El plan gratuito incluye {classes} clases de hasta {students} alumnos cada una. Teacher Pro es opcional y solo importa cuando das clase a más grupos o quieres informes más detallados.' },
    ],
  },
  'create-a-class': {
    title: 'Crea una clase y consigue su código',
    summary: 'Crea una clase por cada grupo. Cada una tiene su propio código de seis caracteres, su lista de alumnos y sus resultados.',
    keywords: 'nueva clase, grupo, curso, lista de alumnos, código de acceso, renombrar, borrar clase, google classroom',
    blocks: [
      { t: 'p', text: 'Una clase mantiene unido a un grupo: el alumnado que se ha unido, las tareas que pones y todos los resultados de juego. Si das clase a tres grupos, crea tres clases para que los informes nunca se mezclen.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre Clases', body: 'En la Central del profe, abre [[teacher.nav.classes]]. Verás todas tus clases con su código y cuántos alumnos tiene cada una.' },
          { title: 'Crea la clase', body: 'Pulsa [[teacher.onboardingChecklist.createClassroomCta]], ponle un nombre que tu alumnado reconozca (por ejemplo «2.º ESO B Inglés») y elige el idioma en el que juega la clase.', shot: 'create-class' },
          { title: 'Comparte el código', body: 'La tarjeta de la nueva clase muestra su código. Usa [[teacher.classroom.copyCode]] para pegarlo en el chat de la clase, o proyéctalo desde [[teacher.nav.play]].' },
          { title: 'Edita u ordena después', body: 'El menú **⋯** de cada tarjeta te permite [[teacher.classroom.edit]], [[teacher.classroom.googleClassroom]] o [[teacher.classroom.delete]].', shot: 'classes-actions' },
        ],
      },
      { t: 'tip', text: 'El idioma de la clase importa: es el idioma en el que juega. Una clase de inglés juega con palabras en inglés aunque tu pantalla esté en español.' },
      { t: 'pro', text: 'Plan gratuito: hasta {classes} clases, cada una con hasta {students} alumnos. Teacher Pro elimina los dos límites.' },
    ],
  },
  'start-a-live-game': {
    title: 'Lanza un juego en directo con un toque',
    summary: 'Elige un juego, elige las palabras y pulsa ¡En directo! El código está en la pizarra antes de que la clase termine de sentarse.',
    keywords: 'en directo, juego en vivo, lanzar, proyector, juego de clase, empezar, jugar ahora',
    blocks: [
      { t: 'p', text: 'En un juego en directo toda la clase juega a la vez desde sus dispositivos mientras la pizarra muestra el código, el tiempo y la clasificación. Todo empieza en [[teacher.nav.play]] dentro de la Central del profe.' },
      {
        t: 'steps',
        items: [
          { title: 'Elige el juego', body: 'En [[academy.hq.startTitle]], toca un póster. ¿Dudas? [[academy.hq.modes.classic]] funciona con cualquier lista; [[academy.hq.modes.vocabQuiz]] necesita palabras con definición.', shot: 'hq-start-game' },
          { title: 'Elige las palabras', body: 'Toca una de tus listas bajo los pósteres, o pulsa [[teacher.playNow.changeWords]] para ver [[teacher.playNow.sourcePacks]] o [[teacher.playNow.sourcePaste]].' },
          { title: 'Pulsa ¡En directo!', body: 'Pulsa [[teacher.playNow.goLive]]. LexiClash prepara la clase, carga las palabras y abre la sala. La sala de espera llena la pantalla con el código, el enlace y un código QR.', shot: 'lobby' },
          { title: 'Empieza cuando estén dentro', body: 'Los nombres aparecen en la sala de espera según se unen. [[hostView.startClassGame]] se activa en cuanto hay al menos un alumno. Púlsalo y la ronda empieza a la vez en todos los dispositivos.' },
        ],
      },
      { t: 'tip', text: '¿Quieres enseñar a la clase lo que viene? En la sala de espera, pulsa [[tvLobby.tryPracticeRound]]. Dos bots juegan una ronda corta en la pizarra mientras explicas, y nada cuenta para los resultados de la clase.' },
    ],
  },
  'how-students-join': {
    title: 'Cómo se une el alumnado (código, enlace o QR)',
    summary: 'El alumnado escribe un código de seis caracteres, abre tu enlace o escanea el QR, y elige un nombre. Sin cuentas, sin email y sin instalar nada.',
    keywords: 'código de acceso, entrada del alumnado, código qr, enlace, sin cuenta, página para unirse, no puede entrar, código incorrecto',
    blocks: [
      { t: 'p', text: 'Unirse lleva unos diez segundos en móvil, tableta, Chromebook o portátil. Funciona en cualquier navegador actual.' },
      {
        t: 'steps',
        items: [
          { title: 'Pon el código a la vista', body: 'En la Central del profe, la tarjeta [[academy.hq.getStudentsIn]] muestra tu código. Usa [[academy.hq.openProjector]] para verlo a pantalla completa, [[academy.hq.qr]] para un código escaneable o [[academy.hq.copyLink]] para pegar el enlace en el chat de la clase o en tu plataforma.', shot: 'hq-get-students-in' },
          { title: 'El alumnado abre la página', body: 'Entran en **lexiclash.live/join** y escriben los seis caracteres, o abren tu enlace o escanean el QR, que rellenan el código por ellos.' },
          { title: 'Cada alumno elige un nombre', body: 'Ven a qué clase se unen, escriben un nombre (o tocan el dado para uno al azar) y pulsan [[education.student.join.flow.go]]. Listo.', shot: 'student-join' },
          { title: 'Mira cómo se llena la lista', body: 'Cada alumno aparece en tu pantalla al llegar. Quien se une a una clase así queda en su lista, y sus resultados llegan a tus informes.' },
        ],
      },
      { t: 'tip', text: 'Pide que usen su nombre de pila o el apodo que usáis en clase. Toda la clase ve los nombres en la clasificación, así que también es buen momento para recordar el respeto.' },
      { t: 'h2', text: 'Si alguien no consigue entrar' },
      { t: 'list', items: ['Revisa el código: seis letras y números, y durante un juego el que vale es el de la sala de espera en directo.', 'Pide que recargue la página. Una página a medio cargar con la wifi del centro es la causa habitual.', 'Si terminaste el juego, la sala está cerrada. Pulsa [[teacher.playNow.goLive]] otra vez y comparte el nuevo código.'] },
    ],
  },
  'choose-a-game-mode': {
    title: '¿Qué juego elijo?',
    summary: 'Seis juegos en directo, cada uno bueno en algo distinto. Qué practica cada uno y cuándo sacarlo.',
    keywords: 'modos de juego, arena de palabras, clásico, test de vocabulario, blast, caza de palabras, wordcraft, wheel rush, qué modo, diferencias',
    blocks: [
      { t: 'p', text: 'Todos los modos se juegan con la lista que elegiste y funcionan con el mismo código. Puedes cambiar de uno a otro durante la clase sin que nadie tenga que volver a unirse.' },
      {
        t: 'list',
        items: [
          '[[academy.hq.modes.classic]]: una cuadrícula de letras compartida; el alumnado traza cada palabra que encuentra. Ideal para ortografía y formación de palabras con cualquier lista. Tres minutos por defecto.',
          '[[academy.hq.modes.vocabQuiz]]: cuatro opciones, un significado; la respuesta correcta más rápida suma más. Lo mejor para comprobar el significado. Necesita una lista con definiciones.',
          '[[academy.hq.modes.blast]]: rondas rápidas en las que las palabras desatan combos en cadena. Pura energía para un viernes o los últimos diez minutos.',
          '[[academy.hq.modes.wordHunt]]: la clase compite por sacar las palabras de la lista de la cuadrícula. Bueno para palabras recién presentadas.',
          '[[academy.hq.modes.wordcraft]]: cada alumno forma palabras de la lista en su propio tablero contra el Barón, y la clasificación de la clase decide el resto. Más tranquilo, y bueno para grupos con niveles distintos.',
          '[[teacher.classroom.gameModes.wheelRush]]: gira la rueda de letras y lanza palabras contra el reloj. Rápido y ruidoso.',
        ],
      },
      { t: 'shot', id: 'lobby-switch-game', caption: 'En la sala de espera, Cambiar de juego cambia el modo y mantiene el código.' },
      { t: 'h2', text: 'Una regla sencilla' },
      { t: 'list', items: ['¿Trabajas significado? Empieza con [[academy.hq.modes.vocabQuiz]].', '¿Ortografía o familias de palabras? [[academy.hq.modes.classic]] o [[academy.hq.modes.wordHunt]].', '¿Alumnos que se bloquean con el reloj? [[academy.hq.modes.wordcraft]].', '¿Bajón de energía después del recreo? [[academy.hq.modes.blast]].'] },
      { t: 'tip', text: 'Cuando tu lista tiene definiciones, la Central del profe marca el juego que mejor encaja con esas palabras, así que basta con seguir la recomendación.' },
    ],
  },
  'run-the-room': {
    title: 'Lleva la sala durante un juego en directo',
    summary: 'Pausa, añade tiempo, termina una ronda, cambia de juego o saca a un jugador, todo desde la barra inferior de tu pantalla.',
    keywords: 'pausa, añadir tiempo, terminar ronda, temporizador, cambiar de juego, quitar alumno, entrada tardía, controles, terminar juego',
    blocks: [
      { t: 'p', text: 'Cuando empieza el juego, tu pantalla se convierte en el marcador de la sala: el código sigue arriba para quien llegue tarde, el reloj está en el centro y la clasificación se actualiza en directo.' },
      {
        t: 'steps',
        items: [
          { title: 'Revisa los ajustes antes de empezar', body: 'La barra inferior de la sala de espera muestra el juego, el tiempo, el tamaño del tablero y si se admite entrar tarde. Pulsa [[education.modePicker.change]] para cambiar de juego; el código es el mismo.', shot: 'lobby-controls' },
          { title: 'Dirige la ronda', body: 'Durante el juego, [[education.liveControls.pause]] congela el reloj para todos, **+30s** da más tiempo y [[education.liveControls.endRound]] termina antes (con dos toques, para que nunca pase sin querer).', shot: 'live-host' },
          { title: 'Gestiona a un jugador', body: 'Abre el contador de jugadores para ver quién juega y quién parece atascado. Puedes sacar a alguien de este juego; no podrá volver a entrar en él.' },
          { title: 'Otra ronda o cierre', body: 'En los resultados, [[education.results.playAgain]] repite con las mismas palabras y el mismo código. [[eduLive.results.switchGame]] elige otro modo. [[eduLive.results.backToClass]] te devuelve a la Central del profe.', shot: 'results' },
        ],
      },
      { t: 'tip', text: 'Salir con «Volver a la clase» pide confirmación, porque terminar el juego cierra la sala para todo el alumnado. Quien esté a mitad de palabra te agradecerá ese segundo toque.' },
      { t: 'pro', text: 'Teacher Pro añade el modo calma: tú decides si el alumnado ve el tiempo, la clasificación en directo y el bonus de velocidad. Útil para alumnado con ansiedad y para exámenes.' },
    ],
  },
  'assign-homework': {
    title: 'Pon deberes que el alumnado juega por su cuenta',
    summary: 'Elige una lista, el tipo de práctica y una fecha de entrega. El alumnado juega desde la página de su clase cuando le venga bien.',
    keywords: 'deberes, tarea, asignar, fecha de entrega, modo práctica, reto de duelo, wordcraft, práctica autónoma',
    blocks: [
      { t: 'p', text: 'Los deberes usan las mismas listas que los juegos en directo. El alumnado los encuentra en la página de su clase, así que no hay nada nuevo que explicar.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre Crear tarea', body: 'En la Central del profe, abre [[teacher.dashboard.tools]] y pulsa [[teacher.assignment.create]]. La primera vez también puedes empezar desde la lista de pasos de la clase.', shot: 'class-tools' },
          { title: 'Elige la lista de palabras', body: 'Elige la lección que practicarán los deberes. Aquí aparece cualquier lista que hayas creado, pegado o guardado desde un paquete inicial.' },
          { title: 'Elige el tipo de práctica', body: '**WordCraft** (recomendado) es juego individual contra un bot amable. [[teacher.assignment.practiceMode]] repasa las palabras y [[teacher.assignment.duelChallenge]] empareja al alumnado.', shot: 'assign-type' },
          { title: 'Decide qué se practica', body: 'Con [[teacher.assignment.practiceMode]] puedes elegir un [[teacher.assignment.focus.label]], como definiciones, sinónimos o pistas de contexto, o dejarlo en [[teacher.assignment.focus.any]]. Una destreza se desbloquea cuando suficientes palabras de la lista tienen ese dato.', shot: 'assign-focus' },
          { title: 'Pon la fecha y asigna', body: 'Elige la [[teacher.assignment.dueDate]] con un toque (hoy, mañana, la semana que viene) o una fecha concreta, añade instrucciones si quieres y pulsa [[teacher.assignment.create]].' },
        ],
      },
      { t: 'tip', text: 'Para ver quién ha terminado, abre [[teacher.dashboard.tools]] y luego [[eduHq.tools.assignments]]. Las tareas aparecen como activas, atrasadas y completadas.' },
      { t: 'pro', text: 'Plan gratuito: {assignments} tareas por clase. Con Teacher Pro son ilimitadas.' },
    ],
  },
};
