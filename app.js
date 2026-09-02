// 1 - traemos a express
const express = require("express");
const app = express();

// 2 - seteamos urlencoded y json para poder recibir datos de formularios y json
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3 - invocamos a dotenv para poder usar variables de entorno
const dotenv = require("dotenv");
dotenv.config({ path: "./env/.env" });

// 4 - Directorio public para que se pueda acceder a los archivos estáticos (css, js, imágenes, etc.)
app.use("/resources", express.static(__dirname + "/public"));

// 5 - Directorio views para que se pueda acceder a los archivos de vistas (html, ejs, etc.)
app.set("view engine", "ejs");

// 6 - hash de las contraseñas
const bcryptjs = require("bcryptjs");

// 7 - express-session para poder crear sesiones de usuario
const session = require("express-session");
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  }),
);

// 8 - Invocamos a la base de datos
const connection = require("./database/db");

// 9 - Rutas
// La raíz muestra el login al entrar al servidor para que la primera pantalla sea la de autenticación.
app.get("/", (request, response) => {
  response.render("login");
});

// Ruta explícita del login, por si se quiere acceder directamente a /login.
app.get("/login", (request, response) => {
  response.render("login");
});

// Vista principal protegida: requiere que el usuario esté logueado para acceder a index.
app.get("/index", (request, response) => {
  // 10 - Se verifica si el usuario está logueado, si no lo está se redirige al login.
  //if (!request.session.loggedin) {
  //   return response.redirect("/");
  // }

  // Se toma la alerta guardada en sesión y se limpia para que no se repita.
  const alert = request.session.alert;
  delete request.session.alert;

  response.render("index", {
    login: true,
    name: request.session.name,
    msg: request.session.name,
    alert,
  });
});

app.get("/register", (request, response) => {
  response.render("register");
});

app.post("/register", async (req, res) => {
  const name = req.body.name;
  const password = req.body.password;

  if (!name || !password) {
    return res.send("Please enter user and Password!");
  }

  let passwordHash = await bcryptjs.hash(password, 8);
  connection.query(
    "INSERT INTO users SET ?",
    { name: name, pass: passwordHash },
    async (error, results) => {
      if (error) {
        console.log(error);
      } else {
        res.render("register", {
          alert: true,
          alertTitle: "Registration",
          alertMessage: "¡Successful Registration!",
          alertIcon: "success",
          showConfirmButton: false,
          timer: 1500,
          ruta: "",
        });
      }
    },
  );
});

//11 - Metodo para la autenticacion
// Si las credenciales son correctas, se crea la sesión y se redirige al index.
app.post("/auth", async (req, res) => {
  const name = req.body.name;
  const password = req.body.password;

  if (name && password) {
    connection.query(
      "SELECT * FROM users WHERE name = ?",
      [name],
      async (error, results) => {
        if (error) {
          console.log(error);
          return res.status(500).send("Error al buscar usuario");
        }

        if (
          results.length === 0 ||
          !(await bcryptjs.compare(password, results[0].pass))
        ) {
          // Error de login: se muestra alerta en la misma vista del login.
          res.render("login", {
            alert: true,
            alertTitle: "Error",
            alertMessage: "USUARIO y/o PASSWORD incorrectas",
            alertIcon: "error",
            showConfirmButton: true,
            timer: false,
            ruta: "login",
          });
        } else {
          // Login exitoso: se guarda la sesión del usuario y la alerta de bienvenida.
          req.session.loggedin = true;
          req.session.name = results[0].name;
          req.session.alert = {
            alert: true,
            alertTitle: "Conexión exitosa",
            alertMessage: "¡LOGIN CORRECTO!",
            alertIcon: "success",
            showConfirmButton: false,
            timer: 1500,
            ruta: "",
          };
          res.redirect("/index");
        }
      },
    );
  } else {
    res.send("Please enter user and Password!");
  }
});

// 12 - auth middleware para proteger rutas

// 13 - Ruta para cerrar sesión
app.use(function (req, res, next) {
  if (!req.user)
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  next();
});

//Logout
//Destruye la sesión.
app.get("/logout", function (req, res) {
  req.session.destroy(() => {
    res.redirect("/"); // siempre se ejecutará después de que se destruya la sesión
  });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
