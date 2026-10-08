-- Curriculum word lists v2 (es): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/es-upper.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'a5274d8c-5fee-55f9-b2c0-8d70feff4e73', $t$Séptimo — El cuerpo humano$t$,
    $t$Palabras de biología para estudiantes de 7.º y 8.º grado: órganos, sistemas y procesos del cuerpo. Cada palabra tiene una explicación sencilla y una oración de ejemplo.$t$,
    'es', 'grade_7', 'science', 'LC-ES-G7-CUERPO',
    $j$[
      {"word":"cuerpo","definition":"Conjunto de todas las partes de un ser vivo","example":"El ejercicio es bueno para el cuerpo y para la mente.","level":"support","canIntegrate":true},
      {"word":"sangre","definition":"Líquido rojo que lleva oxígeno por todo el organismo","example":"La sangre viaja por las venas y las arterias.","level":"support","canIntegrate":true},
      {"word":"hueso","definition":"Parte dura del esqueleto que sostiene el cuerpo","example":"Me caí de la bici y me rompí un hueso del brazo.","level":"support","canIntegrate":true},
      {"word":"piel","definition":"Capa externa que cubre y protege el cuerpo","example":"La piel nos protege de muchos gérmenes.","level":"support","canIntegrate":true},
      {"word":"músculo","definition":"Tejido que permite mover las partes del cuerpo","example":"Después de entrenar, el músculo de la pierna quedó cansado.","level":"core","canIntegrate":true},
      {"word":"corazón","definition":"Órgano que bombea la sangre a todo el cuerpo","example":"Mi corazón late más rápido cuando corro.","level":"core","canIntegrate":true},
      {"word":"pulmón","definition":"Órgano que nos permite respirar y tomar oxígeno","example":"Cada pulmón se llena de aire al respirar.","level":"core","canIntegrate":true},
      {"word":"cerebro","definition":"Órgano principal que controla los pensamientos y el movimiento","example":"El cerebro recibe información de los ojos y de los oídos.","level":"core","canIntegrate":true},
      {"word":"célula","definition":"Unidad pequeña de la que están hechos todos los seres vivos","example":"Una célula tiene un núcleo en el centro.","level":"core","canIntegrate":true},
      {"word":"nervio","definition":"Hilo de tejido que envía mensajes entre el cerebro y el cuerpo","example":"Un golpe en el codo activa un nervio muy sensible.","level":"core","canIntegrate":true},
      {"word":"esqueleto","definition":"Conjunto de huesos que da forma y sostiene el cuerpo","example":"El esqueleto de un adulto tiene más de doscientos huesos.","level":"core","canIntegrate":true},
      {"word":"órgano","definition":"Parte del cuerpo que cumple una función especial","example":"El hígado es un órgano muy grande.","level":"core","canIntegrate":true},
      {"word":"sistema","definition":"Conjunto de partes que trabajan juntas","example":"El sistema digestivo convierte la comida en energía.","level":"core","canIntegrate":true},
      {"word":"digestión","definition":"Proceso por el que el cuerpo convierte la comida en nutrientes","example":"La digestión empieza en la boca.","level":"challenge","canIntegrate":true},
      {"word":"circulación","definition":"Movimiento de la sangre por los vasos del cuerpo","example":"Hacer ejercicio mejora la circulación.","level":"challenge","canIntegrate":true},
      {"word":"metabolismo","definition":"Conjunto de reacciones que usa el cuerpo para obtener energía","example":"Cada persona tiene un metabolismo diferente.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'b767f7bd-98a9-57cf-a592-ddaf51c3c633', $t$Noveno — Cómo funciona un gobierno$t$,
    $t$Palabras de cívica e historia sobre votos, leyes y la forma en que se gobiernan los países. Cada palabra tiene un significado claro y una oración sobre una situación real.$t$,
    'es', 'grade_9', 'history', 'LC-ES-G9-DEMOCRACIA',
    $j$[
      {"word":"voto","definition":"Decisión que se expresa al elegir a una persona o una opción","example":"Cada voto cuenta en una elección.","level":"support","canIntegrate":true},
      {"word":"ley","definition":"Regla que todas las personas de un país deben cumplir","example":"Según la ley, es ilegal conducir sin licencia.","level":"support","canIntegrate":true},
      {"word":"nación","definition":"Grupo grande de personas que comparten historia, lengua y territorio","example":"La nación celebró su día de independencia con desfiles.","level":"support","canIntegrate":true},
      {"word":"ciudadano","definition":"Persona que pertenece a un país y tiene sus derechos","example":"Cada ciudadano tiene derecho a un juicio justo.","level":"support","canIntegrate":true},
      {"word":"democracia","definition":"Sistema en el que el pueblo elige a sus gobernantes","example":"En una democracia, la gente decide quién gobierna.","level":"core","canIntegrate":true},
      {"word":"república","definition":"País gobernado por representantes elegidos y sin rey","example":"El país se convirtió en república tras la caída del rey.","level":"core","canIntegrate":true},
      {"word":"constitución","definition":"Conjunto de reglas básicas que organizan un Estado","example":"La constitución protege la libertad de expresión.","level":"core","canIntegrate":true},
      {"word":"enmienda","definition":"Cambio que se añade a una constitución o a una ley","example":"La enmienda dio a las mujeres el derecho al voto.","level":"core","canIntegrate":true},
      {"word":"tratado","definition":"Acuerdo formal firmado por dos o más países","example":"Los dos países firmaron un tratado de paz.","level":"core","canIntegrate":true},
      {"word":"colonia","definition":"Territorio gobernado por un país extranjero","example":"La colonia quería gobernarse a sí misma.","level":"core","canIntegrate":true},
      {"word":"revolución","definition":"Cambio repentino y profundo en el gobierno, a menudo por la fuerza","example":"La revolución cambió las leyes del país para siempre.","level":"core","canIntegrate":true},
      {"word":"censo","definition":"Conteo oficial de todas las personas que viven en un país","example":"El censo cuenta cuántas personas viven en cada ciudad.","level":"core","canIntegrate":true},
      {"word":"parlamento","definition":"Grupo de personas que elaboran y aprueban las leyes","example":"El parlamento debatió la nueva ley durante semanas.","level":"core","canIntegrate":true},
      {"word":"soberanía","definition":"Poder de un país para gobernarse a sí mismo","example":"El país luchó para proteger su soberanía.","level":"challenge","canIntegrate":true},
      {"word":"ratificar","definition":"Aprobar oficialmente un acuerdo o una constitución","example":"Los estados votaron para ratificar la nueva constitución.","level":"challenge","canIntegrate":true},
      {"word":"veto","definition":"Poder de un líder para impedir que una ley se apruebe","example":"El presidente decidió poner su veto a la propuesta.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '79afd804-04b3-5cb2-bdcf-39f499c1a950', $t$Undécimo — Palabras para personas e ideas$t$,
    $t$Palabras precisas para describir el carácter, los argumentos y la forma de pensar. Cada palabra tiene una definición clara y una oración que muestra cómo se usa.$t$,
    'es', 'grade_11', 'general', 'LC-ES-G11-ARGUMENTO',
    $j$[
      {"word":"honesto","definition":"Que dice la verdad y no oculta nada","example":"El niño honesto devolvió la cartera.","level":"support","canIntegrate":true},
      {"word":"breve","definition":"Corto en longitud o en tiempo","example":"El entrenador dio una breve charla antes del partido.","level":"support","canIntegrate":true},
      {"word":"cuidadoso","definition":"Que pone atención para no cometer errores","example":"El conductor fue cuidadoso en cada curva.","level":"support","canIntegrate":true},
      {"word":"tranquilo","definition":"Relajado y sin nervios, incluso bajo presión","example":"El piloto se mantuvo tranquilo durante la tormenta.","level":"support","canIntegrate":true},
      {"word":"franco","definition":"Abierto y directo, aunque la verdad incomode","example":"Fue franco conmigo sobre mi ensayo.","level":"core","canIntegrate":true},
      {"word":"elocuente","definition":"Que habla o escribe con claridad y fuerza","example":"El orador elocuente conquistó a toda la sala.","level":"core","canIntegrate":true},
      {"word":"pragmático","definition":"Que resuelve los problemas de forma práctica y realista","example":"El equipo eligió un plan pragmático en lugar de uno ideal.","level":"core","canIntegrate":true},
      {"word":"perseverante","definition":"Que no se rinde y sigue intentándolo aunque sea difícil","example":"El perseverante estudiante practicó cada día.","level":"core","canIntegrate":true},
      {"word":"escéptico","definition":"Que duda de algo hasta tener pruebas","example":"El juez estaba escéptico ante la historia del testigo.","level":"core","canIntegrate":true},
      {"word":"meticuloso","definition":"Que cuida cada pequeño detalle con mucha atención","example":"El ingeniero fue meticuloso con cada medición.","level":"core","canIntegrate":true},
      {"word":"persuasivo","definition":"Capaz de convencer a otros de creer o hacer algo","example":"Su argumento persuasivo cambió la opinión de todos.","level":"core","canIntegrate":true},
      {"word":"reticente","definition":"Poco dispuesto a hacer algo y con dudas al respecto","example":"Era reticente a admitir que había perdido.","level":"core","canIntegrate":true},
      {"word":"conciso","definition":"Que expresa mucho con pocas palabras","example":"Un buen resumen es claro y conciso.","level":"core","canIntegrate":true},
      {"word":"benévolo","definition":"Amable y con deseos de ayudar a los demás","example":"El anciano benévolo compartía su comida con quien lo pidiera.","level":"challenge","canIntegrate":true},
      {"word":"ubicuo","definition":"Que está presente en todas partes a la vez","example":"Hoy el móvil es ubicuo en la vida diaria.","level":"challenge","canIntegrate":true},
      {"word":"lúcido","definition":"Claro y fácil de entender","example":"El profesor lúcido explicó el teorema.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '96e0ea48-1308-5493-a6bd-d6aef3d0dc0c', $t$Duodécimo — Dinero y economía$t$,
    $t$Palabras de economía que aparecen en la vida real, desde ahorrar unas monedas hasta los precios de todo un país. Cada palabra tiene un significado claro y una oración que muestra su uso.$t$,
    'es', 'grade_12', 'general', 'LC-ES-G12-ECONOMIA',
    $j$[
      {"word":"dinero","definition":"Monedas y billetes que se usan para comprar cosas","example":"Ahorré dinero para comprar una bici nueva.","level":"support","canIntegrate":true},
      {"word":"precio","definition":"Cantidad de dinero que se paga por algo","example":"El precio del pan subió este año.","level":"support","canIntegrate":true},
      {"word":"trabajo","definition":"Actividad regular que una persona realiza para ganar dinero","example":"Mi tía consiguió un trabajo en el hospital.","level":"support","canIntegrate":true},
      {"word":"ahorro","definition":"Dinero que se guarda para usarlo más adelante","example":"Nuestro ahorro pagará el viaje del próximo verano.","level":"support","canIntegrate":true},
      {"word":"presupuesto","definition":"Plan de cuánto dinero gastar y cuánto guardar","example":"Hicimos un presupuesto para las compras de cada mes.","level":"core","canIntegrate":true},
      {"word":"beneficio","definition":"Dinero que gana un negocio después de pagar sus gastos","example":"La tienda tuvo buen beneficio este año.","level":"core","canIntegrate":true},
      {"word":"deuda","definition":"Dinero que una persona debe a otra","example":"Por fin pagó su deuda con el banco.","level":"core","canIntegrate":true},
      {"word":"salario","definition":"Dinero que se paga a un trabajador por su labor","example":"El nuevo salario ayuda a pagar el alquiler.","level":"core","canIntegrate":true},
      {"word":"mercado","definition":"Lugar o sistema donde se compran y venden productos","example":"Los agricultores vendieron verduras frescas en el mercado.","level":"core","canIntegrate":true},
      {"word":"oferta","definition":"Cantidad de un producto disponible para comprar","example":"Cuando la oferta de maíz baja, los precios suben.","level":"core","canIntegrate":true},
      {"word":"demanda","definition":"Cantidad de personas que quieren comprar un producto","example":"La gran demanda del juego agotó las existencias.","level":"core","canIntegrate":true},
      {"word":"invertir","definition":"Poner dinero en algo para ganar más en el futuro","example":"Decidió invertir en una empresa pequeña.","level":"core","canIntegrate":true},
      {"word":"interés","definition":"Dinero extra que se paga por pedir prestado o se gana al ahorrar","example":"El banco pagó interés por mis ahorros.","level":"core","canIntegrate":true},
      {"word":"inflación","definition":"Aumento general y continuo de los precios","example":"La inflación hace que tu dinero compre menos.","level":"challenge","canIntegrate":true},
      {"word":"arancel","definition":"Impuesto sobre productos que llegan de otro país","example":"El gobierno puso un arancel al acero importado.","level":"challenge","canIntegrate":true},
      {"word":"déficit","definition":"Situación en la que se gasta más de lo que entra","example":"El país tuvo un déficit tras la costosa guerra.","level":"challenge","canIntegrate":true}
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
