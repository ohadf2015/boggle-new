// Script to patch es.js with missing translations
const fs = require('fs');

const esMod = require('./es.js');
const es = esMod.es || esMod;

// All 609 missing translations
const patch = {
  common: {
    email: "Correo"
  },
  leadChange: {
    tookLead: "¡Vas a la cabeza!",
    lostLead: "¡{{username}} tomó la delantera!"
  },
  tvResults: {
    spotlight: {
      heading: "Reflectores",
      mascotIntro1: "¡Veamos qué tipo de jugadores tenemos!",
      mascotIntro2: "Cada jugador tiene su historia. ¡Aquí va la tuya!",
      mascotIntro3: "¡Hora de conocer al elenco!",
      mascotIntro4: "¿Quién jugó cómo? ¡Descúbrelo!",
      mascotIntro5: "¡Los reflectores son para TI!",
      andMore: "y {count} jugador más",
      andMorePlural: "y {count} jugadores más",
      archetypes: {
        "the-ghost": {
          title: "EL FANTASMA",
          stat: "hallazgos únicos",
          quip1: "Encontró palabras que ni existen en las pesadillas de los demás.",
          quip2: "Opera en una dimensión que solo puede ver.",
          quip3: "Invisible para la competencia. Letal en el marcador.",
          quip4: "Si una palabra cae en la grilla y solo un jugador la encuentra... ¿existía?"
        },
        "the-sniper": {
          title: "EL FRANCOTIRADOR",
          stat: "precisión",
          quip1: "Los demás adivinan. Este SABE.",
          quip2: "No falla. No duda. No manda basura.",
          quip3: "Cada palabra en el blanco. Cada tecla con intención.",
          quip4: "Precisión quirúrgica. Cero movimientos de más."
        },
        "the-philosopher": {
          title: "EL FILÓSOFO",
          stat: "largo promedio",
          quip1: "¿Para qué usar palabras cortas si las largas molan más?",
          quip2: "El jugador pensante. Palabras grandes, cerebro grande.",
          quip3: "Mientras otros escribían 'sol', este escribía 'solsticio'.",
          quip4: "Calidad sobre cantidad. Siempre."
        },
        "the-one-hit-wonder": {
          title: "EL EXITAZO ÚNICO",
          stat: "mejor palabra",
          quip1: "Una palabra para gobernarlas a todas.",
          quip2: "Vino por una palabra. La hizo contar.",
          quip3: "A veces solo necesitas un tiro perfecto.",
          quip4: "Pocas palabras, pero qué palabrota."
        },
        "the-silent-assassin": {
          title: "EL ASESINO SILENCIOSO",
          stat: "pts/palabra",
          quip1: "Pocas palabras, daño máximo.",
          quip2: "Callado pero letal. El marcador lo dice todo.",
          quip3: "Economía de movimiento. Cada palabra un golpe preciso.",
          quip4: "Habla bajito, carga un vocabulario masivo."
        },
        "the-sleeping-giant": {
          title: "EL GIGANTE DORMIDO",
          stat: "pts 2da mitad",
          quip1: "Empezó echándose una siesta, luego despertó y eligió la violencia.",
          quip2: "¿Arranque lento? No. Paciencia estratégica.",
          quip3: "La remontada que nadie vio venir.",
          quip4: "Como un cohete... solo necesitaba más cuenta regresiva."
        },
        "the-frontrunner": {
          title: "EL PUNTERO",
          stat: "pts 1ra mitad",
          quip1: "Salió pegando y nunca miró atrás.",
          quip2: "Arrancó sprint mientras los demás calentaban.",
          quip3: "Primero en atacar la grilla. Primero en dominar.",
          quip4: "Marcó el ritmo. Los demás corrieron detrás."
        },
        "the-speed-runner": {
          title: "EL VELOCISTA",
          stat: "PPM",
          quip1: "Dedos más rápidos de lo que el ojo puede seguir.",
          quip2: "Ráfagas cortas. Resultados devastadores.",
          quip3: "Escribiendo a la velocidad del pensamiento.",
          quip4: "Palabras rápidas, victorias rápidas."
        },
        "the-machine-gun": {
          title: "LA AMETRALLADORA",
          stat: "total palabras",
          quip1: "La cantidad es una cualidad. Pregúntale a esta leyenda.",
          quip2: "Más palabras que un diccionario. Producción imparable.",
          quip3: "La grilla no tuvo chance contra este volumen.",
          quip4: "Brrrrrt. Ese es el sonido de las palabras siendo enviadas."
        },
        "the-metronome": {
          title: "EL METRÓNOMO",
          stat: "ritmo",
          quip1: "Tic. Palabra. Tac. Palabra. Como relojito.",
          quip2: "La consistencia es el arma secreta que nadie menciona.",
          quip3: "Un ritmo tan estable que podrías poner tu reloj.",
          quip4: "Sin prisa. Sin pánico. Producción pura y constante."
        },
        "the-wildcard": {
          title: "EL COMODÍN",
          stat: "variedad de largo",
          quip1: "Palabras cortas, largas, medianas — TODAS las palabras.",
          quip2: "Impredecible. Inclasificable. Imparable.",
          quip3: "La única estrategia es no tener estrategia.",
          quip4: "Todólogo de longitudes, maestro de la confusión."
        },
        "the-marathon-runner": {
          title: "EL MARATONISTA",
          stat: "cobertura",
          quip1: "Primero en empezar, último en parar. Campeón de resistencia.",
          quip2: "Seguía mientras los demás descansaban.",
          quip3: "Del primer segundo al último. Nunca paró.",
          quip4: "La tortuga que también resultó ser liebre."
        },
        "the-combo-master": {
          title: "EL MAESTRO DEL COMBO",
          stat: "combo máx",
          quip1: "¡C-C-C-COMBO BREAKER! Digo, combo BUILDER.",
          quip2: "Encadenó palabras como máquina.",
          quip3: "Cuando estás en racha, ¿para qué parar?",
          quip4: "Nivel de combo: legendario. Oponentes: temblando."
        },
        "the-fire-walker": {
          title: "EL CAMINANTE DEL FUEGO",
          stat: "bonus de fuego",
          quip1: "Rinde más cuando la cosa se pone caliente. Literal.",
          quip2: "¿Ronda de fuego? Más bien SU ronda.",
          quip3: "Algunos temen al fuego. Este baila en él.",
          quip4: "Manos calientes, puntajes más calientes."
        },
        "the-social-butterfly": {
          title: "LA MARIPOSA SOCIAL",
          stat: "picks populares",
          quip1: "Las grandes mentes piensan igual — y esta piensa como todos.",
          quip2: "Encontró todas las palabras que los demás encontraron, más la vibra.",
          quip3: "¿Palabras populares? Este jugador tiene las favoritas del público.",
          quip4: "Siempre en la misma onda que el grupo."
        },
        "the-underdog": {
          title: "EL DESVALIDO",
          stat: "precisión",
          quip1: "Abajo en el ranking, arriba en precisión. Respeto.",
          quip2: "El puntaje no cuenta toda la historia.",
          quip3: "No fue primero, pero definitivamente primero en corazón.",
          quip4: "Prueba de que el ranking no lo es todo."
        },
        "the-participant": {
          title: "EL PARTICIPANTE",
          stat: "palabras",
          quip1: "No todo héroe usa capa. Algunos solo envían palabras.",
          quip2: "Se presentó. Jugó. Eso es lo que cuenta.",
          quip3: "Un jugador de misterio. Una leyenda en formación.",
          quip4: "El viaje de mil palabras empieza con una."
        }
      }
    }
  },
  playerView: {
    readyUp: "¡Prepararse!",
    readyConfirmed: "¡Listo!",
    editName: "Cambiar nombre"
  },
  onboarding: {
    welcome: {
      watchMe: "¡Mira esto!",
      yourTurn: "¡Tu turno! Deletrea:"
    },
    profile: {
      deferredTitle: "¿Guardar tu progreso?",
      deferredSubtitle: "¡Arma tu perfil para conservar tus stats!"
    }
  },
  results: {
    sessionStats: {
      title: "Momentos de la Sesión",
      improved: "¡Mejoraste {percent}% desde la ronda 1!",
      consistent: "¡Top 3 en {count} rondas!",
      comeback: "¡Subiste {positions} posiciones!",
      rivalry: "¡Solo {diff} pts de diferencia!",
      bigRound: "¡{score} pts en la ronda {round}!"
    },
    series: {
      title: "Tabla de la Sesión",
      gameCount: "Juego {count}",
      round: "R{num}"
    }
  },
  tutorial: {
    multiDirection: "¡Desliza en cualquier dirección! Las palabras pueden zigzaguear por la grilla."
  },
  achievements: {
    duelWinner: {
      name: "Ganador de Duelos",
      description: "Gana duelos contra oponentes"
    },
    practiceMaster: {
      name: "Maestro de Práctica",
      description: "Domina todos los modos de práctica"
    },
    streakLegend: {
      name: "Leyenda de Racha",
      description: "Mantén una racha impresionante"
    },
    secretWord: {
      name: "Palabra Secreta",
      description: "Descubre una palabra secreta"
    }
  },
  auth: {
    magicLink: {
      noPassword: "Sin contraseña necesaria"
    },
    trustBadge: "Seguro y privado"
  },
  daily: {
    bonusChallenge: "Desafío Bonus",
    continueMissions: "Continúa tus misiones diarias"
  },
  buzz: {
    error: {
      loading: "Cargando el buzz de hoy...",
      failed: "No pudimos cargar el buzz. ¿Reintentar?",
      noInternet: "Sin conexión. Revisa tu internet."
    }
  },
  wordHunt: {
    mp: {
      players: "Jugadores",
      eliminated: "Eliminado",
      youEliminated: "¡Te eliminaron!"
    },
    facts: {
      title: "Datos Curiosos",
      firstTry: "¡A la primera! Solo {solveRate}% lo logra al primer intento.",
      speedSolver: "Listo en {seconds}s. Tu cerebro ni sudó.",
      topPerformer: "¡Top {percentile}%! Superaste a {others} jugadores.",
      eliteClub: "Solo {solveRate}% resolvió hoy. Estás en la élite.",
      efficiencyMachine: "Eficiencia de {score}. Precisión de cirujano.",
      letterDetective: "El primer intento acertó {correct}/{total} letras.",
      streakLegend: "¡{days} días de racha! Más confiable que el amanecer.",
      closeCall: "¡Resolviste con {life} vida! Viviendo al límite.",
      lifeSaver: "{life} vida restante. Podrías haber jugado con los ojos cerrados.",
      wordExplorer: "¡{count} palabras encontradas! Mapeaste toda la grilla.",
      fewerGuesses: "{attempts} vs promedio {avg}. ¡Eficiente!",
      palindrome: "¡Un palíndromo! Igual al derecho y al revés.",
      rareLetter: "¿Una palabra con '{letter}'? Letras raras, habilidad más rara.",
      longWord: "¿Objetivo de {length} letras? Eso sí es un reto."
    },
    results: {
      survivors: "Sobrevivientes",
      eliminated: "Eliminados"
    }
  },
  accessibility: {
    skipToMain: "Saltar al contenido principal"
  },
  adventure: {
    bosses: {
      mechanicProgress: "Progreso de mecánica",
      phases: {
        phase1: "FASE 1",
        phase2: "FASE 2"
      },
      telegraph: {
        incoming: "¡Ataque entrante!",
        warning: "¡Cuidado!",
        prepare: "¡Prepárate!",
        progress: "Ataque cargando"
      },
      cinematics: {
        skip: "Saltar",
        skipIn: "Saltar en {seconds}...",
        progress: "Progreso cinemática",
        loading: "Cargando...",
        victory: "¡Victoria!",
        defeated: "¡{bossName} derrotado!",
        bossApproaches: "Un retador se acerca...",
        prepareForBattle: "¡Prepárate para la batalla!",
        errorTitle: "Error de Video",
        errorDescription: "Algo falló al reproducir la cinemática. Puedes reintentar o saltar para continuar.",
        errorTapToSkip: "Toca Saltar para continuar",
        errorPressEscToSkip: "La cinemática falló. Presiona ESC o espera para saltar.",
        retry: "Reintentar",
        fallbackTitle: {
          victory: "¡VICTORIA!",
          defeat: "¡Se acabó el tiempo!",
          bossEntrance: "¡Se acerca el Jefe!",
          bossDefeat: "¡Jefe Derrotado!",
          worldUnlock: "¡Mundo Desbloqueado!"
        },
        fallbackStats: {
          score: "Puntaje",
          wordsFound: "Palabras Encontradas"
        }
      },
      abilities: {
        popQuiz: { name: "Examen Sorpresa", desc: "¡Usa palabras de 5+ letras!" },
        redPen: { name: "Lápiz Rojo", desc: "¡Algunas fichas están bloqueadas!" },
        detention: { name: "Detención", desc: "¡Perdiste 5 segundos!" },
        beeSwarm: { name: "Enjambre", desc: "¡Aparecieron fichas pegajosas!" },
        spellingSting: { name: "Pinchazo Ortográfico", desc: "¡Las letras cambiaron!" },
        synonymShuffle: { name: "Barajeo de Sinónimos", desc: "¡Fila revuelta!" },
        verboseCurse: { name: "Maldición Verbosa", desc: "¡Necesitas palabras de 6+ letras!" },
        etymologyLock: { name: "Candado Etimológico", desc: "¡Columna bloqueada!" },
        islandLock: { name: "Bloqueo Isleño", desc: "¡Fichas aisladas!" },
        figurativeStorm: { name: "Tormenta Figurativa", desc: "¡Tablero revuelto!" },
        assemblyLine: { name: "Línea de Ensamblaje", desc: "¡Fila cambiada!" },
        constructionZone: { name: "Zona de Construcción", desc: "¡Diagonal bloqueada!" },
        puzzleScramble: { name: "Revoltijo de Puzzle", desc: "¡Fichas barajadas!" },
        anagramCurse: { name: "Maldición Anagrama", desc: "¡Encuentra anagramas!" },
        puzzleChaos: { name: "Caos de Puzzle", desc: "¡Caos total!" },
        mirrorFlip: { name: "Espejo Invertido", desc: "¡Filas volteadas!" },
        palindromePower: { name: "Poder Palíndromo", desc: "¡Encuentra palíndromos!" },
        starScatter: { name: "Lluvia de Estrellas", desc: "¡Letras raras aparecieron!" },
        novaBurst: { name: "Estallido Nova", desc: "¡Explosión cósmica!" },
        babelCurse: { name: "Maldición de Babel", desc: "¡Letras confundidas!" },
        polyglotLock: { name: "Candado Políglota", desc: "¡Fichas selladas!" },
        wordFlame: { name: "Llama de Palabras", desc: "¡Letras ardiendo!" },
        lexiconStorm: { name: "Tormenta de Léxico", desc: "¡Palabras dispersas!" },
        ultimateWord: { name: "Palabra Definitiva", desc: "¡Desafío final!" }
      }
    },
    quests: {
      flash: {
        title: "¡Reto Relámpago!",
        longWord: "Encuentra una palabra de {param}+ letras",
        comboStreak: "Arma una racha de {param} palabras",
        specificLetter: "Usa la letra {param}",
        fastWord: "Encuentra una palabra en {param}s",
        complete: "¡Completo!"
      },
      chapter: {
        panelTitle: "Misiones del Capítulo",
        wordCount: { title: "Coleccionista", desc: "Encuentra {target} palabras en este capítulo" },
        bossNoHint: { title: "Sin Piedad", desc: "Derrota al jefe sin pistas" },
        longWords: { title: "Artesano de Palabras", desc: "Encuentra {target} palabras de 6+ letras" },
        perfectLevels: { title: "Perfeccionista", desc: "Completa {target} niveles con 3 estrellas" }
      }
    }
  },
  blast: {
    helpIceLabel: "Hielo",
    helpIce: "2 golpes para romper. Se agrieta en el primero.",
    helpLightningLabel: "Rayo",
    helpLightning: "Limpia toda la columna al usarse en una palabra.",
    helpMagnetLabel: "Imán",
    helpMagnet: "Atrae fichas cercanas al limpiarse.",
    helpMirrorLabel: "Espejo",
    helpMirror: "Duplica efecto de ficha especial, o 2x puntaje.",
    helpSilverLabel: "Plata",
    helpSilver: "Multiplicador de 4x para la palabra.",
    helpDiamondLabel: "Diamante",
    helpDiamond: "Multiplicador de 5x. La ficha de mayor valor.",
    ready: {
      difficulty: "Dificultad",
      tileGuide: "Guía de Fichas",
      wave2Plus: "Oleada 2+",
      easy: "Fácil",
      medium: "Medio",
      hard: "Difícil",
      easyDesc: "Menos especiales, cascadas relajadas",
      mediumDesc: "Caos balanceado",
      hardDesc: "Especiales por todos lados, oleadas brutales"
    },
    hintCooldown: "Usada",
    waveClear: "¡Oleada Limpia!",
    tapToContinue: "Toca para continuar",
    levelComplete: "¡Nivel Completo!",
    moveBonus: "Bonus de Movimiento",
    nextWave: "Siguiente Oleada",
    celebrateAgain: "Celebrar de nuevo",
    movesLeft: "Movimientos",
    bonusMove: "¡+1 Movimiento!",
    bonusMoves: "¡+{count} Movimientos!",
    outOfMoves: "¡Sin Movimientos!",
    movesBonus: "Bonus de Movimientos",
    sugarCrush: "¡Sugar Crush!",
    waveIntro: {
      title: "Oleada {wave}",
      objectives: "Objetivos",
      go: "¡YA!",
      moves: "{moves} Movimientos"
    },
    objective: {
      scoreTarget: "Anota {target} pts",
      collectType: "Recolecta {target} {tileType}",
      clearAllType: "Limpia todos los {tileType}",
      wordLength: "{target} palabras de {minWordLength}+ letras"
    },
    combo: {
      bomb_bomb: "¡MEGA EXPLOSIÓN!",
      bomb_lightning: "¡BOMBA TRUENO!",
      bomb_prism: "¡TORMENTA DE CRISTAL!",
      bomb_rainbow: "¡DETONADOR ARCOÍRIS!",
      bomb_mirror: "¡BOMBA ESPEJO!",
      bomb_magnet: "¡EXPLOSIÓN MAGNÉTICA!",
      bomb_gem: "¡DESTROZO DE GEMA!",
      bomb_frozen: "¡EXPLOSIÓN DESHIELO!",
      lightning_lightning: "¡CADENA DE RAYOS!",
      lightning_prism: "¡TRUENO CRUZADO!",
      lightning_rainbow: "¡TORMENTA ARCOÍRIS!",
      lightning_mirror: "¡DOBLE IMPACTO!",
      lightning_magnet: "¡TIRÓN ELÉCTRICO!",
      lightning_gem: "¡CHISPA CRISTAL!",
      lightning_frozen: "¡DESHIELO DE ONDA!",
      prism_prism: "¡DESTRUCCIÓN TOTAL!",
      prism_rainbow: "¡NOVA ESPECTRAL!",
      prism_mirror: "¡CRUZ INFINITA!",
      prism_magnet: "¡VÓRTICE CRUZADO!",
      prism_gem: "¡PRISMA DE CRISTAL!",
      prism_frozen: "¡DESHIELO PRISMA!",
      rainbow_mirror: "¡ARCOÍRIS ESPEJO!",
      rainbow_magnet: "¡TIRÓN ARCOÍRIS!",
      rainbow_gem: "¡CRISTAL ARCOÍRIS!",
      rainbow_frozen: "¡DESHIELO ARCOÍRIS!",
      mirror_magnet: "¡DOBLE VÓRTICE!",
      mirror_gem: "¡CRISTAL ESPEJO!",
      mirror_frozen: "¡ECO CONGELANTE!",
      magnet_gem: "¡TIRÓN CRISTAL!",
      magnet_frozen: "¡VÓRTICE HELADO!",
      gem_frozen: "¡CRISTAL DE HIELO!",
      gold_special: "¡PODER DORADO!",
      rainbow_special: "¡DOBLE ARCOÍRIS!",
      triple_special: "¡TRIPLE AMENAZA!"
    },
    comboCodex: "CÓDEX DE COMBOS",
    codexProgress: "{discovered}/{total} descubiertos",
    codexLocked: "???",
    comboDiscovered: "¡COMBO DESCUBIERTO!",
    chainCounter: "CADENA x{{count}}"
  },
  student: {
    dashboard: {
      challenges: "Tus Desafíos",
      leaderboard: "Ranking del Salón",
      viewAll: "Ver Todo",
      achievements: "Logros",
      classroomActivity: "Actividad del Salón",
      quickPractice: "Práctica Rápida",
      randomLesson: "Lección al Azar",
      quickDuel: "Duelo Rápido",
      challengeClassmate: "Reta a un Compañero",
      streakCalendar: "Tu Racha",
      activity: {
        wonDuel: "ganó un duelo",
        unlockedAchievement: "desbloqueó un logro",
        noActivity: "Sin actividad todavía",
        errorLoading: "Error al cargar actividad"
      }
    },
    practice: {
      wordsFound: "Palabras Encontradas",
      sessions: "Sesiones de Práctica"
    },
    profile: {
      duelRecord: "Récord de Duelos",
      noDuelsYet: "Sin duelos todavía",
      challengePrompt: "¡Reta a un compañero para empezar tu camino competitivo!",
      recentDuels: "Duelos Recientes",
      viewDuelHistory: "Ver Historial Completo",
      winRate: "Tasa de Victoria"
    }
  },
  teacher: {
    profile: {
      teacherBadge: "Profesor",
      classrooms: "Salones",
      totalStudents: "Total de Estudiantes",
      roleStatus: "Rol",
      contactAdmin: "¿Necesitas Ayuda?",
      contactAdminDesc: "Para actualizar tu acceso de profesor o rol, contacta a tu administrador. Las cuentas de profesor son otorgadas por administradores escolares.",
      avatar: "Avatar del profesor"
    },
    dashboard: {
      assignments: "Tareas",
      track: "SEGUIR",
      duelActivity: "Actividad de Duelos",
      live: "EN VIVO",
      selectClassroom: "Seleccionar Salón",
      createClassroomFirst: "Crea un salón primero para rastrear tareas y actividad de duelos"
    },
    lesson: {
      startFromTemplate: "Iniciar desde Plantilla",
      templateLoaded: "Plantilla cargada: {{count}} palabras"
    },
    assignment: {
      createTitle: "Crear Tarea",
      create: "Crear Tarea",
      creating: "Creando...",
      created: "¡Tarea creada!",
      error: "Error al crear tarea",
      missingFields: "Selecciona una lección y fecha de entrega",
      typeLabel: "Tipo de Tarea",
      practiceMode: "Modo Práctica",
      duelChallenge: "Desafío de Duelo",
      lessonLabel: "Seleccionar Lección",
      selectLesson: "Elige una lección",
      words: "palabras",
      dueDate: "Fecha de Entrega",
      selectDate: "Seleccionar fecha",
      quickSelect: "Selección Rápida",
      today: "Hoy",
      tomorrow: "Mañana",
      nextWeek: "Próxima Semana",
      nextMonth: "Próximo Mes",
      customDate: "Fecha Personalizada",
      instructionsLabel: "Instrucciones",
      instructionsPlaceholder: "Agrega instrucciones opcionales para los estudiantes..."
    },
    completion: {
      overallProgress: "Progreso General",
      studentsCompleted: "estudiantes completaron",
      student: "Estudiante",
      notCompleted: "No completada",
      strugglingAreas: "Áreas de Dificultad",
      studentsMissed: "estudiantes fallaron",
      noStrugglingAreas: "No se identificaron áreas de dificultad aún"
    },
    tracking: {
      all: "Todas",
      active: "Activas",
      overdue: "Atrasadas",
      completed: "Completadas",
      practice: "Práctica",
      duel: "Duelo",
      statusActive: "Activa",
      statusOverdue: "Atrasada",
      statusCompleted: "Completada",
      untitledLesson: "Lección sin título",
      dueDate: "Entrega",
      studentsCompleted: "estudiantes",
      createAssignment: "Crear Tarea",
      noAssignments: "Sin tareas todavía",
      noAssignmentsFilter: "Sin tareas en esta categoría",
      createFirst: "Crear Primera Tarea"
    },
    duels: {
      noDuels: "Sin actividad de duelos reciente",
      points: "pts",
      async: "Asíncrono",
      realtime: "En Vivo"
    },
    progress: {
      title: "Progreso de Estudiantes",
      student: "Estudiante",
      wordsAttempted: "Intentadas",
      wordsMastered: "Dominadas",
      accuracy: "Precisión %",
      lastActive: "Última Actividad",
      noData: "Sin datos de progreso aún",
      assignLessons: "Asigna lecciones para empezar a rastrear el progreso",
      chartTitle: "Progreso del Salón en el Tiempo",
      wordsLearned: "Palabras Aprendidas",
      expandDetails: "Ver desglose de palabras",
      exportCSV: "Exportar CSV",
      exportSuccess: "¡Progreso exportado!",
      noDataToExport: "Sin datos para exportar",
      allClassrooms: "Todos los Salones",
      allLessons: "Todas las Lecciones",
      anonymousStudent: "Estudiante {{id}}",
      breakdownWord: "Palabra",
      breakdownAttempts: "Intentos",
      breakdownCorrect: "Correctas",
      statusMastered: "Dominada",
      statusLearning: "Aprendiendo",
      noWordsYet: "Sin palabras intentadas aún"
    }
  },
  education: {
    landing: {
      duelTeaser: {
        headline: "Reta a un compañero",
        subtext: "Juega cara a cara y sube en el ranking del salón",
        cta: "Iniciar Duelo →"
      },
      roleTeacher: "Profesor",
      roleStudent: "Estudiante",
      roleGuest: "Conectado",
      goToDashboard: "Ir al Panel"
    },
    practice: {
      sessionsCompleted: "sesiones completadas",
      time: "Tiempo",
      wordCount: "palabras",
      hintsUsed: "Pistas Usadas",
      maxStreak: "Racha Máxima"
    },
    lesson: {
      word: "palabra",
      words: "palabras"
    },
    leaderboard: {
      weekly: "Semanal",
      monthly: "Mensual",
      allTime: "Histórico",
      rankUp: "+{{count}}",
      rankDown: "-{{count}}",
      newEntry: "NUEVO",
      noChange: "-",
      top10: "Top 10%",
      top25: "Top 25%",
      top50: "Top 50%"
    },
    achievements: {
      all: "Todos",
      skill: "Habilidad",
      consistency: "Constancia",
      exploration: "Exploración",
      tierProgress: "{{current}} / {{target}}",
      duel_champion: { name: "Campeón de Duelos", description: "Gana duelos contra compañeros" },
      duel_streak: { name: "Racha Ganadora", description: "Gana duelos consecutivos" },
      comeback_king: { name: "Rey de la Remontada", description: "Gana después de ir perdiendo" },
      speed_dueler: { name: "Duelista Veloz", description: "Encuentra palabras rápido en duelos en vivo" },
      duel_veteran: { name: "Veterano de Duelos", description: "Juega muchos duelos" },
      spelling_ace: { name: "As de Ortografía", description: "Rondas de ortografía perfectas" },
      matching_master: { name: "Maestro de Emparejamiento", description: "Emparejamientos rápidos" },
      blitz_champion: { name: "Campeón Blitz", description: "Puntaje alto en modo Blitz" },
      practice_streak: { name: "Racha de Práctica", description: "Practica en días consecutivos" },
      mode_master: { name: "Maestro de Modos", description: "Completa todos los modos de práctica" }
    },
    classroomGame: {
      scanToJoin: "Escanea para unirte"
    },
    milestones: {
      xpRemaining: "{{xp}} XP para Nivel {{level}}",
      nextMilestone: "Próximo Hito",
      titleUnlock: "Desbloquea: {{title}}",
      reached: "¡Hito Alcanzado!",
      xpBonus: "+{{xp}} XP Bonus",
      coinBonus: "+{{coins}} Monedas",
      continue: "Continuar",
      maxLevel: "¡Nivel Máximo!",
      level: "Nivel",
      titleUnlocked: "Título Desbloqueado"
    }
  },
  challenges: {
    daily: {
      title: "Desafíos Diarios",
      resetsIn: "Se reinicia en {{time}}",
      claim: "Reclamar",
      claimed: "¡Reclamado!",
      completed: "Completado",
      progress: "{current} / {target}",
      xpReward: "+{xp} XP",
      practiceSessions: "Sesiones de Práctica",
      practiceSessionsDesc: "Completa {target} sesiones de práctica hoy",
      wordsMastered: "Maestro de Palabras",
      wordsMasteredDesc: "Domina {target} palabras nuevas hoy",
      duelPlayed: "Duelista",
      duelPlayedDesc: "Juega {target} duelo hoy",
      duelWins: "Ganador de Duelos",
      duelWinsDesc: "Gana {target} duelos hoy",
      perfectAccuracy: "Precisión Perfecta",
      perfectAccuracyDesc: "Completa {target} sesión con 100% de precisión",
      blitzHighScore: "Campeón Blitz",
      blitzHighScoreDesc: "Anota {target} puntos en modo Blitz",
      xpEarned: "Cazador de XP",
      xpEarnedDesc: "Gana {target} XP hoy",
      duelStreak: "Racha de Duelos",
      duelStreakDesc: "Gana {target} duelos seguidos",
      spellingPerfect: "Abeja Ortográfica",
      spellingPerfectDesc: "Ortografía perfecta en {target} sesiones"
    },
    weekly: {
      title: "Misiones Semanales",
      claim: "Reclamar",
      claimed: "¡Reclamado!",
      thisWeek: "Esta Semana",
      progress: "{current} / {target}",
      masterWords: "Maestría Semanal",
      masterWordsDesc: "Domina {target} palabras esta semana"
    },
    claim: "Reclamar",
    claimed: "Reclamado",
    loading: "Cargando tus desafíos...",
    noChallenges: "Sin desafíos disponibles",
    completed: "Completado",
    easy: "Fácil",
    medium: "Medio",
    hard: "Difícil"
  },
  quests: {
    weeklyWordMastery: "Maestría Semanal de Palabras",
    weeklyWordMasteryDesc: "Domina {target} palabras esta semana"
  },
  shareResult: {
    singleplayer: "LexiClash Solo",
    multiplayer: "LexiClash Batalla",
    blast: "LexiClash Blast",
    daily: "LexiClash Diario",
    adventure: "LexiClash Aventura",
    wordHunt: "LexiClash Búsqueda",
    score: "Puntaje",
    words: "Palabras",
    longest: "Más larga",
    combo: "Combo",
    won: "¡Ganaste!",
    lost: "Perdiste",
    level: "Nivel",
    puzzle: "Puzzle",
    vs: "vs"
  },
  events: {
    joinNow: "¡Únete Ya!",
    timeRemaining: "Tiempo Restante",
    dismiss: "Cerrar",
    endsIn: "Termina en",
    joined: "Unido",
    leaderboard: "Clasificación",
    position: "Posición",
    score: "Puntaje",
    rewards: "Premios",
    you: "Tú",
    noParticipants: "Sin participantes todavía"
  },
  league: {
    title: "Liga Semanal",
    bronze: "Bronce",
    silver: "Plata",
    gold: "Oro",
    diamond: "Diamante",
    ruby: "Rubí",
    position: "Posición",
    xp: "XP",
    promotionZone: "Zona de Ascenso",
    safeZone: "Zona Segura",
    relegationZone: "Zona de Descenso",
    promoted: "¡Ascendido!",
    relegated: "Descendido",
    stayed: "Se mantuvo",
    weeklyRewards: "Premios Semanales",
    coinsEarned: "Monedas Ganadas",
    newWeekIn: "Nueva semana en",
    joinLeague: "Unirse a Liga",
    yourPosition: "Tu Posición",
    top: "Top",
    standings: "Tabla",
    noLeague: "¡Únete a una liga para competir!",
    finalResults: "Resultados Finales",
    viewStandings: "Ver Tabla"
  },
  socialGift: {
    title: "Enviar Regalo",
    sendTo: "Enviar a",
    type: {
      hints: "Pista",
      streak_freeze: "Escudo de Racha",
      coins: "Monedas"
    },
    coins: "monedas",
    amount: "Cantidad",
    remaining: "Regalos diarios restantes",
    send: "Enviar Regalo",
    sent: "¡Regalo Enviado!",
    limitReached: "Límite diario alcanzado"
  }
};

// Deep merge function
function deepMerge(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
          typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
        deepMerge(target[key], source[key]);
      } else if (!(key in target)) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

deepMerge(es, patch);

// Now serialize back to JS
function serialize(obj, indent) {
  indent = indent || 2;
  var lines = [];
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = obj[key];
    var comma = i < keys.length - 1 ? ',' : '';
    var keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !key.includes('-') ? '"' + key + '"' : '"' + key + '"';
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      lines.push(' '.repeat(indent) + keyStr + ': {');
      var inner = serialize(val, indent + 2);
      lines.push(inner);
      lines.push(' '.repeat(indent) + '}' + comma);
    } else {
      lines.push(' '.repeat(indent) + keyStr + ': ' + JSON.stringify(val) + comma);
    }
  }
  return lines.join('\n');
}

var output = '// Es translations\nconst es = {\n' + serialize(es) + '\n};\n\nmodule.exports = es;\n';
fs.writeFileSync('./translations/es.js', output);
console.log('Done! Patched es.js');
