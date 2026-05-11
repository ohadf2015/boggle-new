// Spanish-first article — Ohad Fisher persona
// Native Spanish, NOT translated. TM-safe framing ("el juego clásico de letras" not "Scrabble de Hasbro").
// Non-ES locales fall back + noindex.

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  es: {
    title: 'Alternativas a Scrabble: 4 Juegos de Palabras que Realmente Valen la Pena (2026)',
    subtitle: 'El clásico juego de letras en tablero es bueno, pero no es el único. Aquí están las alternativas modernas que cambiaron mi forma de jugar.',
    category: 'Comparativa',
    readTime: '11 min de lectura',
    authorName: 'Ohad Fisher',
    authorBio: 'Jugador de juegos de palabras desde antes de que existieran las aplicaciones. Tiene opiniones sobre tableros físicos, aplicaciones móviles, y por qué los celulares mataron las cajas de cartón.',
    sections: [
      {
        content: `Voy a ser honesto desde el principio: el juego clásico de letras en tablero — ese con las casillas de doble palabra y los puntos sobre cada ficha — es uno de los mejores juegos de palabras que existen. Lleva más de 75 años en el mercado por una razón.

Pero también es lento. Tarda una hora. Requiere que cuatro personas se sienten alrededor de una mesa al mismo tiempo. Y la aplicación oficial... bueno, hablaremos de la aplicación oficial.

En 2026, hay alternativas. No reemplazos — alternativas. Cosas distintas para momentos distintos. Este artículo es sobre qué probar cuando no tienes una hora, cuando no tienes cuatro personas, o cuando simplemente quieres algo nuevo que rasque el mismo picor.`,
      },
      {
        title: 'Por qué buscar una alternativa',
        content: `La mayoría de las personas que buscan "alternativas a Scrabble" no lo hacen porque odian Scrabble. Lo hacen porque su vida cambió.

Antes tenías domingos largos. Tenías amigos que vivían cerca. Tenías paciencia para esperar 15 minutos a que tu cuñado decidiera entre poner OREJA o JOROBA. Ahora tienes diez minutos en el metro, y un primo que vive en Buenos Aires, y un hijo que solo quiere jugar en el celular.

El problema no es Scrabble. El problema es que el formato — turnos de varios minutos, partidas de una hora, tablero físico — no encaja en muchas vidas modernas. Las alternativas que funcionan son las que adaptaron el corazón del juego (encontrar palabras que valen puntos) a tiempos más cortos, dispositivos más pequeños, y compañeros de juego que están en otros países.

Hay cuatro alternativas que recomiendo. Cada una resuelve un problema distinto. Ninguna reemplaza a Scrabble — todas lo complementan.`,
      },
      {
        title: 'Velocidad pura: el modelo de Boggle (Wheel Rush)',
        content: `Imagínate que en lugar de turnos, todos juegan al mismo tiempo. Imagínate que en lugar de una hora, la partida dura tres minutos. Imagínate que en lugar de una rejilla fija, las letras rotan y cambian. Eso es lo que sucede cuando la velocidad se convierte en el ingrediente principal.

Wheel Rush — el formato moderno de letras giratorias — toma la idea básica de Boggle (encontrar palabras en un conjunto limitado de letras) y le añade movimiento. Las letras giran. Aparecen nuevas. Tienes que decidir rápido si vas a usar la "C" antes de que rote a una "B."

Lo bueno: terminas una partida en tres minutos. Puedes jugar mientras esperas el café. Tu cerebro hace un ejercicio diferente al de Scrabble — no estás planeando, estás escaneando.

Lo malo: no es para todo el mundo. Si te gusta pensar las jugadas, vas a frustrarte. Si tu fuerte es el vocabulario raro de cuatro letras, te va a ir muy bien. Es un juego de reflejos lingüísticos, no de estrategia profunda.

Probé Wheel Rush durante un viaje en autobús de tres horas. Jugué doce partidas. Llegué al destino sintiendo que mi cerebro había hecho ejercicio, en el buen sentido. No es Scrabble. No quiere serlo.`,
      },
      {
        title: 'Caza de palabras objetivo: cuando el caos es demasiado',
        content: `El gran problema de los juegos de cuadrícula libre es la parálisis. Te quedas mirando 16 letras y no se te ocurre nada. Esto le pasa a todos, incluyendo a jugadores experimentados. Es una falla del formato, no de tu cerebro.

La solución son los modos de "caza de palabras objetivo." En lugar de "encuentra cualquier palabra," el juego te dice: "encuentra una palabra de seis letras que empiece con T." Tu cerebro ahora tiene una pista. Está buscando, no escaneando.

LexiClash tiene un modo llamado Daily Survival que escala esto día por día. El Día 1 te da objetivos suaves. El Día 30 te da palabras de ocho letras con la "Z" o la "Ñ." La curva de dificultad es lo que hace que el formato funcione — no te aburres, pero tampoco te abruma.

Para quién es bueno: gente que se frustra con Boggle clásico pero que quiere algo más rápido que Scrabble. El término medio. La caza objetivo te da estructura sin quitarte la libertad de encontrar la respuesta.

Una nota sobre el español: los juegos de caza objetivo bien hechos respetan los acentos. Si te aparece "AVIÓN" como objetivo y escribes "AVION" sin tilde, no debería contar. La aplicación que ignora las tildes es una aplicación que no entendió tu idioma.`,
      },
      {
        title: 'Duelos en línea contra humanos reales',
        content: `Aquí está el secreto sucio de muchas aplicaciones de palabras: el "multijugador" no es multijugador. Es un bot con nombre humano. Te lo confieso: yo jugué seis meses contra "MartaG88" pensando que era una persona en España. Resultó ser un algoritmo que tomaba turnos cuando yo no estaba viendo.

Los duelos en tiempo real son diferentes. Tú y otra persona, los dos conectados ahora, los dos viendo el mismo cronómetro. Cuando termina, termina. No hay turnos abandonados de hace tres días. No hay rivales que "casualmente" siempre juegan tan bien como tú.

Esto es difícil de construir. Necesitas servidores reales. Necesitas matchmaking que no te empareje con un experto cuando empiezas. Necesitas detección de trampas que evite que alguien busque las respuestas en otra pestaña. Por eso muchas aplicaciones simplemente usan bots y mienten al respecto.

Cómo detectar duelos reales: la velocidad del oponente debe ser inconsistente. Los humanos dudan. Los humanos a veces escriben mal y corrigen. Los bots juegan a velocidades sospechosamente uniformes.

Si tienes amigos en otros países que también juegan palabras, los duelos en línea son la forma más natural de mantener la conexión. He jugado partidas con mi primo de Madrid mientras yo estaba en Tel Aviv. No es lo mismo que estar en la misma habitación, pero está más cerca de lo que parecería.`,
      },
      {
        title: 'Connections en español: la categoría como mecánica',
        content: `Esta es la alternativa que menos esperaba que me gustara. No es un juego de deletrear. Es un juego de agrupar.

El formato es simple: 16 palabras en una rejilla. Tienes que agruparlas en cuatro grupos de cuatro, donde cada grupo comparte un tema. "Cosas que vuelan." "Tipos de café." "Palabras que riman con SOL." Las palabras a veces engañan — una "araña" puede ser un insecto o un tipo de tijera para podar.

El placer aquí no es el vocabulario bruto. Es el momento "ah" cuando descubres por qué ESCALERA y AVENIDA y CALLEJÓN y PARQUE estaban juntas (todas son sitios donde puedes caminar). La satisfacción es cognitiva, no lingüística.

Para quien le gusta: la gente que disfruta crucigramas pero los encuentra demasiado largos. La gente que quiere un juego que dure cinco minutos y deje pensando. Familias que quieren algo donde el niño de 12 años puede competir con la abuela de 70.

En español, este formato es particularmente bueno porque el idioma tiene muchas palabras polisémicas — palabras que cambian de significado según el contexto. "Banco" puede ser asiento o institución financiera. "Llama" puede ser fuego o animal andino. Estas ambigüedades hacen que los rompecabezas en español sean naturalmente más ricos que en algunos otros idiomas.`,
      },
      {
        title: 'Lo que las aplicaciones honestas tienen en común',
        content: `Después de probar más de veinte aplicaciones de palabras en español, identifiqué cinco señales que indican que una aplicación respeta a sus jugadores.

Primero: no hay sistema de energía. Puedes jugar tantas partidas como quieras. Si la aplicación te dice "espera 4 horas para tu próxima partida," cierra y desinstala. Eso es un casino, no un juego.

Segundo: los acentos importan. Cuando escribes una palabra correctamente acentuada, el juego la reconoce. Cuando escribes una sin acento, te corrige amablemente o no la acepta. Las aplicaciones que tratan "AVION" y "AVIÓN" como la misma cosa no entendieron tu idioma.

Tercero: no se venden "ayudas" que rompen el juego. Si puedes pagar para ver la mejor jugada, el juego se está vendiendo a sí mismo en pedazos. Esto suele indicar que el equipo de diseño no creía en el juego original.

Cuarto: hay un modo diario. Una partida nueva cada día, la misma para todos. Esto es señal de que el equipo confía en que su juego es lo suficientemente interesante para que vuelvas.

Quinto: funciona en navegador sin instalar. Las aplicaciones que solo viven en las tiendas de apps son más fáciles de monetizar abusivamente. Las que funcionan en navegador suelen tener modelos de negocio más limpios.

Cinco preguntas. Dos minutos por aplicación. Vas a filtrar el 80% de la basura.`,
      },
      {
        title: 'Entonces, ¿cuál elegir?',
        content: `No te voy a dar una respuesta única porque sería deshonesto. Cada una de las cuatro alternativas resuelve un problema distinto.

Si tienes prisa y quieres ejercicio mental rápido: Wheel Rush u otro juego de velocidad.
Si te paralizas frente a tableros aleatorios pero quieres algo más rápido que Scrabble: caza de palabras objetivo.
Si tienes amigos lejanos y quieres mantener la conexión: duelos en línea contra humanos reales.
Si te gustan los crucigramas pero te parecen demasiado largos: el formato de agrupación tipo Connections.

Mi recomendación práctica: prueba el modo diario de una de estas alternativas durante una semana. Si te engancha, encontraste algo. Si no, no perdiste más que cinco minutos al día por siete días.

El clásico juego de letras seguirá ahí cuando lo quieras. Las alternativas no están aquí para reemplazarlo. Están aquí para los momentos en que Scrabble no encaja — y esos momentos, en 2026, son la mayoría de tus momentos.`,
      },
    ],
    backToBlog: 'Volver al Blog',
    playDaily: 'Prueba el Reto Diario',
    startPracticing: 'Juega Multijugador',
  },
};
