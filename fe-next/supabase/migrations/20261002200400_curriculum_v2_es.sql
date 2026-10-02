-- Curriculum word lists v2 (es): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/es.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'b0de49cb-dc44-50a5-acc3-26293bcb1071', $t$1.º de primaria — Mis primeras palabras$t$,
    $t$Palabras cotidianas de la casa, la escuela y la familia para quienes empiezan a leer. Cada palabra trae una explicación sencilla y una frase corta para leer en voz alta.$t$,
    'es', 'grade_1', 'general', 'LC-ES-G1-FIRST',
    $j$[
      {"word":"casa","definition":"El lugar donde vive una familia","example":"Mi abuela tiene una casa pequeña con jardín.","level":"support","canIntegrate":true},
      {"word":"gato","definition":"Un animal de compañía suave, con bigotes, que ronronea y maúlla","example":"Nuestro gato duerme al sol junto a la ventana.","level":"support","canIntegrate":true},
      {"word":"perro","definition":"Un animal de compañía que ladra, mueve la cola y cuida la casa","example":"El perro de mi vecina se llama Toby.","level":"support","canIntegrate":true},
      {"word":"sol","definition":"La estrella grande y caliente que nos da luz y calor de día","example":"Hoy hace mucho sol, así que llevamos gorra.","level":"support","canIntegrate":true},
      {"word":"pelota","definition":"Un juguete redondo que se lanza, se patea o se hace rebotar","example":"En el recreo jugamos con una pelota roja.","level":"support","canIntegrate":true},
      {"word":"libro","definition":"Hojas con palabras o dibujos, unidas dentro de una tapa, que sirven para leer","example":"Papá me leyó un libro de dinosaurios antes de dormir.","level":"support","canIntegrate":true},
      {"word":"mamá","definition":"Forma cariñosa de llamar a la madre","example":"Mi mamá me enseñó a nadar.","level":"core","canIntegrate":true},
      {"word":"papá","definition":"Forma cariñosa de llamar al padre","example":"Mi papá y yo plantamos un árbol en el patio.","level":"core","canIntegrate":true},
      {"word":"agua","definition":"El líquido transparente que bebemos cuando tenemos sed","example":"Después de correr me tomé un vaso de agua fría.","level":"core","canIntegrate":true},
      {"word":"pan","definition":"Alimento horneado hecho con harina, con el que se preparan sándwiches","example":"Compramos pan recién hecho en la panadería.","level":"core","canIntegrate":true},
      {"word":"manzana","definition":"Una fruta crujiente de piel roja, verde o amarilla que crece en los árboles","example":"De postre me comí una manzana verde.","level":"core","canIntegrate":true},
      {"word":"flor","definition":"La parte de colores de una planta, que muchas veces huele bien","example":"En el jardín se abrió una flor amarilla.","level":"core","canIntegrate":true},
      {"word":"silla","definition":"Un mueble con patas y respaldo para sentarse","example":"Acerca una silla a la mesa para dibujar.","level":"core","canIntegrate":true},
      {"word":"luna","definition":"La bola brillante que vemos en el cielo por la noche","example":"Esta noche hay luna llena sobre el tejado.","level":"core","canIntegrate":true},
      {"word":"familia","definition":"Personas unidas entre sí, como padres, hijos, hermanos y abuelos","example":"Los domingos toda mi familia come junta.","level":"challenge","canIntegrate":true},
      {"word":"bebé","definition":"Un niño muy pequeño que todavía no camina ni habla","example":"¡En casa tenemos un bebé y ahora soy la hermana mayor!","level":"challenge","canIntegrate":true},
      {"word":"amigo","definition":"Alguien que te cae bien, en quien confías y con quien te gusta estar","example":"Mi mejor amigo vive en la casa de al lado.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'e330e9fb-4149-590d-b544-c5d25cde2b60', $t$2.º de primaria — Animales y naturaleza$t$,
    $t$Animales, tiempo y paisajes que los niños ven en el parque, en el campo y en la excursión: del búho y la ardilla a la lluvia y la nieve.$t$,
    'es', 'grade_2', 'science', 'LC-ES-G2-NATURE',
    $j$[
      {"word":"pájaro","definition":"Un animal con plumas y alas; casi todos pueden volar","example":"Un pájaro pequeño cantaba en la rama.","level":"support","canIntegrate":true},
      {"word":"lluvia","definition":"Gotas de agua que caen de las nubes","example":"Con tanta lluvia, sacamos el paraguas.","level":"support","canIntegrate":true},
      {"word":"nube","definition":"Un montón blanco o gris de gotitas de agua que flota en el cielo","example":"Una nube negra tapó el sol.","level":"support","canIntegrate":true},
      {"word":"nieve","definition":"Copos blancos y fríos que caen del cielo cuando hace mucho frío","example":"En invierno la montaña se cubre de nieve.","level":"support","canIntegrate":true},
      {"word":"árbol","definition":"Una planta alta con tronco, ramas y hojas","example":"Nos sentamos a la sombra de un árbol enorme.","level":"support","canIntegrate":true},
      {"word":"viento","definition":"Aire que se mueve y empuja las hojas, las nubes y los barcos de vela","example":"Sopló un viento tan fuerte que volaron las hojas del patio.","level":"core","canIntegrate":true},
      {"word":"bosque","definition":"Un lugar grande con muchísimos árboles","example":"Paseamos por un bosque lleno de pinos.","level":"core","canIntegrate":true},
      {"word":"río","definition":"Agua dulce que corre sin parar hasta el mar o hasta un lago","example":"Cruzamos un río por un puente de madera.","level":"core","canIntegrate":true},
      {"word":"mariposa","definition":"Un insecto de alas de colores que antes fue oruga","example":"Una mariposa blanca se posó en la flor.","level":"core","canIntegrate":true},
      {"word":"hormiga","definition":"Un insecto pequeño y trabajador que vive en un hormiguero con muchísimas otras","example":"Una hormiga cargaba una miga más grande que ella.","level":"core","canIntegrate":true},
      {"word":"abeja","definition":"Un insecto que zumba, recoge néctar de las flores y produce miel","example":"Una abeja volaba de flor en flor.","level":"core","canIntegrate":true},
      {"word":"conejo","definition":"Un animal peludo de orejas largas que salta muy rápido","example":"Un conejo blanco saltó detrás del arbusto.","level":"core","canIntegrate":true},
      {"word":"león","definition":"Un felino salvaje, grande y fuerte; el macho tiene melena","example":"En el documental vimos un león descansando a la sombra.","level":"core","canIntegrate":true},
      {"word":"rana","definition":"Un animal pequeño que salta, croa y vive cerca del agua","example":"Una rana verde croaba en el estanque.","level":"core","canIntegrate":true},
      {"word":"tortuga","definition":"Un animal lento que lleva un caparazón duro en la espalda","example":"La tortuga de mi tío tiene más de treinta años.","level":"challenge","canIntegrate":true},
      {"word":"ardilla","definition":"Un animal pequeño de cola peluda que trepa a los árboles y guarda nueces","example":"Una ardilla subió corriendo por el tronco.","level":"challenge","canIntegrate":true},
      {"word":"búho","definition":"Un ave de ojos grandes que caza de noche y puede girar mucho la cabeza","example":"Anoche oímos un búho en el bosque.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '81130b71-ce57-54b0-9012-5a068a5a1b5b', $t$3.º de primaria — Emociones y carácter$t$,
    $t$Palabras para hablar de cómo nos sentimos y de cómo tratamos a los demás. Ideales para la asamblea de clase y la escritura personal.$t$,
    'es', 'grade_3', 'general', 'LC-ES-G3-FEELINGS',
    $j$[
      {"word":"feliz","definition":"Que se siente contento y con ganas de sonreír o reír","example":"Daniel estaba feliz porque su abuelo vino a verlo.","level":"support","canIntegrate":true},
      {"word":"triste","definition":"Que siente pena y a veces tiene ganas de llorar","example":"Leo se puso triste cuando se le cayó el helado.","level":"support","canIntegrate":true},
      {"word":"asustado","definition":"Que siente miedo porque cree que puede pasar algo malo","example":"El cachorro está asustado por los truenos.","level":"support","canIntegrate":true},
      {"word":"amable","definition":"Que trata a los demás con cariño y buenos modales","example":"El conserje de la escuela es muy amable con todos.","level":"support","canIntegrate":true},
      {"word":"tranquilo","definition":"Que está en calma, sin nervios ni prisa","example":"Después de respirar hondo, me sentí tranquilo otra vez.","level":"core","canIntegrate":true},
      {"word":"orgulloso","definition":"Que se siente contento por algo que hizo él mismo o alguien cercano","example":"Mi papá está orgulloso porque terminé el rompecabezas yo solo.","level":"core","canIntegrate":true},
      {"word":"valiente","definition":"Que hace lo correcto aunque tenga miedo","example":"Jorge fue valiente y le contó a la maestra lo que pasó.","level":"core","canIntegrate":true},
      {"word":"generoso","definition":"Que le gusta dar y compartir con los demás","example":"Mi tío es generoso y trajo galletas para toda la clase.","level":"core","canIntegrate":true},
      {"word":"curioso","definition":"Que quiere saber, preguntar y descubrir cosas nuevas","example":"El gato es curioso y mete la nariz en cada caja.","level":"core","canIntegrate":true},
      {"word":"tímido","definition":"Que le cuesta hablar con gente que no conoce","example":"Al principio Hugo era tímido, pero ahora habla con todos.","level":"core","canIntegrate":true},
      {"word":"honesto","definition":"Que dice la verdad y no hace trampa","example":"Martín fue honesto y devolvió la cartera que encontró.","level":"core","canIntegrate":true},
      {"word":"paciente","definition":"Que sabe esperar sin perder la calma","example":"Nuestro entrenador es paciente y nos explica las cosas una y otra vez.","level":"core","canIntegrate":true},
      {"word":"nervioso","definition":"Que está inquieto porque algo le preocupa o le emociona mucho","example":"Antes de la obra de teatro, Pablo estaba muy nervioso.","level":"challenge","canIntegrate":true},
      {"word":"sorprendido","definition":"Que no se esperaba lo que acaba de pasar","example":"Sam se quedó sorprendido cuando toda la clase le cantó.","level":"challenge","canIntegrate":true},
      {"word":"celoso","definition":"Que teme perder el cariño o la atención de alguien","example":"Cuando nació su hermanita, Lucas estuvo un poco celoso.","level":"challenge","canIntegrate":true},
      {"word":"agradecido","definition":"Que siente gratitud y quiere dar las gracias por lo que recibió","example":"Estoy agradecido porque me ayudaste con la tarea.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'd235acda-f9c3-51db-8c5c-1a55558f5f4e', $t$3.º de primaria — Palabras de matemáticas$t$,
    $t$Las palabras que hacen falta para entender un problema escrito: operaciones, figuras y medidas. Cada explicación lleva un ejemplo con números.$t$,
    'es', 'grade_3', 'math', 'LC-ES-G3-MATH',
    $j$[
      {"word":"número","definition":"Un signo o una palabra que dice cuántos hay, por ejemplo 7 o 25","example":"Piensa un número del uno al diez.","level":"support","canIntegrate":true},
      {"word":"sumar","definition":"Juntar cantidades para saber cuántas hay en total, por ejemplo 3 + 4","example":"Si vas a sumar 5 y 3, te da 8.","level":"support","canIntegrate":true},
      {"word":"restar","definition":"Quitar una cantidad de otra, por ejemplo 9 − 2","example":"Para saber cuántos quedan, hay que restar.","level":"support","canIntegrate":true},
      {"word":"reloj","definition":"Un aparato con agujas o con números que nos dice en qué momento del día estamos","example":"En la pared de la clase hay un reloj redondo.","level":"support","canIntegrate":true},
      {"word":"regla","definition":"Una tira recta con marcas para medir y trazar líneas","example":"Traza una línea recta con la regla.","level":"core","canIntegrate":true},
      {"word":"metro","definition":"Una unidad de longitud que equivale a cien centímetros","example":"La mesa mide un metro de largo.","level":"core","canIntegrate":true},
      {"word":"mitad","definition":"Cada una de las dos partes iguales en que se divide algo","example":"Partimos la pizza y cada uno se comió la mitad.","level":"core","canIntegrate":true},
      {"word":"doble","definition":"Dos veces una cantidad","example":"Mi hermano tiene el doble de años que yo.","level":"core","canIntegrate":true},
      {"word":"triángulo","definition":"Una figura con tres lados y tres esquinas","example":"Una porción de pizza tiene forma de triángulo.","level":"core","canIntegrate":true},
      {"word":"cuadrado","definition":"Una figura con cuatro lados iguales y cuatro esquinas rectas","example":"Cada casilla del cuaderno es un cuadrado pequeño.","level":"core","canIntegrate":true},
      {"word":"rectángulo","definition":"Una figura con cuatro esquinas rectas, dos lados largos y dos cortos","example":"La puerta de la clase tiene forma de rectángulo.","level":"core","canIntegrate":true},
      {"word":"círculo","definition":"Una figura totalmente redonda, sin esquinas","example":"Nos sentamos en un círculo sobre la alfombra.","level":"core","canIntegrate":true},
      {"word":"suma","definition":"La operación de juntar números, o el resultado de juntarlos","example":"La suma de 6 y 9 es 15.","level":"core","canIntegrate":true},
      {"word":"resta","definition":"La operación de quitar un número a otro, o lo que queda después","example":"Si tienes 10 y regalas 7, haces una resta y te quedan 3.","level":"core","canIntegrate":true},
      {"word":"multiplicar","definition":"Sumar el mismo número varias veces, por ejemplo 3 × 4 = 3 + 3 + 3 + 3","example":"Para multiplicar rápido, ayuda saberse las tablas.","level":"challenge","canIntegrate":true},
      {"word":"dividir","definition":"Repartir una cantidad en partes iguales, por ejemplo 12 ÷ 3","example":"Si quieres dividir doce galletas entre tres amigos, a cada uno le tocan cuatro.","level":"challenge","canIntegrate":true},
      {"word":"fracción","definition":"Una parte de un entero, como un medio o un cuarto","example":"Media pizza es una fracción: uno de dos trozos iguales.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '4da188d7-0a31-557b-98fe-28aa08847f9c', $t$4.º de primaria — La escuela y la comunidad$t$,
    $t$Palabras sobre la vida en el aula, en el barrio y en la comunidad, junto con valores como el respeto y la convivencia.$t$,
    'es', 'grade_4', 'general', 'LC-ES-G4-SCHOOL',
    $j$[
      {"word":"maestro","definition":"Persona que enseña a los alumnos en la escuela","example":"Este año tenemos un maestro nuevo de música.","level":"support","canIntegrate":true},
      {"word":"alumno","definition":"Persona que estudia en una escuela","example":"Cada alumno recibió un cuaderno nuevo.","level":"support","canIntegrate":true},
      {"word":"recreo","definition":"El descanso entre clases para salir a jugar","example":"Después de la clase de matemáticas salimos al recreo.","level":"support","canIntegrate":true},
      {"word":"vecino","definition":"Persona que vive cerca de ti, en tu misma calle o edificio","example":"Nuestro vecino riega las plantas cuando nos vamos de viaje.","level":"support","canIntegrate":true},
      {"word":"ayuda","definition":"Lo que haces para que a otra persona algo le resulte más fácil","example":"La abuela pidió ayuda para cargar las bolsas.","level":"support","canIntegrate":true},
      {"word":"biblioteca","definition":"Un lugar con muchísimos libros para leer allí o llevarlos prestados","example":"La escuela abrió una biblioteca nueva con cojines para leer.","level":"core","canIntegrate":true},
      {"word":"barrio","definition":"Una parte de la ciudad con sus calles, casas y vecinos","example":"Vivimos en un barrio tranquilo con un parque grande.","level":"core","canIntegrate":true},
      {"word":"norma","definition":"Algo que todos acordamos cumplir","example":"En clase tenemos una norma: levantar la mano antes de hablar.","level":"core","canIntegrate":true},
      {"word":"equipo","definition":"Grupo de personas que trabajan o juegan juntas por la misma meta","example":"En la feria de ciencias, nuestro equipo hizo un volcán.","level":"core","canIntegrate":true},
      {"word":"compartir","definition":"Dejar que otros también usen o disfruten algo tuyo","example":"Me gusta compartir mis colores con mi compañera.","level":"core","canIntegrate":true},
      {"word":"respeto","definition":"Tratar a los demás como personas importantes: escucharlas y no ofenderlas","example":"Todos merecemos respeto, aunque pensemos distinto.","level":"core","canIntegrate":true},
      {"word":"amistad","definition":"El lazo de cariño y confianza entre dos o más personas","example":"Una amistad de verdad puede durar toda la vida.","level":"core","canIntegrate":true},
      {"word":"justo","definition":"Que trata a todos por igual y da a cada uno lo que le corresponde","example":"El árbitro fue justo con los dos equipos.","level":"challenge","canIntegrate":true},
      {"word":"voluntario","definition":"Persona que ayuda a otros porque quiere, sin cobrar","example":"Mi hermano mayor es voluntario en un refugio de animales.","level":"challenge","canIntegrate":true},
      {"word":"convivencia","definition":"Vivir y estar juntos respetándose unos a otros","example":"Las normas de clase ayudan a la buena convivencia.","level":"challenge","canIntegrate":true},
      {"word":"colaborar","definition":"Trabajar junto con otros para conseguir algo","example":"Para terminar el mural a tiempo, todos tenemos que colaborar.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'dec377a4-9251-5724-a905-22bf84a4461c', $t$5.º de primaria — Ciencias: seres vivos y experimentos$t$,
    $t$Vocabulario básico de ciencias naturales: plantas, animales, energía y los pasos de un experimento, de la hipótesis a la conclusión.$t$,
    'es', 'grade_5', 'science', 'LC-ES-G5-SCIENCE',
    $j$[
      {"word":"planta","definition":"Un ser vivo que crece en la tierra y necesita agua y luz","example":"En la ventana tenemos una planta de albahaca.","level":"support","canIntegrate":true},
      {"word":"semilla","definition":"La parte pequeña de la que nace una planta nueva","example":"Sembré una semilla de girasol en una maceta.","level":"support","canIntegrate":true},
      {"word":"raíz","definition":"La parte de la planta que está bajo tierra y absorbe el agua","example":"El diente de león tiene una raíz larga y difícil de arrancar.","level":"support","canIntegrate":true},
      {"word":"insecto","definition":"Un animal pequeño de seis patas, como la hormiga o el escarabajo","example":"Encontramos un insecto verde en una hoja de lechuga.","level":"support","canIntegrate":true},
      {"word":"imán","definition":"Un objeto que atrae el hierro","example":"Con un imán recogimos todos los clips del suelo.","level":"core","canIntegrate":true},
      {"word":"oxígeno","definition":"Un gas del aire que necesitamos para respirar","example":"Las plantas sueltan oxígeno al aire.","level":"core","canIntegrate":true},
      {"word":"energía","definition":"Lo que permite que las cosas se muevan, crezcan, den luz o se calienten","example":"El desayuno le da energía al cuerpo para empezar el día.","level":"core","canIntegrate":true},
      {"word":"experimento","definition":"Una prueba que se hace para averiguar si una idea es cierta","example":"Hicimos un experimento: ¿qué pelota cae más rápido?","level":"core","canIntegrate":true},
      {"word":"mamífero","definition":"Un animal cuyas crías toman leche de su madre","example":"La ballena vive en el mar, pero es un mamífero y no un pez.","level":"core","canIntegrate":true},
      {"word":"reptil","definition":"Un animal de piel con escamas y sangre fría, como el lagarto o la serpiente","example":"La iguana es un reptil que toma el sol para calentarse.","level":"core","canIntegrate":true},
      {"word":"laboratorio","definition":"Una sala con instrumentos especiales donde se investiga y se hacen pruebas","example":"La escuela tiene un laboratorio con microscopios.","level":"core","canIntegrate":true},
      {"word":"evaporación","definition":"Cuando el agua se calienta y se convierte en vapor","example":"Por la evaporación, el charco desapareció tras un día de calor.","level":"core","canIntegrate":true},
      {"word":"hipótesis","definition":"Una suposición razonada que se pone a prueba con un experimento","example":"Mi hipótesis era que una planta a oscuras no crecería.","level":"challenge","canIntegrate":true},
      {"word":"observación","definition":"Mirar algo con atención y anotar lo que se ve","example":"Durante la observación contamos los pájaros del patio.","level":"challenge","canIntegrate":true},
      {"word":"conclusión","definition":"Lo que se entiende al final de un experimento a partir de los resultados","example":"Nuestra conclusión fue que las plantas necesitan luz.","level":"challenge","canIntegrate":true},
      {"word":"fotosíntesis","definition":"Proceso con el que las plantas fabrican su alimento usando luz, agua y dióxido de carbono","example":"Gracias a la fotosíntesis, los árboles crecen y sueltan oxígeno.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0696e3fa-325d-5b29-a75e-99f9d374065a', $t$6.º de primaria — Geografía: relieve y mapas$t$,
    $t$Conceptos para leer un mapa y describir el relieve, con ejemplos de España y de América: los Andes, la Pampa, el Sahara y la península ibérica.$t$,
    'es', 'grade_6', 'geography', 'LC-ES-G6-GEO',
    $j$[
      {"word":"mapa","definition":"Un dibujo de un lugar visto desde arriba, con caminos, ciudades y fronteras","example":"Abrimos un mapa para encontrar el sendero.","level":"support","canIntegrate":true},
      {"word":"norte","definition":"El punto cardinal hacia el que señala la aguja de la brújula","example":"La aguja de la brújula siempre apunta al norte.","level":"support","canIntegrate":true},
      {"word":"sur","definition":"El punto cardinal opuesto al norte","example":"En otoño muchas aves vuelan hacia el sur.","level":"support","canIntegrate":true},
      {"word":"isla","definition":"Una porción de tierra rodeada de agua por todas partes","example":"Mallorca es una isla del mar Mediterráneo.","level":"support","canIntegrate":true},
      {"word":"costa","definition":"La zona donde la tierra se encuentra con el mar","example":"Recorrimos la costa en bicicleta.","level":"core","canIntegrate":true},
      {"word":"montaña","definition":"Una elevación muy alta del terreno","example":"Subimos a una montaña y desde arriba se veía todo el valle.","level":"core","canIntegrate":true},
      {"word":"desierto","definition":"Una zona muy seca, con poca lluvia y pocas plantas","example":"El Sahara es el desierto cálido más grande del mundo.","level":"core","canIntegrate":true},
      {"word":"llanura","definition":"Un terreno grande y plano, sin montañas","example":"La Pampa es una llanura enorme de Argentina.","level":"core","canIntegrate":true},
      {"word":"volcán","definition":"Una montaña con una abertura por la que pueden salir lava, ceniza y gases","example":"El Popocatépetl es un volcán activo de México.","level":"core","canIntegrate":true},
      {"word":"frontera","definition":"La línea que separa un país de otro","example":"En el mapa, la frontera aparece como una línea de puntos.","level":"core","canIntegrate":true},
      {"word":"océano","definition":"Una enorme extensión de agua salada, más grande que cualquier mar","example":"El océano Pacífico es el más grande de la Tierra.","level":"core","canIntegrate":true},
      {"word":"clima","definition":"El tiempo que suele hacer en un lugar a lo largo de muchos años","example":"En la costa el clima es más suave que en el interior.","level":"core","canIntegrate":true},
      {"word":"cordillera","definition":"Una cadena larga de montañas unidas","example":"Los Andes son la cordillera más larga del mundo.","level":"challenge","canIntegrate":true},
      {"word":"península","definition":"Una porción de tierra rodeada de agua por todos lados menos por uno","example":"España y Portugal están en la península ibérica.","level":"challenge","canIntegrate":true},
      {"word":"continente","definition":"Cada una de las grandes masas de tierra del planeta, como América o África","example":"Australia es a la vez un país y un continente.","level":"challenge","canIntegrate":true},
      {"word":"población","definition":"El conjunto de personas que viven en un lugar","example":"México tiene una población de más de cien millones de habitantes.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '9376e0c5-3209-5f81-b5a8-7c729ee5147b', $t$Secundaria (13-14 años) — Historia: de la Antigüedad a la Edad Moderna$t$,
    $t$Palabras clave para estudiar Egipto, Roma, la Edad Media, las culturas mesoamericanas y la llegada de los europeos a América.$t$,
    'es', 'grade_8', 'history', 'LC-ES-G8-HISTORY',
    $j$[
      {"word":"rey","definition":"El hombre que gobierna un reino, casi siempre porque heredó el trono","example":"Alfonso X fue un rey castellano que impulsó la ciencia y las letras.","level":"support","canIntegrate":true},
      {"word":"guerra","definition":"Lucha armada entre países o grupos","example":"La guerra de los Cien Años enfrentó a Francia e Inglaterra.","level":"support","canIntegrate":true},
      {"word":"paz","definition":"Cuando no hay guerra y se convive sin violencia","example":"Tras años de lucha, los dos reinos firmaron la paz.","level":"support","canIntegrate":true},
      {"word":"siglo","definition":"Un período de cien años","example":"Colón llegó a América a finales del siglo XV.","level":"support","canIntegrate":true},
      {"word":"comercio","definition":"Comprar, vender o intercambiar productos","example":"Por la Ruta de la Seda pasaba el comercio entre China y Europa.","level":"core","canIntegrate":true},
      {"word":"imperio","definition":"Un estado muy grande que gobierna muchos territorios y pueblos","example":"Roma llegó a ser un imperio que rodeaba todo el Mediterráneo.","level":"core","canIntegrate":true},
      {"word":"castillo","definition":"Una construcción fuerte, con murallas y torres, hecha para defenderse","example":"En lo alto de la colina se levanta un castillo medieval.","level":"core","canIntegrate":true},
      {"word":"monasterio","definition":"Un edificio donde viven monjes o monjas dedicados a su fe","example":"En la Edad Media, cada monasterio copiaba libros a mano.","level":"core","canIntegrate":true},
      {"word":"pirámide","definition":"Una gran construcción de base cuadrada cuyos lados en triángulo se juntan arriba","example":"En Teotihuacan hay una pirámide dedicada al Sol.","level":"core","canIntegrate":true},
      {"word":"faraón","definition":"El rey del antiguo Egipto","example":"Tutankamón fue un faraón que subió al trono siendo niño.","level":"core","canIntegrate":true},
      {"word":"colonia","definition":"Un territorio gobernado por un país lejano","example":"Durante siglos, Cuba fue una colonia de España.","level":"core","canIntegrate":true},
      {"word":"tratado","definition":"Un acuerdo escrito y firmado entre países","example":"El tratado de Tordesillas repartió tierras entre España y Portugal.","level":"core","canIntegrate":true},
      {"word":"civilización","definition":"Una sociedad avanzada con ciudades, leyes, escritura y arte propios","example":"Mesopotamia fue la cuna de una civilización con escritura propia.","level":"challenge","canIntegrate":true},
      {"word":"arqueología","definition":"La ciencia que estudia el pasado a partir de restos antiguos, como ruinas y objetos","example":"Gracias a la arqueología sabemos cómo vivían los mayas.","level":"challenge","canIntegrate":true},
      {"word":"revolución","definition":"Un cambio rápido y profundo, por ejemplo cuando el pueblo derroca a un gobernante","example":"La revolución francesa empezó en 1789.","level":"challenge","canIntegrate":true},
      {"word":"códice","definition":"Un libro antiguo escrito o pintado a mano","example":"El códice de Dresde recoge cálculos mayas sobre el planeta Venus.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '833bd841-26dc-559e-8c5a-6e83c0dc79f5', $t$Secundaria (15-16 años) — Ciudadanía: democracia y derechos$t$,
    $t$Conceptos centrales de educación cívica: elecciones, constitución, derechos y deberes, mayoría y minoría. Definiciones precisas para secundaria.$t$,
    'es', 'grade_10', 'history', 'LC-ES-G10-CIVICS',
    $j$[
      {"word":"ley","definition":"Una norma que todas las personas de un país deben cumplir","example":"Hay una ley que prohíbe vender alcohol a menores.","level":"support","canIntegrate":true},
      {"word":"voto","definition":"La forma en que cada persona elige una opción en unas elecciones","example":"Cada voto cuenta lo mismo, sea de quien sea.","level":"support","canIntegrate":true},
      {"word":"deber","definition":"Algo que tenemos que hacer porque lo manda la ley o la conciencia","example":"Respetar las leyes es un deber de todos.","level":"support","canIntegrate":true},
      {"word":"poder","definition":"La capacidad de mandar y de tomar decisiones que afectan a otros","example":"En una democracia, el poder se reparte entre varias instituciones.","level":"support","canIntegrate":true},
      {"word":"democracia","definition":"Sistema de gobierno en el que el pueblo elige a sus líderes en elecciones libres","example":"En una democracia todos pueden expresar su opinión.","level":"core","canIntegrate":true},
      {"word":"elecciones","definition":"El proceso en que la ciudadanía vota para elegir a sus representantes","example":"Antes de las elecciones, los partidos presentan sus propuestas.","level":"core","canIntegrate":true},
      {"word":"ciudadano","definition":"Persona que pertenece a un país y tiene en él derechos y obligaciones","example":"Todo ciudadano mayor de edad puede votar.","level":"core","canIntegrate":true},
      {"word":"gobierno","definition":"El grupo de personas que dirige un país y aplica las leyes","example":"Tras las elecciones se formó un gobierno nuevo.","level":"core","canIntegrate":true},
      {"word":"constitución","definition":"La ley más importante de un país, que fija sus reglas básicas y protege los derechos","example":"La constitución garantiza la libertad de expresión.","level":"core","canIntegrate":true},
      {"word":"derecho","definition":"Algo que le corresponde a toda persona, como la educación o la salud","example":"La educación es un derecho de todos los niños.","level":"core","canIntegrate":true},
      {"word":"mayoría","definition":"Más de la mitad de los votos o de las personas","example":"La propuesta salió adelante por mayoría.","level":"core","canIntegrate":true},
      {"word":"minoría","definition":"Un grupo más pequeño dentro de una sociedad, o menos de la mitad de los votos","example":"En una democracia, también la minoría tiene derecho a ser escuchada.","level":"core","canIntegrate":true},
      {"word":"libertad","definition":"Poder pensar, hablar y actuar sin que nadie te lo impida injustamente","example":"La libertad de prensa permite criticar al gobierno.","level":"core","canIntegrate":true},
      {"word":"parlamento","definition":"La asamblea de representantes elegidos que debate y aprueba las leyes","example":"El parlamento aprobó una nueva ley de educación.","level":"challenge","canIntegrate":true},
      {"word":"censura","definition":"Cuando el poder prohíbe o borra textos, imágenes u opiniones","example":"Una prensa libre no acepta la censura.","level":"challenge","canIntegrate":true},
      {"word":"corrupción","definition":"Cuando alguien con poder recibe sobornos o hace trampas para su propio beneficio","example":"Los periodistas destaparon un caso de corrupción.","level":"challenge","canIntegrate":true},
      {"word":"impuesto","definition":"Dinero que la gente paga al Estado para costear escuelas, hospitales y carreteras","example":"El IVA es un impuesto que se paga al comprar.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  grade_level = EXCLUDED.grade_level,
  subject = EXCLUDED.subject,
  curriculum_standard = EXCLUDED.curriculum_standard,
  words = EXCLUDED.words,
  is_active = TRUE;
