const express = require("express");
const bcryptjs = require("bcryptjs");
const router = express.Router();

module.exports = ({ queryDatabase }) => {
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
      await queryDatabase(
        "INSERT INTO users (name, pass, CanAccessProducts, CanAccessSecurity) VALUES (?, ?, 0, 0)",
        [name, passwordHash],
      );
      response.render("register", {
        alert: true,
        alertTitle: "Registro exitoso",
        alertMessage: "Tu cuenta fue creada sin permisos administrativos.",
        alertIcon: "success",
        showConfirmButton: false,
        timer: 1500,
        ruta: "login",
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo registrar el usuario");
    }
  });

  router.post("/auth", async (request, response) => {
    const name = String(request.body.name || "").trim();
    const password = String(request.body.password || "");
    if (!name || !password) return response.status(400).send("Completa todos los campos");

    try {
      const users = await queryDatabase(
        "SELECT id, name, pass, CanAccessProducts, CanAccessSecurity FROM users WHERE name = ? LIMIT 1",
        [name],
      );
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

      request.session.regenerate((sessionError) => {
        if (sessionError) return response.status(500).send("No se pudo iniciar sesión");
        request.session.loggedin = true;
        request.session.userId = users[0].id;
        request.session.name = users[0].name;
        request.session.canAccessProducts = Boolean(users[0].CanAccessProducts);
        request.session.canAccessSecurity = Boolean(users[0].CanAccessSecurity);
        response.redirect("/index");
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al iniciar sesión");
    }
  });

  router.post("/logout", (request, response) => {
    request.session.destroy(() => response.redirect("/login"));
  });

  return router;
};
