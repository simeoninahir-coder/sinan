/**
 * SINAN - Datos de productos, resenias y configuracion
 * Editar texto entre comillas. Guardar y refrescar (F5).
 */

window.SINAN_DATA = {
  marca: {
    claim: 'Movete a tu ritmo',
    subclaim: 'Accesorios que se adaptan a tu ritmo, especiales para mujeres que buscan comodidad y bienestar.',
    historia: 'Sinan nacio porque creo que lo que llevas todos los dias te tiene que hacer sentir bien. Cada bolso, mochila o billetera lo elijo y lo armo pensandote: que sea comodo, lindo y que dure.',
    instagram: 'https://www.instagram.com/sinan.bags/',
    tiendanube: 'https://sinan.mitiendanube.com',
    whatsapp: '5491126724433',
    email: 'hola@sinan.com.ar',
    ciudad: 'Argentina',
    codigoBienvenida: 'BIENVENIDA10'
  },

  config: {
    brevo: {
      apiKey: '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',
      listId: '3'
    }
  },

  categorias: [
    { id: 'bolsos',     nombre: 'Bolsos',     descripcion: 'Para llevar lo importante sin renunciar al estilo.' },
    { id: 'mochilas',   nombre: 'Mochilas',   descripcion: 'Comodas, organizadas, listas para tu dia.' },
    { id: 'carteras',   nombre: 'Carteras',   descripcion: 'Companeras de salidas, citas y momentos especiales.' },
    { id: 'billeteras', nombre: 'Billeteras', descripcion: 'Lo justo y necesario, siempre a mano.' },
    { id: 'llaveros',   nombre: 'Llaveros',   descripcion: 'Detalles que hacen la diferencia.' },
    { id: 'accesorios', nombre: 'Accesorios', descripcion: 'Esos toques especiales para vos o para regalar.' },
    { id: 'medias',     nombre: 'Medias',     descripcion: 'Detalles que se notan, suavidad que se siente.' },
    { id: 'ofertas',    nombre: 'Ofertas',    descripcion: 'Lindos productos a un precio especial.' }
  ],

  resenas: [
    {
      estrellas: 5,
      texto: 'Las medias son re comodas.',
      autor: 'Sonia M.',
      producto: 'Medias'
    }
  ],

  productos: [
    {
      id: 'billetera-kaira',
      nombre: 'Billetera Kaira',
      categoria: 'billeteras',
      precio: 14500,
      destacado: true,
      descripcion: 'De material sintetico resistente, con un diseno moderno en relieve. Compacta, practica y con todo organizado para tu dia.',
      stock: 2,
      imagenes: ['assets/productos/billetera-kaira-1.jpg']
    },
    {
      id: 'billera-kira',
      nombre: 'Billetera Kira',
      categoria: 'billeteras',
      precio: 14500,
      descripcion: 'Nylon resistente y super liviana. Chiquita, comoda y perfecta para el dia a dia.',
      stock: 1,
      imagenes: ['assets/productos/billetera-kira-1.jpg', 'assets/productos/billetera-kira-2.jpg', 'assets/productos/billetera-kira-3.jpg']
    },
    {
      id: 'billetera-pocket',
      nombre: 'Billetera Pocket',
      categoria: 'billeteras',
      precio: 18900,
      descripcion: 'Eco cuero con cierre. Seis compartimientos para tarjetas y dos para billetes.',
      stock: 2,
      imagenes: ['assets/productos/billetera-pocket-1.jpg', 'assets/productos/billetera-pocket-2.jpg']
    },
    {
      id: 'bolso-kala4',
      nombre: 'Bolso Kala',
      categoria: 'bolsos',
      precio: 38700,
      descripcion: 'Bolso deportivo impermeable. Bolsillo lateral para zapatillas y compartimento para lo humedo. Plegable y resistente.',
      stock: 1,
      imagenes: ['assets/productos/bolso-kala-1.jpg', 'assets/productos/bolso-kala-2.jpg']
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
      descripcion: 'Lienzo natural con estampa You are a cherry on top. Ideal para llevar lo del dia con onda y fresca.',
      stock: 3,
      imagenes: ['assets/productos/tote-bag-cherry.jpg']
    },
    {
      id: 'mochila-zafira',
      nombre: 'Mochila Zafira',
      categoria: 'mochilas',
      precio: 30000,
      destacado: true,
      descripcion: 'Tela de avion ultra liviana. Bolsillo interno, externo con cierre y laterales. Simple, comoda y lista para moverte.',
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
      nombre: 'Cartera Venice (Blanco)',
      categoria: 'ofertas',
      precio: 28000,
      precioAnterior: 31500,
      descripcion: 'Estructurada, con correa regulable. Disponible en blanco. 21,5 x 12 x 6,5 cm.',
      stock: 2,
      imagenes: ['assets/productos/cartera-venice-blanco.jpg']
    },
    {
      id: 'mini-bag-lucy',
      nombre: 'Mini bag Lucy',
      categoria: 'ofertas',
      precio: 24000,
      precioAnterior: 25900,
      descripcion: 'Diseno con hebilla desmontable, forrada en su interior, ideal para levantar cualquier look.',
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
      descripcion: 'Disponible en negro y rosa. Pequenito y con onda.',
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
      nombre: 'Funda de saten',
      categoria: 'accesorios',
      precio: 8000,
      descripcion: 'Cuida tu pelo y piel mientras dormis. Reduce el frizz, evita marcas y mantiene la hidratacion.',
      stock: 3,
      imagenes: ['assets/productos/funda-saten-1.jpg']
    },
    {
      id: 'medias-offline',
      nombre: 'Medias Offline',
      categoria: 'medias',
      precio: 4000,
      destacado: true,
      descripcion: 'Diseno minimalista blanco con detalle lavanda y OFFLINE en la cana. Hipoalergenicas y suaves.',
      stock: 1,
      imagenes: ['assets/productos/medias-offline-1.jpg', 'assets/productos/medias-offline-2.jpg']
    },
    {
      id: 'medias-osito-corazon',
      nombre: 'Medias Osito Corazon',
      categoria: 'medias',
      precio: 4000,
      descripcion: 'Rosa pastel con osito en corazon fucsia. Tercio de cana reforzado, suaves y con onda tierna.',
      stock: 1,
      imagenes: ['assets/productos/medias-osito-corazon-1.jpg', 'assets/productos/medias-osito-corazon-2.jpg']
    },
    {
      id: 'medias-soff',
      nombre: 'Medias Soff',
      categoria: 'medias',
      precio: 4000,
      descripcion: 'Suaves, hipoalergenicas y con puntera reforzada para el dia a dia. Disponibles en distintos colores con rayitas, escribinos por WhatsApp para elegir el tuyo.',
      stock: 8,
      imagenes: ['assets/productos/medias-soff-1.png', 'assets/productos/medias-soff-2.png', 'assets/productos/medias-soff-3.png', 'assets/productos/medias-soff-4.png', 'assets/productos/medias-soff-5.png', 'assets/productos/medias-soff-6.png', 'assets/productos/medias-soff-7.png', 'assets/productos/medias-soff-8.png']
    },
    {
      id: 'bolso-rufina',
      nombre: 'Bolso Rufina',
      categoria: 'bolsos',
      precio: 37500,
      descripcion: 'De regalo, una media Sinan. Bolso deportivo de nylon resistente, 32 litros (50x28x23 cm), tres compartimentos internos, correa ajustable y desmontable, plegable. Violeta liso.',
      stock: 0,
      proximamente: true,
      imagenes: ['assets/productos/bolso-rufina-1.jpg', 'assets/productos/bolso-rufina-2.jpg', 'assets/productos/bolso-rufina-3.jpg', 'assets/productos/bolso-rufina-4.jpg', 'assets/productos/bolso-rufina-5.jpg']
    }
  ]
};
