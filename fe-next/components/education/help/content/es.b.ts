import type { HelpLocaleContent } from '../helpTypes';

export const esB: HelpLocaleContent = {
  'read-class-reports': {
    title: 'Lee el informe de tu clase',
    summary: 'Una página por clase: quién ha hecho los deberes, quién avanza o se atasca, cómo fue el último juego y qué palabras repasar.',
    keywords: 'informes, progreso, analítica, resultados, csv, exportar, pdf, imprimir, dominio de palabras, alumnado con dificultades, notas',
    blocks: [
      { t: 'p', text: 'Abre [[teacher.nav.reports]] en la Central del profe y elige una clase. Cada juego y cada tarea completada alimentan esta página, así que se rellena sola mientras das clase.' },
      { t: 'shot', id: 'reports-class', caption: 'Un informe de clase. Cada sección se abre con un toque.' },
      { t: 'h2', text: 'Qué te cuenta cada sección' },
      {
        t: 'list',
        items: [
          '[[eduPro.reports.assignmentsTitle]]: quién ha terminado cada tarea, con exportación a CSV para tu cuaderno de notas.',
          '[[eduPro.reports.arcTitle]]: quién avanza, quién se atasca y qué palabras le frenan. Toca un nombre para abrir la página de ese alumno.',
          '[[teacher.lastGame.title]]: qué pasó en tu último juego en directo, de un vistazo.',
          '[[teacher.reports.sections.wordMastery]] (Pro): las palabras que la clase sigue fallando, en todos los juegos. Se completa tras una ronda de [[academy.hq.modes.vocabQuiz]] o [[academy.hq.modes.wordcraft]].',
          '[[eduPro.reports.moreDetail]] (Pro): un informe listo para imprimir con detalle por alumno, exportación de todas tus clases y envío de notas a Google Classroom.',
        ],
      },
      { t: 'tip', text: 'Cinco segundos antes del timbre: abre el informe, mira quién está atascado y las palabras más difíciles, y ya sabes cuál será el calentamiento de mañana.' },
      { t: 'pro', text: 'Con el plan gratuito tienes las secciones de tareas, alumnado y último juego. El dominio de palabras y el informe imprimible completo son de Teacher Pro, que puedes probar gratis durante {trialDays} días.' },
    ],
  },
  'after-the-game': {
    title: 'Lee la pantalla de resultados tras un juego',
    summary: 'La pantalla de resultados muestra el podio, qué palabras de la lección encontró la clase y cuáles se le escaparon, y tu siguiente paso.',
    keywords: 'resultados, podio, después del juego, palabras de la lección, palabras falladas, jugar otra vez, ganador, clasificación',
    blocks: [
      { t: 'p', text: 'Cuando termina una ronda, la pizarra pasa a los resultados. Déjalos un momento: al alumnado le encanta ver el podio, y tú te haces una idea rápida de las palabras.' },
      { t: 'shot', id: 'results', caption: 'Resultados tras una ronda de práctica. Con alumnado en la sala, el podio aparece al lado.' },
      {
        t: 'list',
        items: [
          '**El podio**: los mejores jugadores de la ronda y sus puntos.',
          '**Palabras de la lección encontradas**: cuántas palabras de la lista encontró la clase y cuáles no encontró nadie. Esas son las que toca repasar.',
          '[[education.results.playAgain]]: mismas palabras, mismo código, nadie vuelve a unirse. Perfecto si la primera ronda fue de calentamiento.',
          '[[eduLive.results.switchGame]]: mantén la sala y las palabras y prueba otro modo.',
          '[[eduLive.results.backToClass]]: cierra la sala y vuelve a la Central del profe.',
        ],
      },
      { t: 'tip', text: 'Las palabras que nadie encontró en un juego en directo son una lista estupenda para deberes. Mira [cómo repasar las palabras falladas](help:reteach-missed-words).' },
      { t: 'pro', text: 'Con Teacher Pro, la pantalla de resultados abre el informe completo de ese juego.' },
    ],
  },
  'make-a-word-list': {
    title: 'Crea una lista de palabras (con definiciones)',
    summary: 'Pega tus palabras, añade significados si quieres modos de test y guarda. Una lista sirve para juegos en directo y para deberes.',
    keywords: 'lista de palabras, lección, vocabulario, crear lista, definiciones, csv, importar, pegar, ia, sinónimos, ejemplos',
    blocks: [
      { t: 'p', text: 'Una lista de palabras (también llamada lección) son las palabras que usa un juego o una tarea. Puedes pegar una en diez segundos o crear una más completa que desbloquea más tipos de práctica.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre tus listas', body: 'Ve a [[teacher.nav.lessons]], cambia a [[eduLibrary.tabs.mine]] y pulsa [[eduLibrary.editor.newList]].' },
          { title: 'Pega o escribe las palabras', body: 'Sepáralas con comas o pon una por línea. Escribe **palabra - significado** para añadir la definición sobre la marcha. También puedes importar un archivo CSV o TSV, o partir de un paquete inicial.', shot: 'word-list-editor' },
          { title: 'Completa los detalles', body: 'Cambia a [[eduLibrary.editor.view.details]] para añadir significados, sinónimos, antónimos y frases de ejemplo. El botón de IA puede sugerir lo que falta; revísalo antes de guardar.' },
          { title: 'Guarda y úsala', body: 'Pulsa [[eduLibrary.editor.save]]. La lista aparece bajo los pósteres de la Central del profe y en el selector de deberes.' },
        ],
      },
      { t: 'tip', text: '¿Con prisa? En la Central del profe, pulsa [[teacher.playNow.changeWords]], luego [[teacher.playNow.sourcePaste]], y pega las palabras directamente. LexiClash las guarda como lista por ti.' },
      { t: 'shot', id: 'hq-paste-words', caption: 'Palabras pegadas directamente en la Central del profe.' },
      { t: 'h2', text: 'Por qué merecen la pena las definiciones' },
      { t: 'p', text: 'Las palabras con significado desbloquean [[academy.hq.modes.vocabQuiz]] y los deberes de definiciones. Añade sinónimos, antónimos, frases de ejemplo o partes de la palabra a cuatro o más palabras y también se desbloquean esas destrezas en los deberes.' },
      { t: 'tip', text: 'Las palabras muy largas se siguen en los informes, pero no siempre caben en un tablero de letras. El editor marca cada palabra como apta para los juegos o solo de seguimiento.' },
    ],
  },
  'use-the-library': {
    title: 'Encuentra listas hechas en la Biblioteca',
    summary: '¿Sin tiempo para escribir? Explora listas verificadas por idioma y tema, abre una y juégala en directo en segundos.',
    keywords: 'biblioteca, descubrir, listas hechas, plantillas, listas verificadas, paquetes iniciales, temas, otros docentes',
    blocks: [
      { t: 'p', text: 'La [[teacher.nav.lessons]] tiene dos pestañas: [[eduLibrary.tabs.discover]] para listas de LexiClash y de otros docentes, y [[eduLibrary.tabs.mine]] para las tuyas.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre Descubrir', body: 'Ve a [[teacher.nav.lessons]] y quédate en [[eduLibrary.tabs.discover]].', shot: 'library-discover' },
          { title: 'Afina la búsqueda', body: 'Busca un tema o una palabra y filtra por idioma. Elige [[eduLibrary.badge.verified]] para ver solo las listas revisadas por el equipo de LexiClash.' },
          { title: 'Abre una lista y juega', body: 'Toca una tarjeta para ver todas las palabras y sus significados. Después pulsa [[eduLibrary.preview.host]] para jugarla ya, [[eduLibrary.preview.assign]] para ponerla de deberes o [[eduLibrary.preview.copy]] para editar tu propia versión.' },
        ],
      },
      { t: 'tip', text: 'Los paquetes iniciales también están a un toque en la Central del profe: pulsa [[teacher.playNow.changeWords]] y abre [[teacher.playNow.sourcePacks]].' },
      { t: 'p', text: 'Tus listas son privadas salvo que actives [[eduLibrary.share.toggle]] al guardar. En las listas compartidas solo aparece tu nombre visible.' },
    ],
  },
  'student-privacy': {
    title: 'Privacidad del alumnado: qué comparte',
    summary: 'El alumnado entra con un código y un nombre. Sin cuenta, sin email y sin anuncios en el juego de clase. Esto es exactamente lo que se guarda y quién lo ve.',
    keywords: 'privacidad, rgpd, coppa, datos, datos del alumnado, seguridad, anuncios, cuentas, borrar, familias, nombres',
    blocks: [
      { t: 'p', text: 'LexiClash está pensada para que una clase pueda jugar sin recoger datos personales del alumnado. Es una decisión de diseño, no un ajuste que tengas que buscar.' },
      {
        t: 'list',
        items: [
          '**Sin cuentas para el alumnado.** Escriben el código de la clase y eligen un nombre. Al unirse no se pide email, contraseña ni fecha de nacimiento.',
          '**El nombre lo eligen ellos.** Basta con el nombre de pila o un apodo de clase. Tú lo ves en la lista; sus compañeros, en la clasificación.',
          '**Los resultados se quedan en tu clase.** Puntos y respuestas se guardan en la clase para que sigas el progreso de cada alumno.',
          '**Sin anuncios en el juego de clase.** La página para unirse, los juegos de clase, las páginas del alumnado y la Central del profe no muestran anuncios.',
          '**Privacidad infantil.** Nuestra política de privacidad se compromete con la COPPA y normas similares, y LexiClash nunca vende datos personales.',
        ],
      },
      { t: 'h2', text: 'Borrar datos' },
      { t: 'p', text: 'Puedes borrar una clase desde el menú **⋯** de su tarjeta en [[teacher.nav.classes]]. Las familias o tutores pueden pedir revisar o borrar la información de un menor escribiendo a lexiclash.game@gmail.com.' },
      { t: 'tip', text: 'Lee la [política de privacidad](app:/legal/privacy) completa antes de extender LexiClash a todo el centro. Tu delegado de protección de datos querrá el enlace.' },
    ],
  },
  'support-core-challenge': {
    title: 'Atiende a niveles con Apoyo, Base y Reto',
    summary: 'Asigna un nivel a cada alumno. Apoyo muestra un banco de palabras en directo; Reto exige palabras más difíciles y un objetivo de palabras largas.',
    keywords: 'atención a la diversidad, niveles, apoyo, nee, adaptación curricular, reto, altas capacidades, grupos heterogéneos, banco de palabras',
    blocks: [
      { t: 'p', text: 'Todo el alumnado empieza en Base. Cámbialo para quien necesite más ayuda o más reto; el nivel le acompaña en los juegos en directo y en los deberes.' },
      {
        t: 'steps',
        items: [
          { title: 'Abre la lista de alumnos', body: 'En [[teacher.nav.classes]], abre la lista de alumnos de la tarjeta de la clase.' },
          { title: 'Elige el nivel', body: 'Junto a cada nombre, elige [[teacher.levels.support]], [[teacher.levels.core]] o [[teacher.levels.challenge]]. Se guarda al momento.' },
          { title: 'Etiqueta las palabras (opcional)', body: 'En tu lista, cada palabra puede marcarse como Apoyo, Base o Reto, para que cada grupo practique las palabras pensadas para él.' },
        ],
      },
      {
        t: 'list',
        items: [
          '[[teacher.levels.support]]: ve un banco de palabras durante los juegos en directo y practica las palabras de apoyo y base.',
          '[[teacher.levels.core]]: el nivel por defecto.',
          '[[teacher.levels.challenge]]: practica todas las palabras, incluidas las de reto, y tiene un objetivo de palabras más largas.',
        ],
      },
      { t: 'tip', text: 'Puedes cambiar los niveles cuando quieras, por ejemplo cuando un informe muestre que alguien está listo para subir.' },
    ],
  },
  'teacher-pro-and-trial': {
    title: 'Qué añade Teacher Pro (y la prueba gratis)',
    summary: 'El plan gratuito sirve para clases reales. Pro es para más grupos e informes más profundos. {price}/mes, con {trialDays} días de prueba gratis.',
    keywords: 'pro, precio, coste, mejorar plan, prueba, plan gratuito, límites, de pago, suscripción, cuánto cuesta',
    blocks: [
      { t: 'p', text: 'La mayoría de docentes empieza gratis y sigue así semanas. Solo necesitas Pro cuando los límites gratuitos se quedan cortos o cuando quieres ver exactamente quién se atasca en qué palabra.' },
      {
        t: 'list',
        items: [
          '**Gratis, para siempre**: {classes} clases de hasta {students} alumnos, juegos en directo con hasta {players} jugadores, listas de palabras, deberes ({assignments} por clase) y el informe básico de clase.',
          '**Teacher Pro**: clases, alumnado y deberes ilimitados, informes de dominio de palabras, el informe imprimible completo, repaso espaciado de palabras falladas, modo calma y enlaces de informe para las familias.',
          '**Alumnado**: siempre gratis, en los dos planes y sin anuncios.',
        ],
      },
      {
        t: 'steps',
        items: [
          { title: 'Abre la página de planes', body: 'Pulsa el botón [[academy.hq.proChip]] en la Central del profe, o abre [Teacher Pro](app:/teacher/upgrade).' },
          { title: 'Empieza la prueba', body: 'Pulsa **Prueba gratis {trialDays} días**. Tienes todas las funciones Pro al momento.' },
          { title: 'Decide antes de que acabe', body: 'Si sigues, pasa a {price}/mes. Si cancelas antes del día {trialDays}, no se te cobra nada. Una prueba gratis por cuenta.' },
        ],
      },
      { t: 'tip', text: 'Los precios están en dólares estadounidenses. Según dónde vivas, pueden añadirse impuestos al pagar.' },
    ],
  },
  'cancel-or-change-plan': {
    title: 'Cancela o gestiona tu suscripción',
    summary: 'Cancela en unos clics. Pro sigue activo hasta el final del periodo que pagaste, y no se borra nada de tus clases.',
    keywords: 'cancelar, reembolso, pagos, factura, tarjeta, bajar de plan, gestionar suscripción, dejar de pagar',
    blocks: [
      {
        t: 'steps',
        items: [
          { title: 'Abre la página de planes', body: 'Abre [Teacher Pro](app:/teacher/upgrade) con tu sesión iniciada.' },
          { title: 'Abre los pagos', body: 'Pulsa **Gestionar pagos**. Se abre la página de pagos de nuestro proveedor, donde puedes cambiar la tarjeta, ver facturas o cancelar.' },
          { title: 'Cancela', body: 'Confirma la cancelación. Pro sigue activo hasta el final del periodo que ya pagaste.' },
        ],
      },
      { t: 'h2', text: '¿Qué pasa con mis clases?' },
      { t: 'p', text: 'No se borra nada. Tus clases, listas e historial del alumnado se quedan. Vuelven los límites gratuitos ({classes} clases, {students} alumnos por clase) y los informes Pro se bloquean hasta que vuelvas.' },
      { t: 'tip', text: 'Recibes un email de aviso antes de cada cobro, así que una renovación nunca te pilla por sorpresa. Los detalles están en la [política de reembolso y cancelación](app:/legal/refund).' },
    ],
  },
  'school-pays': {
    title: 'Que tu centro pague Pro',
    summary: 'Pídeselo a tu centro con una solicitud ya escrita, o recibe por email un presupuesto para todo el equipo. Sin llamadas comerciales.',
    keywords: 'centro, colegio, instituto, orden de compra, presupuesto, departamento, dirección, factura, reembolso',
    blocks: [
      { t: 'p', text: 'Muchos docentes prefieren no pagar de su bolsillo. Dos maneras de pasar la factura al centro:' },
      {
        t: 'steps',
        items: [
          { title: 'Envía a dirección una solicitud ya escrita', body: 'En [Teacher Pro](app:/teacher/upgrade), pulsa **¿Quieres que pague tu centro?** Se prepara una solicitud breve que puedes enviar a quien gestiona el presupuesto.' },
          { title: 'O pide un presupuesto para el equipo', body: 'Abre la pestaña **Para centros** y pulsa **Pedir presupuesto para el centro**. Dinos cuántos docentes necesitan Pro; con el número basta.' },
          { title: 'Recibe el presupuesto por email', body: 'Respondemos con un presupuesto al email que nos des. Nadie te llama para darte una cifra.' },
        ],
      },
      { t: 'p', text: '¿Vas a llevar LexiClash a todo un centro o a una red de centros? La [página para centros](app:/education/for-schools) explica qué incluye y cómo contactar.' },
    ],
  },
};
