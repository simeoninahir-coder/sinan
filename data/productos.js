/**
 * SINAN - Datos de productos, resenias y configuracion
 * Editar texto entre comillas. Guardar y refrescar (F5).
 */

window.SINAN_DATA = {
  marca: {
    claim: 'Movete a tu ritmo',
    subclaim: 'Accesorios que se adaptan a tu ritmo, especiales para mujeres que buscan comodidad y bienestar.',
    historia: 'Sinan nació porque creo que lo que llevás todos los días te tiene que hacer sentir bien. Cada bolso, mochila o billetera lo elijo y lo armo pensándote: que sea cómodo, lindo y que dure.',
    instagram: 'https://www.instagram.com/sinan.bags/',
    tiendanube: 'https://sinan.mitiendanube.com',
    whatsapp: '5491126724433',
    ciudad: 'Argentina',
    heroFotos: ['assets/productos/hero.jpg']
  },

  categorias: [
    { id: 'bolsos',     nombre: 'Bolsos',     descripcion: 'Para llevar lo importante sin renunciar al estilo.' },
    { id: 'mochilas',   nombre: 'Mochilas',   descripcion: 'Cómodas, organizadas, listas para tu día.' },
    { id: 'carteras',   nombre: 'Carteras',   descripcion: 'Compañeras de salidas, citas y momentos especiales.' },
    { id: 'billeteras', nombre: 'Billeteras', descripcion: 'Lo justo y necesario, siempre a mano.' },
    { id: 'llaveros',   nombre: 'Llaveros',   descripcion: 'Detalles que hacen la diferencia.' },
    { id: 'accesorios', nombre: 'Accesorios', descripcion: 'Esos toques especiales para vos o para regalar.' },
    { id: 'medias',     nombre: 'Medias',     descripcion: 'Detalles que se notan, suavidad que se siente.' },
    { id: 'ofertas',    nombre: 'Ofertas',    descripcion: 'Lindos productos a un precio especial.' }
  ],

  resenas: [
    {
      estrellas: 5,
      texto: 'Las medias son re cómodas.',
      autor: 'Sonia M.',
      producto: 'Medias'
    },
    {
      estrellas: 5,
      texto: 'Muy lindas las medias, linda calidad.',
      autor: 'Cecilia S.',
      producto: 'Medias'
    },
    {
      estrellas: 5,
      texto: 'Son hermosas realmente. Hoy sentí el pelo más sedoso que nunca, la solución de las pelo finoli jajaja',
      autor: 'Giovanna E.',
      producto: 'Funda de satén'
    },
    {
      estrellas: 5,
      texto: 'Gracias !! Pame está hermoso el bolso 💗',
      autor: 'Mariaelena G.',
      producto: 'Bolso Cielo',
      foto: 'assets/resenas/resena-mariaelena-bolso-cielo.jpg'
    },
    {
      estrellas: 5,
      texto: 'Mi mejor amiga me regaló una mochila de Sinan y la uso para el trabajo, la amooo',
      autor: 'Dai F.',
      producto: 'Mochila Zafira'
    }
  ],

  productos: [
    {
      id: 'billetera-kaira',
      nombre: 'Billetera Kaira',
      categoria: 'billeteras',
      precio: 14500,
      destacado: true,
      descripcion: 'De material sintético resistente, con un diseño moderno en relieve. Compacta, práctica y con todo organizado para tu día.',
      stock: 2,
      imagenes: ['assets/productos/billetera-kaira-1.jpg'],
      colores: [
        { nombre: 'Negro', hex: '#1A1A1A', imagenes: ['assets/productos/billetera-kaira-1.jpg', 'assets/productos/billetera-kaira-negro-2.jpg'] },
        { nombre: 'Celeste', hex: '#9CC9E8', imagenes: ['assets/productos/billetera-kaira-celeste-1.jpg', 'assets/productos/billetera-kaira-celeste-2.jpg'] }
      ]
    },
    {
      id: 'billera-kira',
      nombre: 'Billetera Kira',
      categoria: 'billeteras',
      precio: 14500,
      descripcion: 'Nylon resistente y súper liviana. Chiquita, cómoda y perfecta para el día a día.',
      stock: 2,
      imagenes: ['assets/productos/billetera-kira-1.jpg', 'assets/productos/billetera-kira-2.jpg', 'assets/productos/billetera-kira-3.jpg']
    },
    {
      id: 'billetera-pocket',
      nombre: 'Billetera Pocket',
      categoria: 'billeteras',
      precio: 18900,
      descripcion: 'Eco cuero con cierre. Seis compartimientos para tarjetas y dos para billetes.',
      stock: 2,
      imagenes: ['assets/productos/billetera-pocket-0.jpg', 'assets/productos/billetera-pocket-1.jpg', 'assets/productos/billetera-pocket-2.jpg']
    },
    {
      id: 'bolso-cielo',
      nombre: 'Bolso Cielo',
      categoria: 'bolsos',
      precio: 36700,
      destacado: true,
      descripcion: 'Un bolso que se adapta a tu movimiento. Dos compartimentos principales con cierre, espacio para zapatillas y bolsillos para lo esencial.',
      stock: 1,
      imagenes: ['assets/productos/bolso-cielo-1.jpg', 'assets/productos/bolso-cielo-2.jpg', 'assets/productos/bolso-cielo-3.jpg']
    },
    {
      id: 'tote-bag-lienzo',
      nombre: 'Tote Bag Cherry',
      categoria: 'bolsos',
      precio: 8300,
      descripcion: 'Lienzo natural con estampa You are a cherry on top. Ideal para llevar lo del día con onda y fresca.',
      stock: 3,
      imagenes: ['assets/productos/tote-bag-cherry.jpg']
    },
    {
      id: 'mochila-zafira',
      nombre: 'Mochila Zafira',
      categoria: 'mochilas',
      precio: 30000,
      destacado: true,
      descripcion: 'Tela de avión ultra liviana. Bolsillo interno, externo con cierre y laterales. Simple, cómoda y lista para moverte.',
      stock: 1,
      imagenes: ['assets/productos/mochila-zafira-1.jpg', 'assets/productos/mochila-zafira-2.jpg', 'assets/productos/mochila-zafira-3.jpg']
    },
    {
      id: 'mochila-lira-beige',
      nombre: 'Mochila Lira (Beige)',
      categoria: 'mochilas',
      precio: 47900,
      descripcion: 'Compartimiento principal con separador y cierre, bolsillo frontal y dos laterales. Interior forrado y tiras regulables.',
      stock: 1,
      imagenes: ['assets/productos/mochila-lira-beige-1.jpg', 'assets/productos/mochila-lira-beige-2.jpg']
    },
    {
      id: 'mochila-lira-negro',
      nombre: 'Mochila Lira (Negro)',
      categoria: 'mochilas',
      precio: 47900,
      descripcion: 'La misma Lira que enamora, ahora en negro. Estructura organizada, materiales que duran y versatilidad total.',
      stock: 1,
      imagenes: ['assets/productos/mochila-lira-negro-1.jpg', 'assets/productos/mochila-lira-negro-2.jpg', 'assets/productos/mochila-lira-negro-3.jpg', 'assets/productos/mochila-lira-negro-4.jpg']
    },
    {
      id: 'bandolera-anita',
      nombre: 'Bandolera Anita',
      categoria: 'carteras',
      precio: 25900,
      descripcion: 'Tela impermeable, forrada por dentro con bolsillo interno con cierre. Mide 21x25 cm.',
      stock: 1,
      imagenes: ['assets/productos/bandolera-anita-1.jpg']
    },
    {
      id: 'cartera-venice',
      nombre: 'Cartera Venice',
      categoria: 'ofertas',
      precio: 28000,
      precioAnterior: 31500,
      descripcion: 'Estructurada, con correa regulable. 21,5 x 12 x 6,5 cm.',
      stock: 2,
      imagenes: ['assets/productos/cartera-venice-blanco.jpg'],
      colores: [
        { nombre: 'Blanco', hex: '#F2F0EA', imagenes: ['assets/productos/cartera-venice-blanco.jpg'] },
        { nombre: 'Negro', hex: '#1A1A1A', imagenes: ['assets/productos/cartera-venice-negro-1.jpg'] }
      ]
    },
    {
      id: 'mini-bag-lucy',
      nombre: 'Mini bag Lucy',
      categoria: 'ofertas',
      precio: 24000,
      precioAnterior: 25900,
      descripcion: 'Diseño con hebilla desmontable, forrada en su interior, ideal para levantar cualquier look.',
      stock: 2,
      imagenes: ['assets/productos/mini-bag-lucy-1.jpg', 'assets/productos/mini-bag-lucy-2.jpg']
    },
    {
      id: 'llavero-doni',
      nombre: 'Llavero Doni',
      categoria: 'llaveros',
      precio: 5600,
      descripcion: 'Disponible en rosa y beige. Ideal para regalar.',
      stock: 2,
      imagenes: ['assets/productos/llavero-doni-1.jpg', 'assets/productos/llavero-doni-2.jpg']
    },
    {
      id: 'llavero-lua',
      nombre: 'Llavero Lua',
      categoria: 'llaveros',
      precio: 5600,
      descripcion: 'Disponible en negro y rosa. Pequeñito y con onda.',
      stock: 2,
      imagenes: ['assets/productos/llavero-lua-1.jpg', 'assets/productos/llavero-lua-2.jpg', 'assets/productos/llavero-lua-3.jpg', 'assets/productos/llavero-lua-4.jpg']
    },
    {
      id: 'neceser',
      nombre: 'Neceser',
      categoria: 'accesorios',
      precio: 8500,
      descripcion: 'Compacto y prolijo, perfecto para viajes o para tener todo en orden.',
      stock: 1,
      imagenes: ['assets/productos/neceser-1.jpg']
    },
    {
      id: 'funda-de-saten',
      nombre: 'Funda de satén',
      categoria: 'accesorios',
      precio: 8000,
      descripcion: 'Cuida tu pelo y piel mientras dormís. Reduce el frizz, evita marcas y mantiene la hidratación.',
      stock: 1,
      imagenes: ['assets/productos/funda-saten-1.jpg']
    },
    {
      id: 'medias-offline',
      nombre: 'Medias Offline',
      categoria: 'medias',
      precio: 4000,
      descripcion: 'Diseño minimalista blanco con detalle lavanda y OFFLINE en la caña. Hipoalergénicas y suaves.',
      stock: 1,
      imagenes: ['assets/productos/medias-offline-1.jpg', 'assets/productos/medias-offline-2.jpg']
    },
    {
      id: 'medias-osito-corazon',
      nombre: 'Medias Osito Corazón',
      categoria: 'medias',
      precio: 4000,
      descripcion: 'Rosa pastel con osito en corazón fucsia. Tercio de caña reforzado, suaves y con onda tierna.',
      stock: 1,
      imagenes: ['assets/productos/medias-osito-corazon-1.jpg', 'assets/productos/medias-osito-corazon-2.jpg']
    },
    {
      id: 'medias-soff',
      nombre: 'Medias Soff',
      categoria: 'medias',
      precio: 4000,
      descripcion: 'Suaves, hipoalergénicas y con puntera reforzada para el día a día. Disponibles en distintos colores con rayitas, escribinos por WhatsApp para elegir el tuyo.',
      stock: 8,
      nuevo: true,
      imagenes: ['assets/productos/medias-soff-1.png', 'assets/productos/medias-soff-2.png', 'assets/productos/medias-soff-3.png', 'assets/productos/medias-soff-4.png', 'assets/productos/medias-soff-5.png', 'assets/productos/medias-soff-6.png', 'assets/productos/medias-soff-7.png', 'assets/productos/medias-soff-8.png']
    },
    {
      id: 'bolso-rufina',
      nombre: 'Bolso Rufina',
      categoria: 'bolsos',
      precio: 37500,
      destacado: true,
      descripcion: 'Bolso deportivo de nylon resistente, 32 litros (50x28x23 cm), tres compartimentos internos, correa ajustable y desmontable, plegable. Violeta liso. **+ una media de regalo**',
      stock: 2,
      nuevo: true,
      imagenes: ['assets/productos/bolso-rufina-1.jpg', 'assets/productos/bolso-rufina-2.jpg', 'assets/productos/bolso-rufina-3.jpg', 'assets/productos/bolso-rufina-4.jpg', 'assets/productos/bolso-rufina-5.jpg', 'assets/productos/bolso-rufina-6.jpg']
    },
    {
      id: 'neceser-rosita',
      nombre: 'Neceser Lua',
      categoria: 'accesorios',
      precio: 15500,
      nuevo: true,
      descripcion: 'Neceser 3 en 1 en tono rosa con detalles verde menta. Confeccionado en poliéster y PVC súper resistente, compacto y seguro para llevar todo ordenado en tus viajes o en el día a día. ¡Ideal también para regalar!',
      stock: 1,
      imagenes: ['assets/productos/neceser-rosita-1.jpg', 'assets/productos/neceser-rosita-2.jpg', 'assets/productos/neceser-rosita-3.jpg']
    },
    {
      id: 'neceser-celeste',
      nombre: 'Neceser Lua',
      categoria: 'accesorios',
      precio: 15500,
      nuevo: true,
      descripcion: 'Neceser 3 en 1 en tono celeste con detalle lila. Confeccionado en poliéster y PVC súper resistente, compacto y seguro para llevar todo ordenado en tus viajes o en el día a día. ¡Ideal también para regalar!',
      stock: 1,
      imagenes: ['assets/productos/neceser-celeste-1.jpg', 'assets/productos/neceser-celeste-2.jpg', 'assets/productos/neceser-celeste-3.jpg']
    },
    {
      id: 'neceser-negro',
      nombre: 'Neceser Lua',
      categoria: 'accesorios',
      precio: 15500,
      nuevo: true,
      descripcion: 'Neceser 3 en 1 todo en negro, súper versátil y combinable con todo. Confeccionado en poliéster y PVC súper resistente, compacto y seguro para llevar todo ordenado en tus viajes o en el día a día. ¡Ideal también para regalar!',
      stock: 2,
      imagenes: ['assets/productos/neceser-negro-1.jpg', 'assets/productos/neceser-negro-2.jpg', 'assets/productos/neceser-negro-3.jpg']
    }
  ]
};
