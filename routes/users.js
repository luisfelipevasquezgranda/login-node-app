const express = require("express");
const bcryptjs = require("bcryptjs");
const { requireAccess } = require("../middleware/auth");
const router = express.Router();

module.exports = ({ queryDatabase }) => {
  const security = requireAccess("canAccessSecurity");

  router.get("/seguridad", security, async (request, response) => {
    try {
      const users = await queryDatabase("SELECT id, name, CanAccessProducts, CanAccessSecurity FROM users ORDER BY id DESC");
      response.render("seguridad", { login: true, name: request.session.name, users, alert: request.session.alert });
      delete request.session.alert;
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al cargar los usuarios");
    }
  });

  router.get("/users/create", security, (request, response) => response.render("create", { login: true, name: request.session.name }));

  router.post("/users", security, async (request, response) => {
    const name = String(request.body.name || "").trim();
    const password = String(request.body.password || "");
    if (!name || password.length < 8) return response.status(400).send("El nombre y una contraseña de 8 caracteres son obligatorios");
    try {
      await queryDatabase(
        "INSERT INTO users (name, pass, CanAccessProducts, CanAccessSecurity) VALUES (?, ?, ?, ?)",
        [name, await bcryptjs.hash(password, 12), request.body.CanAccessProducts === "1" ? 1 : 0, request.body.CanAccessSecurity === "1" ? 1 : 0],
      );
      response.redirect("/seguridad");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo crear el usuario");
    }
  });

  router.get("/users/:id/edit", security, async (request, response) => {
    try {
      const users = await queryDatabase("SELECT id, name, CanAccessProducts, CanAccessSecurity FROM users WHERE id = ?", [request.params.id]);
      if (!users.length) return response.status(404).send("Usuario no encontrado");
      response.render("edit", { user: users[0], login: true, name: request.session.name });
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al buscar el usuario");
    }
  });

  router.post("/users/:id/update", security, async (request, response) => {
    const name = String(request.body.name || "").trim();
    if (!name) return response.status(400).send("El nombre es obligatorio");
    try {
      const values = [name, request.body.CanAccessProducts === "1" ? 1 : 0, request.body.CanAccessSecurity === "1" ? 1 : 0];
      let sql = "UPDATE users SET name = ?, CanAccessProducts = ?, CanAccessSecurity = ?";
      if (request.body.password) {
        sql += ", pass = ?";
        values.push(await bcryptjs.hash(request.body.password, 12));
      }
      values.push(request.params.id);
      const result = await queryDatabase(`${sql} WHERE id = ?`, values);
      if (!result.affectedRows) return response.status(404).send("Usuario no encontrado");
      response.redirect("/seguridad");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo actualizar el usuario");
    }
  });

  router.post("/users/:id/delete", security, async (request, response) => {
    if (String(request.params.id) === String(request.session.userId)) return response.status(400).send("No puedes eliminar tu propio usuario");
    try {
      const result = await queryDatabase("DELETE FROM users WHERE id = ?", [request.params.id]);
      if (!result.affectedRows) return response.status(404).send("Usuario no encontrado");
      response.redirect("/seguridad");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo eliminar el usuario");
    }
  });

  return router;
};
