const express = require("express");
const { requireLogin } = require("../middleware/auth");
const router = express.Router();

module.exports = ({ queryDatabase }) => {
  const clientsAccess = requireLogin;

  router.get("/tablas/clientes", clientsAccess, async (request, response) => {
    try {
      const clients = await queryDatabase("SELECT * FROM tblclientes ORDER BY IdCliente DESC");
      response.render("clientes", { login: true, name: request.session.name, clients, editingClient: null });
    } catch (error) { console.error(error); response.status(500).send("Error al cargar los clientes"); }
  });

  router.get("/tablas/clientes/:id/edit", clientsAccess, async (request, response) => {
    try {
      const [clients, selected] = await Promise.all([
        queryDatabase("SELECT * FROM tblclientes ORDER BY IdCliente DESC"),
        queryDatabase("SELECT * FROM tblclientes WHERE IdCliente = ?", [request.params.id]),
      ]);
      if (!selected.length) return response.status(404).send("Cliente no encontrado");
      response.render("clientes", { login: true, name: request.session.name, clients, editingClient: selected[0] });
    } catch (error) { console.error(error); response.status(500).send("Error al editar el cliente"); }
  });

  router.post("/tablas/clientes", clientsAccess, async (request, response) => {
    const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } = request.body;
    if (!String(StrNombre || "").trim()) return response.status(400).send("El nombre del cliente es obligatorio");
    try {
      await queryDatabase("INSERT INTO tblclientes (StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail, DtmFechaModifica, StrUsuarioModifico) VALUES (?, ?, ?, ?, ?, NOW(), ?)", [StrNombre.trim(), NumDocumento || null, StrDireccion || null, StrTelefono || null, StrEmail || null, request.session.name]);
      response.redirect("/tablas/clientes");
    } catch (error) { console.error(error); response.status(500).send("No se pudo crear el cliente"); }
  });

  router.post("/tablas/clientes/:id/update", clientsAccess, async (request, response) => {
    const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } = request.body;
    if (!String(StrNombre || "").trim()) return response.status(400).send("El nombre del cliente es obligatorio");
    try {
      const result = await queryDatabase("UPDATE tblclientes SET StrNombre = ?, NumDocumento = ?, StrDireccion = ?, StrTelefono = ?, StrEmail = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdCliente = ?", [StrNombre.trim(), NumDocumento || null, StrDireccion || null, StrTelefono || null, StrEmail || null, request.session.name, request.params.id]);
      if (!result.affectedRows) return response.status(404).send("Cliente no encontrado");
      response.redirect("/tablas/clientes");
    } catch (error) { console.error(error); response.status(500).send("No se pudo actualizar el cliente"); }
  });

  router.post("/tablas/clientes/:id/delete", clientsAccess, async (request, response) => {
    try {
      const result = await queryDatabase("DELETE FROM tblclientes WHERE IdCliente = ?", [request.params.id]);
      if (!result.affectedRows) return response.status(404).send("Cliente no encontrado");
      response.redirect("/tablas/clientes");
    } catch (error) { console.error(error); response.status(500).send("No se pudo eliminar el cliente"); }
  });

  return router;
};
