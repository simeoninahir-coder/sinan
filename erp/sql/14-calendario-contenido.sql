-- =====================================================================
-- SINAN ERP · 14 - CALENDARIO DE CONTENIDO (traspaso desde Notion)
-- · Agrega "objetivo" a publicaciones e ideas (Motivar, Educar, Ayudar,
--   Conectar, Anunciar, Vender).
-- · Carga los 5 pilares de contenido, las publicaciones con fecha y el
--   banco de ideas sin fecha. Solo carga si todavía no hay publicaciones.
-- =====================================================================
alter table publicaciones add column if not exists objetivo text;
alter table ideas_contenido add column if not exists objetivo text;

do $$
begin
  if exists (select 1 from publicaciones) then return; end if;

  insert into pilares_contenido (nombre, color, descripcion)
  select v.* from (values
    ('La comunidad se mueve', '#477ab3', 'Mujeres que se mueven juntas. Pertenencia, animarse a ir sola, conocer gente nueva, preguntas que abren conversación. Es el corazón de Sinan: que la seguidora sienta que hay un lugar para ella.'),
    ('En movimiento', '#9cc9e8', 'La historia propia de moverse: la maratón, los 5k, la rutina, por qué hago ejercicio. Motivación real, sin filtro, desde la experiencia.'),
    ('El producto por dentro', '#d9b48f', 'Los productos en uso: qué entra, para qué rutina sirve cada uno, comparaciones (Cielo vs Rufina), combos por presupuesto, regalos. El producto acompaña el movimiento.'),
    ('Detrás de Sinan', '#c9776c', 'La marca por dentro: cómo nace un producto, qué cuesta emprender, la feria, los miedos y los logros. Lo que hace que Sinan no sea un catálogo más.'),
    ('Encuentros Sinan', '#e0a64b', 'Todo lo de los eventos: anuncio de fecha, invitadas, cronograma, qué llevar, cupos, cobertura en vivo y resumen. El evento es la puerta de entrada a la comunidad.')
  ) as v(nombre, color, descripcion)
  where not exists (select 1 from pilares_contenido p where p.nombre = v.nombre);

  insert into publicaciones (fecha, red, formato, pilar_id, titulo, objetivo, estado, texto)
  select p.fecha::date, 'Instagram', p.formato, (select id from pilares_contenido where nombre = p.pilar limit 1), p.titulo, p.objetivo, p.estado, p.texto
  from (values
    -- ---------- Agosto ----------
    ('2026-08-05', 'Historia', 'Detrás de Sinan', '¿Desde dónde nos seguís?', 'Motivar', 'Publicada', null),
    ('2026-08-12', 'Reel', 'En movimiento', 'Esto te va a parecer medio loco, pero este año me voy a animar a algo que tenía en mente', 'Motivar', 'Publicada', null),
    ('2026-08-12', 'Historia', 'El producto por dentro', 'Decime cuál es tu rutina y te digo qué producto te recomiendo', 'Ayudar', 'Publicada', null),
    ('2026-08-16', 'Carrusel', 'El producto por dentro', '7 cosas que nadie te dice antes de comprar un bolso deportivo', 'Educar', 'Publicada', null),
    ('2026-08-18', 'Historia', 'En movimiento', 'Corrí los 5k y esto pasó', 'Motivar', 'Publicada', null),
    ('2026-08-18', 'Reel', 'En movimiento', 'Nunca pensé que me iba a anotar a una maratón. Y sin embargo fui.', 'Motivar', 'Publicada', null),
    ('2026-08-20', 'Historia', 'Encuentros Sinan', 'Les dejo una pista', 'Anunciar', 'Publicada', null),
    ('2026-08-21', 'Carrusel', 'La comunidad se mueve', 'Nunca hice algo así y me muero de los nervios…', 'Ayudar', 'Publicada', null),
    ('2026-08-25', 'Historia', 'Encuentros Sinan', 'Hoy anuncio en reel lo que tanto esperaban', 'Anunciar', 'Publicada', null),
    ('2026-08-25', 'Reel', 'Encuentros Sinan', 'El 19 de septiembre Sinan hace algo que nunca hizo', 'Anunciar', 'Publicada', null),
    ('2026-08-28', 'Carrusel', 'La comunidad se mueve', 'Presentación de la comunidad Sinan (estilo Girls Club)', 'Conectar', 'Publicada',
     E'Formato: foto de fondo oscurecida + texto encima.\n\nSlide 1 (portada): foto tuya en la plaza o al aire libre.\n"Bienvenida a la comunidad de mujeres que estabas buscando." SINAN. "Todo lo que necesitás saber antes de sumarte"\n\nSlide 2: foto de mujeres moviéndose, oscurecida.\n"Menos excusas. Más movimiento. Más comunidad."\n\nSlide 3: fondo oscuro con foto de plaza.\n"Hacer amigas de adulta es difícil. No porque algo esté mal en vos, sino porque nadie te da los espacios para hacerlo. Sinan existe para eso. Somos una comunidad de mujeres que se mueven juntas, se conocen y se acompañan."\n\nSlide 4: fondo oscuro, texto claro.\n"Es para vos si... querés moverte pero no sabés por dónde empezar; buscás un espacio sin juicio y sin presión; querés conocer mujeres con las mismas ganas; querés crecer, pero acompañada; querés ser parte de algo. No necesitás tener nada resuelto para sumarte. Solo querer dejar de hacerlo sola."\n\nSlide 5 (cierre): foto tuya o fondo azul oscuro Sinan.\n"El primer encuentro es el 19 de septiembre. Al aire libre. Gratuito. En Zona Oeste. ¿Te sumás?"'),
    ('2026-08-30', 'Historia', 'Detrás de Sinan', 'Video del bolso Cielo: el detrás de escena', 'Conectar', 'Publicada', null),
    -- ---------- Septiembre ----------
    ('2026-09-01', 'Historia', 'El producto por dentro', '¿Cuál es la diferencia entre el bolso Cielo y el bolso Rufina?', 'Educar', 'Publicada', null),
    ('2026-09-01', 'Historia', 'El producto por dentro', 'Los dos bolsos juntos: ¿cuál se adapta mejor a tu rutina?', 'Ayudar', 'Publicada', null),
    ('2026-09-04', 'Carrusel', 'En movimiento', 'El cuerpo que no se mueve, duele', 'Educar', 'Publicada', null),
    ('2026-09-07', 'Historia', 'La comunidad se mueve', '¿Te da vergüenza ir a algo nuevo sin conocer a nadie?', 'Conectar', 'Publicada', null),
    ('2026-09-08', 'Reel', 'La comunidad se mueve', 'Querés moverte pero sola no te da. Y acompañada no tenés.', 'Motivar', 'Publicada', null),
    ('2026-09-09', 'Historia', 'Detrás de Sinan', 'Ya empiezo a pensar en los productos para la nueva temporada', 'Conectar', 'Publicada',
     E'"Ya empiezo a pensar en los productos para la nueva temporada. ¿Qué les gustaría ver en Sinan?"\nCaja de respuestas abierta.'),
    ('2026-09-10', 'Carrusel', 'El producto por dentro', 'El neceser que soluciona el caos de tu cartera', 'Vender', 'Publicada', null),
    ('2026-09-11', 'Historia', 'Encuentros Sinan', 'Me preguntaron de qué se trata el encuentro del 19', 'Educar', 'Publicada', null),
    ('2026-09-12', 'Carrusel', 'Encuentros Sinan', 'Paso a recordarte que…', 'Anunciar', 'Publicada', null),
    ('2026-09-14', 'Historia', 'Encuentros Sinan', 'Punto de retiro de productos antes del evento', 'Ayudar', 'Publicada', 'Semana: recta final.'),
    ('2026-09-14', 'Reel', 'Encuentros Sinan', 'Ella es Jaqueline y va a estar en el evento del 19 de septiembre', 'Anunciar', 'Publicada', null),
    ('2026-09-16', 'Historia', 'Encuentros Sinan', 'Qué llevar al evento (ropa cómoda, agua, buenas medias)', 'Ayudar', 'Publicada', null),
    ('2026-09-16', 'Reel', 'En movimiento', 'Nueva estación, nueva energía', 'Motivar', 'Publicada', null),
    ('2026-09-22', 'Reel', 'Encuentros Sinan', '¿Cómo describís el evento de hoy?', 'Conectar', 'Publicada', null),
    ('2026-09-29', 'Reel', 'Detrás de Sinan', 'Nadie tiene la obligación de apoyar mi emprendimiento', 'Conectar', 'Publicada', null),
    -- ---------- Octubre ----------
    ('2026-10-02', 'Carrusel', 'El producto por dentro', '¿No sabés qué regalarle a tu mamá?', 'Vender', 'Publicada', null),
    ('2026-10-02', 'Historia', 'Encuentros Sinan', 'En estos días diremos la fecha del segundo evento de mujeres', 'Anunciar', 'Publicada', null),
    ('2026-10-09', 'Carrusel', 'Detrás de Sinan', 'Hace 3 años no podía ni aparecer en cámara…', 'Conectar', 'Publicada', null),
    ('2026-10-09', 'Historia', 'El producto por dentro', '¿Ya pensaste en el regalo del Día de la Madre?', 'Vender', 'Publicada', null),
    ('2026-10-12', 'Reel', 'El producto por dentro', '¿Qué podés comprar con $ 40.000 en Sinan?', 'Vender', 'En preparación',
     E'Idea: 3 combos de menos de $ 40.000 pensados como regalo para el Día de la Madre (domingo 18/10).\n\nCombo 1: Bolso Rufina ($ 37.500).\nCombo 2: Cartera Venice ($ 28.000) + Neceser ($ 8.500) = $ 36.500.\nCombo 3: Billetera Kaira ($ 14.500) + Neceser Lua ($ 15.500) + Llavero Lua ($ 5.600) = $ 35.600.\n\nCierre: "Escribime y te lo reservo antes del domingo. El sábado 17 también estoy en la feria."\nPrecios del sistema al 12/10. Antes de grabar, revisá el stock (del Rufina queda 1).'),
    ('2026-10-12', 'Historia', 'El producto por dentro', 'Compartir el reel de los $ 40.000: ¿qué combo te llevás?', 'Vender', 'Idea',
     'Propuesta para el espacio vacío del 12/10. Compartir el reel con un sticker de encuesta: Combo 1 / Combo 2 / Combo 3. A las que respondan, escribirles por privado.'),
    ('2026-10-14', 'Reel', 'Encuentros Sinan', 'Anunciamos la fecha del segundo encuentro', 'Anunciar', 'En preparación',
     E'Clips del primer encuentro (19/9) y cierre con la fecha grande.\n"El 19 de septiembre nos movimos juntas por primera vez. Volvemos. Sábado 21 de noviembre, 10 h, Plaza Altos de Laferrere. Entrada $ 4.000. Solo 15 lugares. Escribime para anotarte."'),
    ('2026-10-14', 'Historia', 'Encuentros Sinan', 'Hoy anunciamos la fecha del evento', 'Anunciar', 'En preparación',
     'A la mañana: "Hoy a la tarde anuncio la fecha" con sticker de cuenta regresiva. Después del reel, compartirlo con sticker "Me quiero anotar" o link al WhatsApp.'),
    ('2026-10-16', 'Carrusel', 'Encuentros Sinan', 'Mañana nos ves en la Feria del Día de la Madre', 'Anunciar', 'Idea',
     E'Propuesta para el carrusel vacío del 16/10.\nSlide 1: "Mañana estamos en la feria".\nSlide 2: sábado 17/10, 11 h, Ruiz de los Llanos y Sold. Sosa.\nSlide 3: qué vas a encontrar (bolsos, carteras, billeteras, neceseres, llaveros).\nSlide 4: regalos desde $ 5.600.\nSlide 5: medios de pago y "vení a saludarnos".'),
    ('2026-10-17', 'Historia', 'Detrás de Sinan', 'Estamos en la feria (en vivo)', 'Vender', 'Idea',
     'Propuesta nueva. Historias durante la feria: armado del puesto, productos, gente que se acerca. Ubicación y horario fijos en la primera historia.'),
    ('2026-10-18', 'Historia', 'La comunidad se mueve', 'Día de la Madre', 'Conectar', 'En preparación',
     'Saludo a todas las mamás (y a la tuya). Foto propia o de clientas con sus mamás usando Sinan (con permiso). Sticker de pregunta: "¿Qué te enseñó tu mamá sobre cuidarte?"'),
    ('2026-10-19', 'Reel', 'Detrás de Sinan', 'Así fue la feria del Día de la Madre', 'Conectar', 'Idea',
     'Propuesta para el reel vacío del 19/10. Detrás de escena de la feria: armado, momentos lindos, agradecimiento a las que pasaron.'),
    ('2026-10-20', 'Reel', 'Encuentros Sinan', 'Se viene el segundo…', 'Anunciar', 'En preparación',
     'Teaser del segundo encuentro: clips del primero + "Se viene el segundo. Sábado 21/11." Recordar que son 15 lugares.'),
    ('2026-10-23', 'Carrusel', 'La comunidad se mueve', 'Lo que pasó en el primer encuentro', 'Motivar', 'Idea',
     'Propuesta para el carrusel vacío del 23/10. Fotos del 19/9 + frases de las chicas que fueron (usar las respuestas del reel del 22/9). Último slide: "El 21/11 hay segundo. ¿Venís?"'),
    ('2026-10-26', 'Historia', 'La comunidad se mueve', 'A veces lo que más necesitás no es descansar…', 'Motivar', 'En preparación',
     E'Reflexión corta:\n"A veces lo que más necesitás no es descansar. Es moverte con gente que te suma."'),
    ('2026-10-27', 'Reel', 'Encuentros Sinan', 'El 21 de noviembre vos y otras chicas más tenemos un encuentro', 'Anunciar', 'En preparación',
     'Revisar fecha: en Notion decía "14 de noviembre", pero el segundo evento está cargado el sábado 21/11. Corregí el título si la fecha real es otra.'),
    ('2026-10-30', 'Carrusel', 'Encuentros Sinan', 'Cronograma del evento', 'Educar', 'En preparación',
     'Un slide por momento: llegada y bienvenida (10 h), movimiento al aire libre, momento de compartir, productos Sinan, cierre. Completar con el cronograma real.'),
    -- ---------- Noviembre ----------
    ('2026-11-03', 'Reel', 'Detrás de Sinan', 'POV: armás un evento para mujeres…', 'Conectar', 'En preparación', null),
    ('2026-11-06', 'Carrusel', 'Encuentros Sinan', 'Pará, pará, pará: ¿todavía estás dudando en ir?', 'Motivar', 'En preparación',
     'Un slide por cada duda con su respuesta: "no conozco a nadie" (la mayoría fue sola), "no estoy en forma" (es para todos los niveles), "me da vergüenza", "no sé qué llevar". Cierre: quedan X lugares.'),
    ('2026-11-10', 'Historia', 'Encuentros Sinan', 'Quedan pocos lugares para el 21/11', 'Anunciar', 'Idea',
     'Propuesta nueva. Mirar en Eventos cuántos lugares quedan y publicarlo con sticker de link o "escribime".'),
    ('2026-11-13', 'Carrusel', 'El producto por dentro', 'Lo que llevo en mi bolso para moverme', 'Ayudar', 'Idea',
     'Propuesta nueva para equilibrar los pilares. Abrir el bolso y mostrar qué llevás: botella, neceser, billetera, llavero. Cada slide, un producto Sinan con su uso.'),
    ('2026-11-17', 'Reel', 'En movimiento', 'Lo que me cambió desde que me empecé a mover', 'Motivar', 'Idea',
     'Propuesta nueva. Seguir la historia de la maratón y los 5k: qué cambió en estos meses.'),
    ('2026-11-19', 'Historia', 'Encuentros Sinan', 'Qué llevar al encuentro (ropa cómoda, agua, buenas medias)', 'Ayudar', 'Idea',
     'Propuesta nueva. Funcionó en el primer evento, se repite.'),
    ('2026-11-20', 'Historia', 'Encuentros Sinan', 'Punto de retiro de productos antes del encuentro', 'Ayudar', 'Idea',
     'Propuesta nueva. Las que compraron pueden retirar en el encuentro.'),
    ('2026-11-21', 'Historia', 'Encuentros Sinan', 'Segundo encuentro en vivo', 'Conectar', 'Idea',
     'Propuesta nueva. Historias durante el encuentro. Pedir permiso para mostrar caras.'),
    ('2026-11-24', 'Reel', 'La comunidad se mueve', 'Así fue el segundo encuentro', 'Motivar', 'Idea',
     'Propuesta nueva. Resumen del 21/11 con las voces de las chicas.')
  ) as p(fecha, formato, pilar, titulo, objetivo, estado, texto);

  insert into ideas_contenido (titulo, pilar_id, formato, objetivo, prioridad, usada)
  select i.titulo, (select id from pilares_contenido where nombre = i.pilar limit 1), i.formato, i.objetivo, i.prioridad, false
  from (values
    ('¿Qué es lo que más postergás hacer por vos?', 'La comunidad se mueve', 'Historia', 'Conectar', 'Media'),
    ('¿Cuándo fue la última vez que hiciste algo solo para vos?', 'La comunidad se mueve', 'Historia', 'Conectar', 'Media'),
    ('No hace falta que sea perfecto. Hace falta que sea hoy.', 'La comunidad se mueve', 'Historia', 'Motivar', 'Media'),
    ('Si pudieras elegir uno ahora mismo, ¿cuál sería?', 'El producto por dentro', 'Historia', 'Vender', 'Alta'),
    ('Sinan no es solo un bolso. Es lo que agarrás cuando elegís moverte.', 'Detrás de Sinan', 'Historia', 'Conectar', 'Media'),
    ('Por esta razón hago ejercicio (y seguro te deja pensando)', 'En movimiento', 'Historia', 'Motivar', 'Media'),
    ('Si tenés que renovar tu mochila y querés tener todo ordenado y encontrar las cosas fácil…', 'El producto por dentro', 'Reel', 'Ayudar', 'Alta')
  ) as i(titulo, pilar, formato, objetivo, prioridad);
end $$;

-- Semana (ej: Recta final) para agrupar publicaciones
alter table publicaciones add column if not exists semana text;
