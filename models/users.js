const { query } = require("./database");

const userFields =
  "id, name, CanAccessProducts, CanAccessSecurity";

const listUsers = () =>
  query(`SELECT ${userFields} FROM users ORDER BY id DESC`);

const findUserById = (id) =>
  query(`SELECT ${userFields} FROM users WHERE id = ?`, [id]);

const findUserByName = (name) =>
  query(
    "SELECT id, name, pass, CanAccessProducts, CanAccessSecurity FROM users WHERE name = ? LIMIT 1",
    [name],
  );

const createUser = (name, passwordHash, productAccess, securityAccess) =>
  query(
    "INSERT INTO users (name, pass, CanAccessProducts, CanAccessSecurity) VALUES (?, ?, ?, ?)",
    [name, passwordHash, productAccess, securityAccess],
  );

const createRegisteredUser = (name, passwordHash) =>
  query(
    "INSERT INTO users (name, pass, CanAccessProducts, CanAccessSecurity) VALUES (?, ?, 1, 1)",
    [name, passwordHash],
  );

const updateUser = (id, user, passwordHash) => {
  const values = [user.name, user.productAccess, user.securityAccess];
  let sql =
    "UPDATE users SET name = ?, CanAccessProducts = ?, CanAccessSecurity = ?";

  if (passwordHash) {
    sql += ", pass = ?";
    values.push(passwordHash);
  }

  values.push(id);
  return query(`${sql} WHERE id = ?`, values);
};

const deleteUser = (id) => query("DELETE FROM users WHERE id = ?", [id]);

module.exports = {
  listUsers,
  findUserById,
  findUserByName,
  createUser,
  createRegisteredUser,
  updateUser,
  deleteUser,
};
