import { GOOGLE_LIMITED_USE_CLAUSE, GOOGLE_LIMITED_USE_URL, type PrivacyContent } from './shared';

export const es: PrivacyContent = {
    title: 'Política de Privacidad',
    intro: `Esta Política de Privacidad explica cómo LexiClash —operada por Ohad Fisher, autónomo individual con sede en Israel ("nosotros")— recopila, usa y protege tu información personal cuando usas nuestro juego de palabras multijugador y nuestra plataforma para aulas en lexiclash.live. Este documento no constituye asesoramiento legal.`,
    sections: [
      {
        title: '1. Información que recopilamos',
        content: `Recopilamos los siguientes tipos de información, según cómo uses LexiClash:`,
        items: [
          `Datos de cuenta e inicio de sesión: si inicias sesión con Google o Discord, recibimos de ese proveedor tu nombre, tu dirección de correo electrónico y tu foto de perfil (consulta "Datos de usuario de Google" más abajo para lo que comparte específicamente el inicio de sesión con Google); esto se gestiona a través de Supabase Auth.`,
          `Perfil de jugador: tu nombre visible, tu avatar (emoji, color o una imagen que subas) y tus preferencias de juego.`,
          `Datos de partida: puntuaciones, palabras encontradas, victorias, partidas jugadas, tiempo de juego, logros y posición en las clasificaciones.`,
          `Datos de sesión temporales: el estado actual de la sala o partida, guardado en Redis y eliminado automáticamente, normalmente dentro de la hora siguiente a que termine la partida.`,
          `Datos de aula, si tú o tu centro educativo usáis nuestras herramientas para docentes: nombres de aulas, códigos de acceso, la lista de alumnos de un aula, las lecciones asignadas y los registros de práctica/progreso de cada alumno en esas lecciones. Los alumnos invitados que se unen con un código de aula no proporcionan nombre ni correo: reciben una cuenta anónima.`,
          `Datos opcionales de sincronización con Google Classroom, solo si un docente la conecta: consulta la sección dedicada "Datos de usuario de Google" más abajo.`,
          `Datos de pago: si te suscribes a Pro, nuestro procesador de pagos, Polar, comparte con nosotros el plan de suscripción, su estado y el período de facturación. Nunca recibimos ni almacenamos el número completo de tu tarjeta.`,
          `Mensajes que nos envías: si usas nuestros formularios de contacto o comentarios, guardamos el mensaje y la dirección de correo que nos proporcionaste para poder responderte.`,
          `Datos técnicos y analíticos, solo con tu consentimiento: tipo de dispositivo/navegador, páginas vistas y eventos dentro de la app, recopilados mediante PostHog, Google Analytics y LogRocket, como se describe en "Servicios de terceros" y "Cookies y almacenamiento local". Cuando has iniciado sesión, PostHog y LogRocket también vinculan esos datos a tu cuenta: tu nombre visible, si eres docente/administrador, y estadísticas de juego (nivel, puntuaciones, rachas); PostHog puede recibir además tu dirección de correo para reconocerte entre sesiones.`,
          `Informes de errores y fallos, recopilados automáticamente mediante Sentry para ayudarnos a encontrar y corregir errores. Estos informes incluyen un identificador de cuenta aleatorio y un nombre de usuario, pero nunca tu dirección de correo.`,
        ],
      },
      {
        title: '2. Cómo usamos tu información',
        content: `Usamos la información anterior para:`,
        items: [
          `crear y proteger tu cuenta, y permitirte iniciar sesión`,
          `hacer funcionar el juego —emparejamiento, puntuación y clasificaciones— y mostrar tu perfil y estadísticas a otros jugadores`,
          `operar las funciones de aula: permitir que los docentes creen aulas y lecciones, hagan seguimiento del progreso del alumnado, generen informes y (opcionalmente) sincronicen calificaciones con Google Classroom`,
          `enviarte correos relacionados con el servicio a través de Resend: mensajes de cuenta y bienvenida, respuestas a tus mensajes de contacto o comentarios y, salvo que canceles esa opción, correos ocasionales de reenganche; los recibos de pago los envía Polar, nuestro procesador de pagos`,
          `medir y mejorar LexiClash mediante analítica, solo si has aceptado las cookies de analítica`,
          `detectar y corregir errores automáticamente mediante informes de fallos/errores`,
          `mostrar publicidad fuera de las páginas de aula y educación, solo si has aceptado las cookies de publicidad (o, en apps nativas, de forma acorde con las políticas de anuncios de las tiendas de aplicaciones)`,
          `mantener el juego limpio y hacer cumplir nuestras Condiciones de Servicio`,
        ],
      },
      {
        title: '3. Servicios de terceros',
        content: `Dependemos de los siguientes proveedores para operar LexiClash. Cada uno recibe solo los datos que necesita para cumplir su función:`,
        items: [
          `Supabase — autenticación, base de datos y almacenamiento de archivos`,
          `PostHog — analítica de producto (alojada en la UE), solo con tu consentimiento; cuando has iniciado sesión, incluye tu correo, tu nombre visible y tu rol de docente/administrador`,
          `Google Analytics (GA4) — analítica de uso, solo con tu consentimiento`,
          `Sentry — informes automáticos de fallos y errores`,
          `LogRocket — reproducción de sesiones y registros de errores, solo con tu consentimiento; cuando has iniciado sesión también vincula tu sesión a tu nombre visible y tus estadísticas de juego`,
          `Google AdMob y Google H5 Games Ads en la versión web — publicidad, solo fuera de las páginas de aula/educación y solo con tu consentimiento`,
          `ayeT-Studios — un muro de ofertas opcional para "ganar monedas" en la versión web; nunca se muestra a una cuenta marcada como perteneciente a un menor`,
          `Resend — el envío de los correos descritos arriba en nuestro nombre`,
          `Polar — procesamiento de pagos y Merchant of Record de las suscripciones Pro`,
          `API de Google Classroom — solo si un docente decide conectarla; consulta "Datos de usuario de Google"`,
          `Google y Discord — inicio de sesión mediante OAuth`,
        ],
      },
      {
        title: '4. Publicidad de terceros',
        content: `LexiClash se financia en parte con publicidad fuera del uso educativo y de aula. Nunca mostramos anuncios en páginas de docentes, alumnos, aulas o educación, ni durante una partida multijugador vinculada a un aula.`,
        subsections: [
          {
            title: 'Cómo funciona la publicidad',
            items: [
              `Usamos Google AdMob en nuestra app móvil nativa, y Google H5 Games Ads en la versión web.`,
              `En la app nativa, antes de configurar los anuncios pedimos consentimiento a través del User Messaging Platform de Google donde tu región lo exija (por ejemplo, el EEE y el Reino Unido). Una cuenta identificada como perteneciente a un menor (ver "Aulas, centros educativos y privacidad de menores" más abajo) no ve ningún anuncio allí, y cualquier cuenta que no hayamos confirmado como adulta no ve anuncios intersticiales y recibe anuncios en los modos de Google dirigidos a menores y de edad inferior al consentimiento (TFCD/TFUA), que desactivan la personalización y limitan el contenido publicitario a una clasificación general.`,
              `En la web, las solicitudes de anuncios llevan la señal de Consent Mode v2 de Google correspondiente a tu elección de "Publicidad" en nuestro banner de cookies, que controla si un anuncio puede personalizarse.`,
              `También podemos mostrar un muro de ofertas opcional para "ganar monedas" (ayeT-Studios) en la versión web; nunca se muestra a una cuenta identificada como perteneciente a un menor, ni en páginas de aula/educación.`,
              `Nunca vendemos tu información personal a anunciantes.`,
            ],
          },
          {
            title: 'Tus opciones',
            content: `Puedes controlar la publicidad en LexiClash de las siguientes formas:`,
            items: [
              `cambiar tu elección de cookies de publicidad en cualquier momento desde nuestro banner de cookies`,
              `desactivar la publicidad personalizada en la Configuración de anuncios de Google (https://adssettings.google.com)`,
              `revisar las prácticas de privacidad publicitaria de Google en https://policies.google.com/technologies/ads`,
              `desactivar las cookies publicitarias de otros proveedores participantes en https://www.aboutads.info/choices`,
              `gestionar o eliminar cookies desde la configuración de tu navegador; desactivar las cookies esenciales puede impedir que el sitio funcione correctamente`,
            ],
          },
        ],
      },
      {
        title: '5. Cookies y almacenamiento local',
        content: `Usamos cookies y almacenamiento local en tres categorías, mostradas en nuestro banner de cookies: Esenciales, siempre activas, necesarias para iniciar sesión, la seguridad y recordar preferencias básicas como el tema y el idioma; puede que el sitio no funcione sin ellas. Analítica, usada solo si la aceptas, que activa PostHog, Google Analytics y LogRocket, como se describe arriba. Publicidad, usada solo si la aceptas, que permite a Google mostrar y medir anuncios fuera de las páginas de aula/educación, como se describe arriba. Puedes cambiar tu elección en cualquier momento desde el banner de cookies o la configuración de tu navegador.`,
      },
      {
        title: '6. Datos de usuario de Google',
        content: `Esta sección reúne en un solo lugar todo lo que LexiClash hace con los datos que recibe de las API de Google.`,
        subsections: [
          {
            title: 'Inicio de sesión con Google',
            content: `Cuando inicias sesión en tu propia cuenta de LexiClash con Google, Google comparte con nosotros tu nombre, tu dirección de correo electrónico y tu foto de perfil, para que podamos crear y autenticar tu cuenta, tal y como se describe en "Información que recopilamos" más arriba. No solicitamos ningún acceso a Google Classroom como parte de este inicio de sesión.`,
          },
          {
            title: 'Integración con Google Classroom (opcional, Teacher Pro)',
            content: `Si un docente conecta explícitamente su cuenta de Google para enviar calificaciones a Google Classroom, LexiClash accede únicamente a lo que esa función necesita, y solo mientras el docente la está usando:`,
            items: [
              `Tu lista de cursos de Google Classroom, para que puedas elegir qué clase calificar.`,
              `La lista de alumnos de esa clase: el identificador de usuario de Google Classroom de cada alumno y, para poder emparejarlos con tus alumnos de LexiClash, su dirección de correo escolar.`,
              `La tarea que selecciones o crees, y el estado de entrega de cada alumno para esa tarea.`,
              `Usamos esto únicamente para emparejar a un alumno de LexiClash con su cuenta de Google Classroom por correo electrónico, y para escribir la calificación que decidas enviar (y, si nos lo pides, marcar la tarea como devuelta a ese alumno).`,
              `Los datos de la lista de alumnos (nombres, correos, identificadores de usuario de Google) se mantienen en memoria solo durante la única solicitud que envía las calificaciones; nunca se escriben en nuestra base de datos, no se registran en ningún registro (log) y no se incluyen en nada que se devuelva a tu navegador. En los resultados que ves solo aparecen los nombres de tus propios alumnos de LexiClash.`,
              `Las calificaciones solo pueden escribirse en una tarea de Classroom creada por LexiClash: es una restricción que impone la API de Google, no una elección nuestra.`,
              `Tu token de acceso de Google se almacena únicamente en una cookie cifrada (AES-256-GCM) de tipo httpOnly, vinculada a tu cuenta de LexiClash, y caduca al cabo de aproximadamente una hora. No solicitamos ni almacenamos un token de actualización (refresh token) de Google, por lo que nunca conservamos una credencial de Google de larga duración para tu cuenta.`,
              `Nunca vendemos ni compartimos estos datos, ni los usamos para publicidad ni para entrenar modelos de IA o aprendizaje automático.`,
              `Puedes desconectar LexiClash de tu cuenta de Google en cualquier momento en https://myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Política de Datos de Usuario de los Servicios de API de Google',
            content: `Tal y como exige Google, reproducimos aquí, en su idioma original (inglés), la siguiente declaración: "${GOOGLE_LIMITED_USE_CLAUSE}" Más información: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. Aulas, centros educativos y privacidad de menores',
        content: `Pedimos a todo el mundo que declare su edad. El producto general de LexiClash, financiado con publicidad, además sigue las clasificaciones de edad de nuestras tiendas de aplicaciones (13+); nuestro producto independiente para aulas/docentes está pensado para que lo usen alumnos de cualquier edad escolar, bajo la supervisión de un docente o centro educativo:`,
        items: [
          `A todo el mundo se le pide, mediante una pantalla neutral de una sola vez sin valor predeterminado ni sugerido, que indique un año de nacimiento. En función de esa respuesta autodeclarada (no verificada de forma independiente), tu cuenta se clasifica en una de tres categorías: menor (menos de 13 años), adulto (13 años o más) o desconocida (sin responder), cada una con valores predeterminados distintos para el chat, los mensajes directos, las solicitudes de amistad y la publicidad.`,
          `Una cuenta de categoría menor nunca ve un anuncio ni el muro de ofertas para "ganar monedas", y por defecto tiene restringidos el chat libre, los mensajes directos y las solicitudes de amistad; una cuenta "desconocida" (sin declarar) recibe los mismos valores predeterminados conservadores como medida de precaución.`,
          `Los alumnos invitados que se unen a un aula con un código se saltan por completo el registro de cuenta: no proporcionan nombre, correo ni ningún dato personal, y reciben una cuenta anónima.`,
          `Cuando un docente crea un aula e invita a alumnos, el docente (y su centro) es responsable de obtener el consentimiento parental o de tutela que exija la ley para alumnos menores de 13 años, sobre la misma base de "responsable escolar" que usan habitualmente los proveedores de tecnología educativa. LexiClash no verifica de forma independiente la edad de ningún alumno en ese flujo.`,
          `Nunca vendemos la información personal de ningún usuario, incluida la de un menor, a terceros con fines de marketing.`,
          `Un padre, madre o tutor puede escribirnos a lexiclash.game@gmail.com para revisar, corregir o eliminar la información de su hijo o hija.`,
        ],
      },
      {
        title: '8. Conservación de datos',
        content: `Conservamos la información solo mientras sirva al propósito para el que la recopilamos:`,
        items: [
          `Datos de cuenta, perfil y aula: hasta que tú, o el docente del aula, los elimines, o hasta que elimines tu cuenta.`,
          `Estadísticas de partidas y entradas en las clasificaciones: se conservan para preservar la integridad de las clasificaciones, y se eliminan cuando eliminas tu cuenta y tus registros no quedan bloqueados por un conflicto de integridad de datos (ver la nota sobre eliminación más abajo).`,
          `Estado de sesión/partida en Redis: se elimina automáticamente, normalmente dentro de la hora siguiente a que termine la partida.`,
          `Datos de la lista de alumnos de Google Classroom (nombres, correos, identificadores de usuario): nunca se almacenan; se mantienen en memoria solo durante la única solicitud de sincronización de calificaciones, como se describe en "Datos de usuario de Google".`,
          `Tu token de acceso de Google Classroom: caduca automáticamente al cabo de aproximadamente una hora; nunca almacenamos un token de actualización.`,
          `Datos de analítica y de fallos: se conservan según la política propia de cada proveedor (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Eliminar tu cuenta es inmediato: eliminamos de inmediato tus tokens de notificaciones push y cualquier solicitud de acceso docente vinculada a tu correo, y a continuación eliminamos tu propio inicio de sesión, lo que arrastra la eliminación de tu perfil y de las demás tablas que nuestra base de datos vincula a él. Si algún conflicto de datos llega a bloquear parte de ese proceso, la eliminación devuelve un error en lugar de dejar datos huérfanos en silencio: escríbenos a lexiclash.game@gmail.com y lo completaremos manualmente.`,
        ],
      },
      {
        title: '9. Seguridad de los datos',
        content: `Aplicamos medidas de seguridad conforme a los estándares del sector: todo el tráfico se cifra con HTTPS; la autenticación se realiza mediante los flujos OAuth de Supabase; los registros de tu base de datos se almacenan en la infraestructura cifrada de Supabase; tu token de acceso de Google Classroom se almacena únicamente en una cookie httpOnly cifrada con AES-256-GCM; y el juego multijugador utiliza conexiones WebSocket seguras.`,
      },
      {
        title: '10. Tus derechos',
        content: `Según el lugar donde vivas, puedes tener derecho a:`,
        items: [
          `acceder a los datos personales que tenemos sobre ti, desde tu página de perfil o poniéndote en contacto con nosotros`,
          `corregir o actualizar tu información en cualquier momento`,
          `eliminar tu cuenta y los datos asociados a ella, de forma inmediata, desde la configuración de tu cuenta`,
          `preguntarnos qué datos conservamos y por qué, y oponerte o restringir algunos de sus usos`,
          `recibir una copia de tus datos en un formato portátil, si lo solicitas`,
          `Para ejercer cualquiera de estos derechos, escríbenos a lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Pagos y suscripciones',
        content: `Cuando compras una suscripción Pro, nuestro procesador de pagos, Polar, gestiona la transacción y actúa como Merchant of Record de LexiClash. Recibimos el plan de tu suscripción, su estado y el período de facturación, pero nunca los datos completos de tu tarjeta: estos los gestionan Polar y sus propios procesadores de pago, que también recaudan y liquidan los impuestos aplicables. En el caso de las cuentas de aula/docente, procesamos los datos de los alumnos que nos proporcionas para prestar el servicio, tal y como se describe en esta política y en nuestras Condiciones de Servicio.`,
      },
      {
        title: '12. Usuarios internacionales',
        content: `Tus datos pueden transferirse y almacenarse en países distintos del tuyo, incluidos países con leyes de protección de datos diferentes a las tuyas. Al usar LexiClash, aceptas dicha transferencia.`,
      },
      {
        title: '13. Cambios en esta política',
        content: `Podemos actualizar esta Política de Privacidad de vez en cuando. Publicaremos cualquier cambio en esta página junto con una nueva fecha de entrada en vigor. Si sigues usando LexiClash después de un cambio, se entiende que aceptas la política actualizada.`,
      },
      {
        title: '14. Ley aplicable',
        content: `Esta Política de Privacidad se rige por las leyes del Estado de Israel. Cualquier controversia se resolverá en los tribunales ubicados en Israel.`,
      },
      {
        title: '15. Contacto',
        content: `¿Tienes preguntas sobre esta política o sobre tus datos? Escríbenos a lexiclash.game@gmail.com y te responderemos.`,
      },
    ],
};
