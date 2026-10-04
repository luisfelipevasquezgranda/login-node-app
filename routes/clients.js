const express = require("express");
const { requireLogin } = require("../middleware/auth");
const clientsModel = require("../models/clients");
const router = express.Router();

router.get("/tablas/clientes", requireLogin, async (request, response) => {
  try {
    const clients = await clientsModel.listClients();
    response.render("clientes", {
      login: true,
      name: request.session.name,
      clients,
      editingClient: null,
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error al cargar los clientes");
  }
});

router.get(
  "/tablas/clientes/:id/edit",
  requireLogin,
  async (request, response) => {
    try {
      const [clients, selected] = await Promise.all([
        clientsModel.listClients(),
        clientsModel.findClientById(request.params.id),
      ]);
      if (!selected.length)
        return response.status(404).send("Cliente no encontrado");
      response.render("clientes", {
        login: true,
        name: request.session.name,
        clients,
        editingClient: selected[0],
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al editar el cliente");
    }
  },
);

router.post("/tablas/clientes", requireLogin, async (request, response) => {
  const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } =
    request.body;
  if (!String(StrNombre || "").trim())
    return response.status(400).send("El nombre del cliente es obligatorio");
  try {
    await clientsModel.createClient(
      {
        StrNombre: StrNombre.trim(),
        NumDocumento,
        StrDireccion,
        StrTelefono,
        StrEmail,
      },
      request.session.name,
    );
    response.redirect("/tablas/clientes");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo crear el cliente");
  }
});

router.post(
  "/tablas/clientes/:id/update",
  requireLogin,
  async (request, response) => {
    const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } =
      request.body;
    if (!String(StrNombre || "").trim())
      return response.status(400).send("El nombre del cliente es obligatorio");
    try {
      const result = await clientsModel.updateClient(
        request.params.id,
        {
          StrNombre: StrNombre.trim(),
          NumDocumento,
          StrDireccion,
          StrTelefono,
          StrEmail,
        },
        request.session.name,
      );
      if (!result.affectedRows)
        return response.status(404).send("Cliente no encontrado");
      response.redirect("/tablas/clientes");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo actualizar el cliente");
    }
  },
);

router.post(
  "/tablas/clientes/:id/delete",
  requireLogin,
  async (request, response) => {
    try {
      const result = await clientsModel.deleteClient(request.params.id);
      if (!result.affectedRows)
        return response.status(404).send("Cliente no encontrado");
      response.redirect("/tablas/clientes");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo eliminar el cliente");
    }
  },
);

module.exports = router;
