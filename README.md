<<<<<<< HEAD
# login-node-app
=======
# Proyecto de Login con Node.js + Express + MySQL

Este proyecto permite registrar e iniciar sesión con usuarios almacenados en una base de datos MySQL.

## Requisitos

- Node.js 18 o superior
- npm
- MySQL 8 o compatible
- Git Bash, PowerShell o terminal de sistema

## Dependencias del proyecto

Se instalan con npm usando el archivo package.json:

- express
- ejs
- mysql2
- dotenv
- bcryptjs
- express-session
- nodemon (solo para desarrollo)

## Paso a paso para ejecutar

1. Instala Node.js desde: https://nodejs.org/
2. Instala MySQL y crea una base de datos llamada:
   `login_node_curso`
3. Abre la terminal en la carpeta del proyecto.
4. Ejecuta:

   ```bash
   npm install
   ```

5. Verifica que el archivo `env/.env` contenga los datos correctos:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_DATABASE=login_node_curso
   ```

6. Crea la tabla `users` en MySQL con esta estructura:

   ```sql
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     pass VARCHAR(255) NOT NULL
   );
   ```

7. Inicia la aplicación:

   ```bash
   npm run dev
   ```

8. Abre en el navegador:

   ```text
   http://localhost:3000
   ```

## Uso

- La primera pantalla es el login.
- Si el usuario no existe, puede registrar uno en la opción de registro.
- Al iniciar sesión correctamente, el sistema redirige a la vista principal.

## Archivos importantes

- `app.js` — configuración del servidor y rutas
- `database/db.js` — conexión a MySQL
- `views/login.ejs` — formulario de login
- `views/register.ejs` — formulario de registro
- `views/index.ejs` — página de bienvenida
- `env/.env` — variables de entorno

## Nota

para ejecutar el proyecto en otra máquina, se debe tener:

- Node.js instalado
- MySQL instalado y corriendo
- la base de datos creada
- el comando `npm install` ejecutado antes de iniciar la app
>>>>>>> 9134e44 (Primer commit)
