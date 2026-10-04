const { query, withTransaction } = require("./database");

const listInvoiceFormClients = () =>
  query("SELECT IdCliente, StrNombre FROM tblclientes ORDER BY StrNombre");

const listInvoiceFormProducts = () =>
  query(
    "SELECT IdProducto, StrNombre, NumPrecioVenta FROM tblproducto ORDER BY StrNombre",
  );

const listInvoices = (search) => {
  const like = `%${search}%`;
  return query(
    `SELECT f.*, c.StrNombre AS Cliente, e.StrDescripcion AS Estado, (SELECT COUNT(*) FROM tbldetalle_factura d WHERE d.IdFactura = f.IdFactura) AS CantidadDetalles FROM tblfactura f LEFT JOIN tblclientes c ON c.IdCliente = f.IdCliente LEFT JOIN tblestado_factura e ON e.IdEstadoFactura = f.IdEstado WHERE CAST(f.IdFactura AS CHAR) LIKE ? OR COALESCE(c.StrNombre, '') LIKE ? ORDER BY f.IdFactura DESC`,
    [like, like],
  );
};

const listInvoiceStatuses = () =>
  query("SELECT * FROM tblestado_factura ORDER BY IdEstadoFactura DESC");

const createInvoice = (
  { clientId, discount, tax, items },
  modifiedBy,
) =>
  withTransaction(async (transactionQuery) => {
    const products = await transactionQuery(
      "SELECT IdProducto, NumPrecioVenta FROM tblproducto WHERE IdProducto IN (?)",
      [items.map((item) => Number(item.IdProducto))],
    );
    const productMap = new Map(
      products.map((product) => [product.IdProducto, product]),
    );
    const normalized = items.map((item) => {
      const product = productMap.get(Number(item.IdProducto));
      const quantity = Number(item.NumCantidad);
      if (!product || !Number.isInteger(quantity) || quantity < 1)
        throw new Error("Producto o cantidad inválidos");
      return {
        IdProducto: product.IdProducto,
        NumCantidad: quantity,
        NumPrecio: Number(product.NumPrecioVenta) || 0,
      };
    });
    const subtotal = normalized.reduce(
      (sum, item) => sum + item.NumCantidad * item.NumPrecio,
      0,
    );
    const normalizedDiscount = Math.max(Number(discount) || 0, 0);
    const normalizedTax = Math.max(Number(tax) || 0, 0);
    let statuses = await transactionQuery(
      "SELECT IdEstadoFactura FROM tblestado_factura WHERE LOWER(StrDescripcion) IN ('pendiente', 'creada') LIMIT 1",
    );
    if (!statuses.length) {
      const status = await transactionQuery(
        "INSERT INTO tblestado_factura (StrDescripcion) VALUES ('Pendiente')",
      );
      statuses = [{ IdEstadoFactura: status.insertId }];
    }

    const invoice = await transactionQuery(
      "INSERT INTO tblfactura (DtmFecha, IdCliente, NumDescuento, NumImpuesto, NumValorTotal, IdEstado, DtmFechaModifica, StrUsuarioModifico) VALUES (NOW(), ?, ?, ?, ?, ?, NOW(), ?)",
      [
        clientId,
        normalizedDiscount,
        normalizedTax,
        Math.max(subtotal - normalizedDiscount + normalizedTax, 0),
        statuses[0].IdEstadoFactura,
        modifiedBy,
      ],
    );

    for (const item of normalized) {
      await transactionQuery(
        "INSERT INTO tbldetalle_factura (IdFactura, NumCantidad, IdProducto, NumPrecio) VALUES (?, ?, ?, ?)",
        [
          invoice.insertId,
          item.NumCantidad,
          item.IdProducto,
          item.NumPrecio,
        ],
      );
    }

    return invoice.insertId;
  });

const updateInvoiceStatus = (id, statusId, modifiedBy) =>
  query(
    "UPDATE tblfactura SET IdEstado = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdFactura = ?",
    [statusId || null, modifiedBy, id],
  );

const deleteInvoice = (id) =>
  query("DELETE FROM tblfactura WHERE IdFactura = ?", [id]);

module.exports = {
  listInvoiceFormClients,
  listInvoiceFormProducts,
  listInvoices,
  listInvoiceStatuses,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
};
