# Sistema de gestión con Node.js, Express y MySQL

Aplicación web con autenticación, permisos, clientes, productos, categorías y facturación.

## Requisitos

- Node.js 18 o superior
- npm
- MySQL 8 o compatible

## Instalación

```bash
npm install
```

Configura `env/.env`:

```env
DB_HOST=localhost
DB_USER=app_user
DB_PASSWORD=una-contrasena-segura
DB_DATABASE=login_node_curso
SESSION_SECRET=una-clave-larga-y-aleatoria
PORT=3000
```

La base de datos debe contener las tablas `users`, `tblclientes`, `tblproducto`, `tblcategoria_prod`, `tblfactura`, `tblestado_factura` y `tbldetalle_factura`.

Para instalaciones existentes, ejecuta las migraciones de `database/`:

- `add-category-creation-fields.sql`
- `add-user-permissions.sql`

## Ejecución

Desarrollo:

```bash
npm run dev
```

Producción:

```bash
npm start
```

Abre `http://localhost:3000`.

## Permisos

El registro público crea usuarios sin acceso a Productos ni Seguridad. Un usuario autorizado puede asignar esos permisos desde Seguridad.

- Productos y categorías: requieren `CanAccessProducts`.
- Seguridad y usuarios: requieren `CanAccessSecurity`.
- Clientes y facturación: requieren una sesión iniciada.

## Estructura

- `app.js`: configuración del servidor y montaje de routers.
- `routes/auth.js`: login, registro y logout.
- `routes/users.js`: usuarios y permisos.
- `routes/products.js`: productos y categorías.
- `routes/clients.js`: clientes.
- `routes/invoices.js`: nueva factura y administración.
- `middleware/auth.js`: autenticación y autorización.
- `views/`: plantillas EJS.
- `views/_nav.ejs`: navegación compartida.
- `views/_alert.ejs`: alertas compartidas.
- `database/db.js`: conexión MySQL.
