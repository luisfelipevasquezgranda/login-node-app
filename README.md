# Sistema de gestión con Node.js, Express y MySQL

Aplicación web con autenticación, permisos, clientes, productos, categorías y facturación.

## Requisitos previos

Para ejecutar este proyecto en otra máquina necesitas:

- Node.js 18 o superior
- npm
- MySQL 8 o compatible
- Acceso a una terminal o consola de comandos
- Git (opcional, si vas a clonar el repositorio)

## 1. Clonar o descargar el proyecto

```bash
git clone <URL_DEL_REPOSITORIO>
cd login
```

Si ya te compartieron la carpeta del proyecto, simplemente entra a la raíz del proyecto.

## 2. Instalar dependencias

Desde la raíz del proyecto ejecuta:

```bash
npm install
```

Esto instalará las librerías necesarias como:

- express
- ejs
- mysql2
- express-session
- dotenv
- bcryptjs
- nodemon (solo para desarrollo)

## 3. Preparar la base de datos MySQL

Debes tener MySQL corriendo en tu máquina o en un servidor accesible.

### Crear la base de datos y el usuario

Ejecuta en MySQL:

```sql
CREATE DATABASE login_node_curso;
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'una-contrasena-segura';
GRANT ALL PRIVILEGES ON login_node_curso.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

Si usas otra configuración, ajusta los valores según tu entorno.

### Asegurar que existan las tablas necesarias

La aplicación espera tablas como:

- `users`
- `tblclientes`
- `tblproducto`
- `tblcategoria_prod`
- `tblfactura`
- `tblestado_factura`
- `tbldetalle_factura`

En caso de que la base de datos exista pero falten columnas adicionales, ejecuta los scripts SQL incluidos en la carpeta `database/`:

```bash
mysql -u app_user -p login_node_curso < database/add-category-creation-fields.sql
mysql -u app_user -p login_node_curso < database/add-user-permissions.sql
```

> Si tu base de datos ya está creada con la estructura completa, estos pasos pueden no ser necesarios.

## 4. Configurar las variables de entorno

Crea el archivo `env/.env` en la raíz del proyecto y agrega lo siguiente:

```env
DB_HOST=localhost
DB_USER=app_user
DB_PASSWORD=una-contrasena-segura
DB_DATABASE=login_node_curso
SESSION_SECRET=una-clave-larga-y-aleatoria
PORT=3000
```

Importante:

- La aplicación carga este archivo automáticamente con `dotenv`.
- El nombre de la base de datos debe coincidir con la que creaste en MySQL.
- `SESSION_SECRET` debe ser una cadena larga y segura.

## 5. Ejecutar el proyecto

### Modo desarrollo

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

La aplicación se ejecuta normalmente en:

```text
http://localhost:3000
```

## 6. Verificar que funciona

1. Abre el navegador.
2. Ingresa a `http://localhost:3000`.
3. Si todo está bien, deberías ver la página principal de la aplicación.
4. Puedes probar el login, registro y acceso a módulos como productos o seguridad.

## 7. Permisos de la aplicación

El sistema tiene permisos por usuario:

- Productos y categorías requieren `CanAccessProducts`.
- Seguridad y usuarios requieren `CanAccessSecurity`.
- Clientes y facturación requieren una sesión iniciada.

El registro público crea usuarios sin acceso a Productos ni Seguridad. Un usuario autorizado puede asignar esos permisos desde la sección de Seguridad.

## 8. Estructura principal del proyecto

- `app.js`: configuración del servidor y montaje de rutas.
- `routes/auth.js`: login, registro y logout.
- `routes/users.js`: usuarios y permisos.
- `routes/products.js`: productos y categorías.
- `routes/clients.js`: clientes.
- `routes/invoices.js`: facturación.
- `middleware/auth.js`: autenticación y autorización.
- `views/`: vistas EJS.
- `database/`: scripts SQL y conexión a la base de datos.

## 9. Solución rápida de problemas comunes

### Error de conexión a MySQL

Revisa que:

- MySQL esté corriendo.
- El usuario y la contraseña en `env/.env` sean correctos.
- La base de datos `login_node_curso` exista.
- El host sea correcto (`localhost` o la IP del servidor).

### La app no inicia

Verifica que:

- Estés dentro de la carpeta del proyecto.
- Hayas ejecutado `npm install`.
- El puerto `3000` no esté ocupado por otra aplicación.

### Error de archivo `.env` no encontrado

Asegúrate de que exista la carpeta `env/` y que el archivo se llame exactamente:

```text
env/.env
```

## Notas finales

Para mover este proyecto a otra máquina, lo más importante es:

- instalar Node.js y MySQL,
- crear la base de datos,
- configurar `env/.env`,
- instalar dependencias con `npm install`,
- ejecutar `npm run dev` o `npm start`.
