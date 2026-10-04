const { query } = require("./database");

const listClients = () =>
  query("SELECT * FROM tblclientes ORDER BY IdCliente DESC");

const findClientById = (id) =>
  query("SELECT * FROM tblclientes WHERE IdCliente = ?", [id]);

const createClient = (client, modifiedBy) =>
  query(
    "INSERT INTO tblclientes (StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail, DtmFechaModifica, StrUsuarioModifico) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
    [
      client.StrNombre,
      client.NumDocumento || null,
      client.StrDireccion || null,
      client.StrTelefono || null,
      client.StrEmail || null,
      modifiedBy,
    ],
  );

const updateClient = (id, client, modifiedBy) =>
  query(
    "UPDATE tblclientes SET StrNombre = ?, NumDocumento = ?, StrDireccion = ?, StrTelefono = ?, StrEmail = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdCliente = ?",
    [
      client.StrNombre,
      client.NumDocumento || null,
      client.StrDireccion || null,
      client.StrTelefono || null,
      client.StrEmail || null,
      modifiedBy,
      id,
    ],
  );

const deleteClient = (id) =>
  query("DELETE FROM tblclientes WHERE IdCliente = ?", [id]);

module.exports = {
  listClients,
  findClientById,
  createClient,
  updateClient,
  deleteClient,
};
