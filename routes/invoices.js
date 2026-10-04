const express = require("express");
const { requireLogin } = require("../middleware/auth");
const invoicesModel = require("../models/invoices");
const router = express.Router();

router.get("/facturacion", requireLogin, (request, response) =>
  response.render("facturas-menu", {
    login: true,
    name: request.session.name,
  }),
);

router.get("/facturacion/nueva", requireLogin, async (request, response) => {
  try {
    const [clients, products] = await Promise.all([
      invoicesModel.listInvoiceFormClients(),
      invoicesModel.listInvoiceFormProducts(),
    ]);
    response.render("facturacion", {
      login: true,
      name: request.session.name,
      clients,
      products,
    });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error al cargar la facturación");
  }
});

router.get(
  "/facturacion/admin",
  requireLogin,
  async (request, response) => {
    try {
      const search = String(request.query.search || "").trim();
      const [invoices, statuses] = await Promise.all([
        invoicesModel.listInvoices(search),
        invoicesModel.listInvoiceStatuses(),
      ]);
      response.render("facturas-admin", {
        login: true,
        name: request.session.name,
        invoices,
        statuses,
        search,
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al cargar las facturas");
    }
  },
);

router.post(
  "/facturacion/registrar",
  requireLogin,
  async (request, response) => {
    const { IdCliente, NumDescuento, NumImpuesto, items } = request.body;
    if (!IdCliente || !Array.isArray(items) || items.length === 0)
      return response.status(400).json({
        message: "Selecciona un cliente y agrega al menos un producto",
      });
    try {
      const invoiceId = await invoicesModel.createInvoice(
        {
          clientId: IdCliente,
          discount: NumDescuento,
          tax: NumImpuesto,
          items,
        },
        request.session.name,
      );
      response.json({ ok: true, invoiceId });
    } catch (error) {
      console.error(error);
      response.status(500).json({ message: "No se pudo crear la factura" });
    }
  },
);

router.post(
  "/facturacion/facturas/:id/update",
  requireLogin,
  async (request, response) => {
    try {
      const result = await invoicesModel.updateInvoiceStatus(
        request.params.id,
        request.body.IdEstado,
        request.session.name,
      );
      if (!result.affectedRows)
        return response.status(404).send("Factura no encontrada");
      response.redirect("/facturacion/admin");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo actualizar la factura");
    }
  },
);

router.post(
  "/facturacion/facturas/:id/delete",
  requireLogin,
  async (request, response) => {
    try {
      const result = await invoicesModel.deleteInvoice(request.params.id);
      if (!result.affectedRows)
        return response.status(404).send("Factura no encontrada");
      response.redirect("/facturacion/admin");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo eliminar la factura");
    }
  },
);

module.exports = router;
