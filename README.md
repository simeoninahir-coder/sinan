# Sinan — Web v2 🌊

Web hecha a medida con tu identidad. **100% gratis, sin comisiones, sin tracking, ultra rápida.**

---

## 🛒 Cómo funciona la compra (sin Tiendanube ni comisiones)

1. La clienta toca **"Lo quiero ya"** en un producto → se abre WhatsApp con mensaje pre-armado.
2. Vos le pasás el link de pago de MercadoPago de ese producto.
3. La clienta paga y te manda el comprobante por WhatsApp.
4. Coordinan envío (Andreani, OCA, Correo, retiro, lo que prefieran).

**Si quiere varios productos:** toca **"+ Carrito"** en cada uno, después abre el carrito (botón abajo a la izquierda) y da **"Coordinar por WhatsApp"**. Te llega un solo mensaje con todos los productos + total.

---

## ✏️ Editar productos / reseñas / marca

Abrí `data/productos.js` con cualquier editor de texto. Está todo comentado y se entiende.

### Cambiar tu WhatsApp, IG, mail
Buscá el bloque `marca:` y cambiá los valores entre comillas.

### Asignar foto a un producto
En el producto correspondiente:
```js
imagen: 'assets/productos/foto-05.jpg',
```

### Agregar una reseña
En el array `resenas:`, sumá un objeto:
```js
{
  estrellas: 5,
  texto: 'La cartera Venice es un sueño...',
  autor: 'Cami P.',
  producto: 'Cartera Venice'
}
```

### Cambiar el código de descuento
En `marca:`, cambiá `codigoBienvenida: 'BIENVENIDA10'` por el que vos quieras.

---

## 📧 Conectar Brevo (newsletter te llega a vos)

Hoy: cuando alguien deja su mail, queda guardado solo en su navegador (no te llega).
Con Brevo configurado: **te llega notificación automática + queda en una lista que vos manejás**.

**Setup (5 minutos, gratis para siempre con hasta 9000 mails/mes):**

1. Creá cuenta en [brevo.com](https://brevo.com) (con tu mail).
2. Andá a **Contactos → Listas → "+ Nueva lista"**. Le ponés "Sinan Newsletter". Anotá el **ID** (un número).
3. Andá a **SMTP & API → API Keys → "+ Generate new key"**. Elegí versión 3. Copiá la API key (empieza con `xkeysib-...`).
4. Abrí `data/productos.js` y completá:
   ```js
   config: {
     brevo: {
       apiKey: 'xkeysib-tu-api-key-aca',
       listId: '2'  // el número de tu lista
     }
   },
   ```
5. Guardá y listo. Cada mail nuevo aparece en Brevo automáticamente.

**Bonus Brevo:** podés crear campañas de mail desde su panel para mandarles novedades, ofertas, etc. Plan gratis te alcanza de sobra.

---

## 🚀 Subirla gratis a internet (Cloudflare Pages)

1. Creá cuenta en [cloudflare.com](https://cloudflare.com).
2. Andá a **Workers & Pages → Create → Pages → Upload assets**.
3. Nombre del proyecto: `sinan` (o el que quieras).
4. Arrastrá toda la carpeta `Sinan-Web` (o un .zip).
5. Click en **Deploy site**. ¡Listo!

Tu web va a estar en `https://sinan.pages.dev` (HTTPS automático, sin cobros, sin caída).

**Si querés tu dominio propio (`sinan.com.ar`):**
- Compralo en NIC.ar.
- En Cloudflare Pages → Custom domains → Set up.
- Cloudflare te dice qué DNS configurar y queda andando.

---

## 📂 Estructura

```
Sinan-Web/
├── index.html          ← Estructura de la página
├── styles.css          ← Estilos (paleta, tipografías, layout)
├── script.js           ← Lógica (carrito, newsletter, reseñas)
├── README.md           ← Este archivo
├── data/
│   └── productos.js    ← TUS productos, marca, reseñas, config
└── assets/
    ├── logo-*.png       ← Logos en distintas variantes
    ├── isotipo*.png     ← Isotipo (la S/n)
    └── productos/       ← Tus fotos (foto-01.jpg, foto-02.jpg, etc.)
```

---

## ✅ Lo que ya está implementado

- ✓ Tu paleta exacta (#FFFFFF / #9CC9E8 / #4279B2)
- ✓ Tipografías Gilda Display + Poppins
- ✓ 19 productos cargados de tu Tiendanube (con descripciones, precios, ofertas)
- ✓ Compra por WhatsApp con mensaje pre-armado (cero comisiones)
- ✓ Mini-carrito multi-producto que arma un solo mensaje
- ✓ Sección de reseñas con estrellas
- ✓ Newsletter listo para conectar Brevo (10% off automático)
- ✓ Botón flotante WhatsApp para consultas
- ✓ Mobile responsive
- ✓ Headers de seguridad (CSP, nosniff, referrer policy)
- ✓ Sin cookies, sin trackers, sin terceros invasivos

---

## 🔜 Lo que queda hacer (vos)

1. **Mapear las 17 fotos** → me decís cuál foto va a cada producto y yo las asigno.
2. **Conectar Brevo** (5 min, opcional pero re recomendado).
3. **Probar el flujo de compra** desde el celu para que veas cómo se ve.
4. **Subir a Cloudflare Pages** (10 min).

Cualquier cambio que quieras, decime y lo hacemos juntas.
