const express = require("express");
const { requireLogin } = require("../middleware/auth");
const router = express.Router();

module.exports = ({ queryDatabase, runTransaction }) => {
  const billingAccess = requireLogin;

  router.get("/facturacion", requireLogin, (request, response) => response.render("facturas-menu", { login: true, name: request.session.name }));

  router.get("/facturacion/nueva", billingAccess, async (request, response) => {
    try {
      const [clients, products] = await Promise.all([
        queryDatabase("SELECT IdCliente, StrNombre FROM tblclientes ORDER BY StrNombre"),
        queryDatabase("SELECT IdProducto, StrNombre, NumPrecioVenta FROM tblproducto ORDER BY StrNombre"),
      ]);
      response.render("facturacion", { login: true, name: request.session.name, clients, products });
    } catch (error) { console.error(error); response.status(500).send("Error al cargar la facturación"); }
  });

  router.get("/facturacion/admin", billingAccess, async (request, response) => {
    try {
      const search = String(request.query.search || "").trim();
      const like = `%${search}%`;
      const [invoices, statuses] = await Promise.all([
        queryDatabase(`SELECT f.*, c.StrNombre AS Cliente, e.StrDescripcion AS Estado, (SELECT COUNT(*) FROM tbldetalle_factura d WHERE d.IdFactura = f.IdFactura) AS CantidadDetalles FROM tblfactura f LEFT JOIN tblclientes c ON c.IdCliente = f.IdCliente LEFT JOIN tblestado_factura e ON e.IdEstadoFactura = f.IdEstado WHERE CAST(f.IdFactura AS CHAR) LIKE ? OR COALESCE(c.StrNombre, '') LIKE ? ORDER BY f.IdFactura DESC`, [like, like]),
        queryDatabase("SELECT * FROM tblestado_factura ORDER BY IdEstadoFactura DESC"),
      ]);
      response.render("facturas-admin", { login: true, name: request.session.name, invoices, statuses, search });
    } catch (error) { console.error(error); response.status(500).send("Error al cargar las facturas"); }
  });

  router.post("/facturacion/registrar", billingAccess, async (request, response) => {
    const { IdCliente, NumDescuento, NumImpuesto, items } = request.body;
    if (!IdCliente || !Array.isArray(items) || items.length === 0) return response.status(400).json({ message: "Selecciona un cliente y agrega al menos un producto" });
    try {
      const invoiceId = await runTransaction(async () => {
        const products = await queryDatabase("SELECT IdProducto, NumPrecioVenta FROM tblproducto WHERE IdProducto IN (?)", [items.map((item) => Number(item.IdProducto))]);
        const productMap = new Map(products.map((product) => [product.IdProducto, product]));
        const normalized = items.map((item) => {
          const product = productMap.get(Number(item.IdProducto));
          const quantity = Number(item.NumCantidad);
          if (!product || !Number.isInteger(quantity) || quantity < 1) throw new Error("Producto o cantidad inválidos");
          return { IdProducto: product.IdProducto, NumCantidad: quantity, NumPrecio: Number(product.NumPrecioVenta) || 0 };
        });
        const subtotal = normalized.reduce((sum, item) => sum + item.NumCantidad * item.NumPrecio, 0);
        const discount = Math.max(Number(NumDescuento) || 0, 0);
        const tax = Math.max(Number(NumImpuesto) || 0, 0);
        let statuses = await queryDatabase("SELECT IdEstadoFactura FROM tblestado_factura WHERE LOWER(StrDescripcion) IN ('pendiente', 'creada') LIMIT 1");
        if (!statuses.length) {
          const status = await queryDatabase("INSERT INTO tblestado_factura (StrDescripcion) VALUES ('Pendiente')");
          statuses = [{ IdEstadoFactura: status.insertId }];
        }
        const invoice = await queryDatabase("INSERT INTO tblfactura (DtmFecha, IdCliente, NumDescuento, NumImpuesto, NumValorTotal, IdEstado, DtmFechaModifica, StrUsuarioModifico) VALUES (NOW(), ?, ?, ?, ?, ?, NOW(), ?)", [IdCliente, discount, tax, Math.max(subtotal - discount + tax, 0), statuses[0].IdEstadoFactura, request.session.name]);
        for (const item of normalized) await queryDatabase("INSERT INTO tbldetalle_factura (IdFactura, NumCantidad, IdProducto, NumPrecio) VALUES (?, ?, ?, ?)", [invoice.insertId, item.NumCantidad, item.IdProducto, item.NumPrecio]);
        return invoice.insertId;
      });
      response.json({ ok: true, invoiceId });
    } catch (error) { console.error(error); response.status(500).json({ message: "No se pudo crear la factura" }); }
  });

  router.post("/facturacion/facturas/:id/update", billingAccess, async (request, response) => {
    try {
      const result = await queryDatabase("UPDATE tblfactura SET IdEstado = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdFactura = ?", [request.body.IdEstado || null, request.session.name, request.params.id]);
      if (!result.affectedRows) return response.status(404).send("Factura no encontrada");
      response.redirect("/facturacion/admin");
    } catch (error) { console.error(error); response.status(500).send("No se pudo actualizar la factura"); }
  });

  router.post("/facturacion/facturas/:id/delete", billingAccess, async (request, response) => {
    try {
      const result = await queryDatabase("DELETE FROM tblfactura WHERE IdFactura = ?", [request.params.id]);
      if (!result.affectedRows) return response.status(404).send("Factura no encontrada");
      response.redirect("/facturacion/admin");
    } catch (error) { console.error(error); response.status(500).send("No se pudo eliminar la factura"); }
  });

  return router;
};
