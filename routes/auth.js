const express = require("express");
const bcryptjs = require("bcryptjs");
const usersModel = require("../models/users");
const router = express.Router();

router.get(["/", "/login"], (request, response) => response.render("login"));
router.get("/register", (request, response) => response.render("register"));

router.post("/register", async (request, response) => {
  const name = String(request.body.name || "").trim();
  const password = String(request.body.password || "");
  if (!/^[A-Za-z]+$/.test(name) || password.length < 8) {
    return response.status(400).send("Usuario o contraseña no válidos");
  }

  try {
    const passwordHash = await bcryptjs.hash(password, 12);
    const result = await usersModel.createRegisteredUser(name, passwordHash);

    request.session.loggedin = true;
    request.session.userId = result.insertId;
    request.session.name = name;
    request.session.canAccessProducts = true;
    request.session.canAccessSecurity = true;

    response.redirect("/index");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo registrar el usuario");
  }
});

router.post("/auth", async (request, response) => {
  const name = String(request.body.name || "").trim();
  const password = String(request.body.password || "");
  if (!name || !password)
    return response.status(400).send("Completa todos los campos");

  try {
    const users = await usersModel.findUserByName(name);

    if (!users.length || !(await bcryptjs.compare(password, users[0].pass))) {
      return response.render("login", {
        alert: true,
        alertTitle: "Error",
        alertMessage: "Usuario o contraseña incorrectos",
        alertIcon: "error",
        showConfirmButton: true,
        timer: false,
        ruta: "login",
      });
    }

    request.session.loggedin = true;
    request.session.userId = users[0].id;
    request.session.name = users[0].name;
    request.session.canAccessProducts = Boolean(users[0].CanAccessProducts);
    request.session.canAccessSecurity = Boolean(users[0].CanAccessSecurity);

    response.redirect("/index");
  } catch (error) {
    console.error(error);
    response.status(500).send("Error al iniciar sesión");
  }
});

router.post("/logout", (request, response) => {
  if (request.session.destroy) {
    request.session.destroy();
  } else {
    request.session = null;
  }
  response.redirect("/login");
});

module.exports = router;
