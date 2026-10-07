# Sinan ERP · Cómo usarlo

Tu sistema de gestión: productos, stock, ventas, clientas, eventos, contenido, plata y equipo, todo en un solo lugar.

---

## 1. Qué es y cómo está organizado (la casa)

Pensalo como una **casa**:

- **El terreno y los cimientos → Supabase** (en internet). Ahí viven todos tus datos, guardados y con llave. Aunque se te rompa la compu, los datos siguen ahí.
- **La puerta con llave → el login.** Sin tu email y contraseña no se ve nada. Además, la base tiene una regla en *cada* tabla que dice "solo pasa quien entró con usuario" (se llama *Row Level Security*).
- **Las habitaciones → el menú, ordenado por departamentos** (tocás el nombre del departamento y se despliega):

| Departamento | Sección | Para qué sirve |
|---|---|---|
| — | **Inicio** | Lo que hay que hacer hoy (por preparar, entregar, cobrar, consultas, reponer), cómo viene el mes y gráficos. |
| **Ventas** | **Ventas** | Cada pedido con sus **pasos: Preparar → Entregar → Cobrar**, forma de entrega, responsable y quién lo cargó. Arriba, en grande, lo que falta. **El stock se descuenta solo.** |
| | **Clientes** | El CRM: **embudo de consultas** (clientes potenciales), su análisis, fichas de clientas, seguimientos y reportes. |
| **Logística** | **Inventario** | Productos y stock por color en un solo lugar (**lo que hay que reponer, primero y en rojo**), movimientos e **insumos y packaging**. |
| | **Envíos** | Tablero de lo que hay que preparar, entregar y cobrar, con la forma de entrega (Uber, punto de encuentro, correo…). |
| **Marketing** | **Estrategia y contenido** | Estrategia, objetivos, campañas, calendario de publicaciones, ideas, pilares y métricas de Instagram. |
| | **Eventos y ferias** | Encuentros, talleres y ferias: entrada o puesto, checklist, colaboradores, ventas, gastos y resultado. |
| **Administración** | **Finanzas** | Ventas (automáticas) + otros ingresos + gastos, resultado de cada mes y ganancia por producto. |
| | **Proveedores** | Quién te vende qué, en cuánto tiempo y cómo se le paga. |
| | **Equipo** | Personas, roles y tareas (lista para cuando se sumen empleadas). |
| | **Reportes** | Gráficos: más vendido, ventas por canal y medio de pago, resultado por evento, evolución mensual. |
| — | **Alertas** | Todo lo que necesita atención, ordenado por tema. |
| — | **Configuración** | Datos de la marca, redes, datos del negocio y stock mínimo general. |

- **Los planos → la carpeta `erp/`** de este proyecto:

```
erp/
├── index.html          ← la puerta de entrada (la pantalla que abrís)
├── COMO-USAR.md        ← este manual
├── css/estilos.css     ← colores, letras y diseño (paleta Sinan)
├── js/
│   ├── config.js       ← la dirección de tu base en Supabase
│   ├── nucleo/         ← las piezas que comparten todas las habitaciones
│   └── secciones/      ← una habitación por archivo (ventas.js, inventario.js, embudo.js…)
└── sql/                ← los planos de la base de datos
    ├── INSTALAR-TODO.sql          ← todo junto (es el que se pega en Supabase)
    ├── 01-tablas.sql              ← las tablas
    ├── 02-automatismos.sql        ← lo que la base hace sola (stock, totales)
    ├── 03-seguridad.sql           ← las llaves (solo usuarios logueados)
    ├── 04-datos-ejemplo.sql       ← datos de prueba
    ├── 05-borrar-datos-ejemplo.sql ← para dejar todo vacío
    ├── 06-datos-reales.sql        ← tus datos del Excel
    └── 07-v4-logistica-embudo.sql ← pasos de pedido, envíos y embudo
```

---

## 2. Cómo abrirlo y entrar

**Desde cualquier lugar (compu o celular):** entrá a **https://simeoninahir-coder.github.io/sinan/erp/**
*Tip:* guardalo en favoritos. En el celu, desde el navegador tocá "Agregar a la pantalla de inicio" y te queda como una app.

Cada vez que se suben cambios al proyecto en GitHub, esa página se actualiza sola en uno o dos minutos.

**Sin internet en la web, solo en esta compu:** carpeta del proyecto → `erp` → clic derecho en **`index.html`** → Abrir con Google Chrome.

Te aparece la pantalla de **Panel de gestión**: poné tu email y tu contraseña y tocá **Entrar**. La sesión queda abierta en ese navegador hasta que toques **Cerrar sesión** (abajo a la izquierda).

**En el celular:** el menú se abre con el botón ☰ de arriba a la izquierda. Es seguro tenerlo publicado: sin usuario y contraseña no se ve nada.

### Cómo crear (o cambiar) tu usuario
1. Entrá a **supabase.com** → tu proyecto **sinan-erp**.
2. En el menú de la izquierda: **Authentication** (el ícono de las personitas) → **Users**.
3. Botón **Add user** → **Create new user**.
4. Escribí tu email y una contraseña, y **tildá "Auto Confirm User"**. Tocá **Create user**.
5. ¡Listo! Ya podés entrar al ERP con ese email y contraseña.

¿Te olvidaste la contraseña? En esa misma lista, tocá los tres puntitos al lado de tu usuario → **Send password recovery** (o borrá el usuario y crealo de nuevo: tus datos NO se pierden, están en las tablas, no en el usuario).

¿Se suma una empleada? Creale su propio usuario de la misma forma. Va a ver y poder cargar todo.

---

## 3. El día a día

### Cuando alguien consulta por un producto (embudo)
1. **Clientes → Embudo de consultas → + Nueva consulta**: nombre, por dónde escribió, qué producto y color. El precio se completa solo.
2. Cuando le pasás el precio: **Pasé presupuesto →** (pasa a la columna "Presupuesto enviado").
3. Si compra: **¡Vendida! →** se abre la venta **ya cargada** (clienta, producto, precio). Elegís la forma de entrega y guardás.
4. Si no compra: **No compró** → elegís el **motivo** (precio, envío, no respondió…). Así después ves qué mejorar.
5. En **Análisis del embudo** ves cuántas consultas terminan en venta, por qué se pierden, qué canal vende más y qué productos se consultan más.

Las consultas sin responder de más de 1 día aparecen en **Alertas** y en el **Inicio**.

### Cargar una venta
1. **Ventas** → **+ Registrar venta** (o desde Inicio).
2. Elegí la fecha, la clienta (o **➕ Cliente nueva…**), el canal, el medio de pago y el **responsable**.
3. **Cómo se entrega**: en mano, punto de encuentro, Uber, correo… y la dirección u horario.
4. Productos: elegí producto, color y cantidad. El precio se completa solo.
5. **¿En qué paso está?** Tildá lo que ya está hecho (Preparado, Entregado, Cobrado). Si es presencial o en una feria se tilda todo solo.
6. **Registrar venta**. El stock se descuenta solo y queda anotado quién la cargó.

**Seguir un pedido:** arriba de Ventas ves en grande **Por preparar / Por entregar / Por cobrar** (tocá una para filtrar). En cada pedido, el botón verde **✓ Preparado / ✓ Entregado / ✓ Cobrado** marca el próximo paso. Los pedidos que esperan hace más de 2 días se marcan en rojo.

**Cancelar:** botón **Cancelar** en el pedido (el stock vuelve solo). Se puede **Reactivar**.

### Envíos (Logística)
**Logística → Envíos** muestra tres columnas: **Por preparar**, **Por entregar** y **Entregados sin cobrar**, con la forma de entrega y la dirección. Ideal para la persona que arma y lleva los paquetes: toca **✓** y el pedido pasa a la columna siguiente.

### Sumar un producto
1. **Logística → Inventario → + Nuevo producto**.
2. Nombre, código, categoría, precio y **costo** (el margen aparece solo).
3. **Colores** separados por coma (ej: `Negro, Celeste`) y el **stock inicial** de cada color.
4. Foto: **Subir foto** o pegá un link. Guardar.

### Cuando llega mercadería
**Inventario** → **+ Entrada** en el producto → cantidad y motivo (ej: "Compra a Marroquinería del Once"). Y en **Finanzas** cargá el gasto (categoría *Mercadería*, elegí el proveedor).

### Si contás el stock y no coincide
**Inventario** → botón **Stock** en el producto → escribí la **cantidad real** de cada color (y el mínimo) → Guardar. Queda registrado como "Ajuste" en **Movimientos**.

### Gastos
**Finanzas** → **+ Cargar gasto o ingreso**. Si es de un evento o feria, elegilo: se suma a su balance. Si es de una campaña de marketing, elegí la campaña. Las **ventas no se cargan acá**: aparecen solas en la lista (con la etiqueta "Venta") y se editan desde Ventas.

### Eventos y ferias
**Marketing → Eventos y ferias** → **+ Nuevo evento** → en **Tipo** elegí **Feria**, **Encuentro**, **Taller** u **Otro**.
- En una **feria** cargás el **valor de la entrada / puesto** (lo que pagás vos): se guarda solo como gasto en Finanzas.
- Cuando vendas en la feria, en **Ventas** elegí el canal **Feria**: se asocia sola a la feria de ese día.
- Con **Ver** abrís el detalle: checklist, colaboradores, lo vendido, los gastos y el resultado. Arriba de la lista, el filtro **Tipo: Feria** te muestra solo las ferias con su resultado total.

### Clientas (CRM)
- **Clientes → Clientas** → **Ficha** en cada clienta: datos, cumpleaños, gustos, qué compró, botones para escribirle por WhatsApp o Instagram, y el **registro de contactos** (anotá qué hablaron).
- Poné una fecha en **Próximo contacto** y te aparece en **Seguimientos** y en **Alertas** ese día. Al registrar el contacto, se limpia solo.
- **Seguimientos**: a quién contactar, cumpleaños del mes y clientas para reactivar (las que hace más de 120 días no compran).
- **Reportes**: clientas nuevas por mes, las que más compran, segmentos y cómo llegaron.

### Marketing
- **Estrategia**: tu plan (objetivo, público, propuesta de valor, tono, canales). Escribilo una vez y actualizalo cuando cambie.
- **Objetivos**: metas con número (ej: 1.500 seguidores) y su avance.
- **Campañas**: promos, sorteos, fechas especiales. Te muestra lo gastado (lo que cargues en Finanzas con esa campaña) y lo vendido entre esas fechas.

### Ver reportes
**Reportes** → arriba elegí el período (últimos 3, 6 o 12 meses, o este año). Pasá el mouse (o tocá) las barras para ver el número exacto. En cada gráfico de columnas tenés **Ver en tabla**.

### Buscar y filtrar
En todas las secciones hay un **buscador** (busca sin importar tildes ni mayúsculas) y **filtros** (estado, categoría, mes…).

### Borrar
Ícono de **tachito** en cada fila. Siempre te pregunta antes de borrar.

---

## 4. Qué podés tocar sola (sin romper nada) y qué NO

### ✅ Podés tocar tranquila
- **Todo lo que hagas desde el ERP**: cargar, editar y borrar datos. Está pensado para eso.
- **Configuración** del ERP: frase, redes, datos del negocio, stock mínimo.
- En **Supabase → Table Editor**: ver tus tablas como si fuera un Excel y corregir textos (nombres, descripciones, teléfonos, notas).
- En **Supabase → Authentication → Users**: crear o borrar usuarios.

### ⛔ NO toques
- En Supabase: **no borres tablas ni columnas**, no cambies nombres de tablas/columnas y no toques **"Policies"** (son las llaves de seguridad).
- En Supabase no cambies a mano la columna **cantidad** de la tabla **stock** ni el **total/subtotal** de **pedidos**: se calculan solos. Para corregir stock usá Inventario → ✎.
- **No compartas** la contraseña de la base de datos ni la **service_role key** con nadie, y nunca las pegues en ningún archivo.
- Los archivos de las carpetas `js/` y `sql/`: si querés cambiar algo, pedímelo.

---

## 5. Cómo borrar los datos de ejemplo (cuando empieces de verdad)

Los productos son **tus productos reales** (con costos estimados). Las clientas, ventas, eventos, gastos, etc. son **inventados** para probar.

**Opción A – Borrar todo y empezar de cero** (no se puede deshacer):
1. Supabase → tu proyecto → **SQL Editor** (ícono `>_` a la izquierda) → **New query**.
2. Abrí el archivo `erp/sql/05-borrar-datos-ejemplo.sql` con el Bloc de notas, copiá todo y pegalo.
3. Tocá **Run**. Se borra todo menos tu configuración y tu usuario.

**Opción B – Quedarte con los productos y borrar lo demás:** desde el ERP borrá las ventas, clientas, eventos y gastos de prueba con el tachito. Después, en **Inventario**, corregí el stock real de cada producto con el lápiz ✎, y en **Productos** poné los costos reales.

---

## 6. Si algo deja de funcionar

1. **Revisá internet** y recargá la página (tecla **F5**, o deslizar hacia abajo en el celu).
2. **Cerrá sesión y volvé a entrar.**
3. **¿Dice "El email o la contraseña no son correctos"?** Revisá mayúsculas. Si no te acordás, creá una contraseña nueva (ver punto 2).
4. **¿Dice "Falta conectar la base de datos"?** Se borraron los datos de `js/config.js`. Pedímelos y lo arreglo.
5. **¿No carga nada / sale "No se pudo cargar"?** Entrá a supabase.com: si el proyecto dice **Paused** (pausado), tocá **Restore project**. En el plan gratis, Supabase pausa los proyectos que no se usan durante 7 días seguidos; tus datos no se pierden.
6. Si sigue sin andar, sacale una captura a la pantalla y pasámela. Con eso lo resuelvo.

---

## 7. Para sumar una sección nueva en el futuro (nota técnica)

1. Crear `js/secciones/mi-seccion.js` con `App.registrar({ id, titulo, icono, grupo, render })` (`grupo`: `ventas`, `logistica`, `marketing` o `admin` para ubicarla en un departamento del menú). Para un listado con buscador, filtros y formulario alcanza con `Seccion.crud({ tabla, columnas, campos })` (ver `proveedores.js`, que es el ejemplo más simple).
2. Sumar su `<script>` en `index.html` (el orden de los scripts es el orden del menú).
3. Si necesita una tabla nueva: crearla en un archivo `sql/06-....sql` con RLS activado igual que en `03-seguridad.sql`.
