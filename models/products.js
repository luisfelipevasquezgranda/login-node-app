const { query } = require("./database");

const listProducts = () =>
  query("SELECT * FROM tblproducto ORDER BY IdProducto DESC");

const findProductById = (id) =>
  query("SELECT * FROM tblproducto WHERE IdProducto = ?", [id]);

const createProduct = (product, modifiedBy) =>
  query(
    `INSERT INTO tblproducto
      (StrNombre, StrCodigo, NumPrecioCompra, NumPrecioVenta, idCategoria, StrDetalle, strFoto, NumStock, DtmFechaModifica, StrUsuarioModifico)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      product.StrNombre,
      product.StrCodigo,
      product.NumPrecioCompra || null,
      product.NumPrecioVenta || null,
      product.idCategoria || null,
      product.StrDetalle || null,
      product.strFoto || null,
      product.NumStock || 0,
      modifiedBy,
    ],
  );

const updateProduct = (id, product, modifiedBy) =>
  query(
    "UPDATE tblproducto SET StrNombre = ?, StrCodigo = ?, NumPrecioCompra = ?, NumPrecioVenta = ?, idCategoria = ?, StrDetalle = ?, strFoto = ?, NumStock = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdProducto = ?",
    [
      product.StrNombre,
      product.StrCodigo,
      product.NumPrecioCompra || null,
      product.NumPrecioVenta || null,
      product.idCategoria || null,
      product.StrDetalle || null,
      product.strFoto || null,
      product.NumStock || 0,
      modifiedBy,
      id,
    ],
  );

const deleteProduct = (id) =>
  query("DELETE FROM tblproducto WHERE IdProducto = ?", [id]);

module.exports = {
  listProducts,
  findProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
