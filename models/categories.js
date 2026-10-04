const { query } = require("./database");

const listCategories = () =>
  query(
    "SELECT idCategoria, StrDescripcion, DtmFechaCreacion, StrUsuarioCreo FROM tblcategoria_prod ORDER BY StrDescripcion",
  );

const createCategory = (description, user) =>
  query(
    "INSERT INTO tblcategoria_prod (StrDescripcion, DtmFechaCreacion, StrUsuarioCreo, DtmFechaModifica, StrUsuarioModifico) VALUES (?, NOW(), ?, NOW(), ?)",
    [description, user, user],
  );

const updateCategory = (id, description, user) =>
  query(
    "UPDATE tblcategoria_prod SET StrDescripcion = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE idCategoria = ?",
    [description, user, id],
  );

const deleteCategory = (id) =>
  query("DELETE FROM tblcategoria_prod WHERE idCategoria = ?", [id]);

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
