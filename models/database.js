const pool = require("../database/db");

const query = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return results;
};

const withTransaction = async (callback) => {
  const connection = await pool.getConnection();

  const transactionQuery = async (sql, params = []) => {
    const [results] = await connection.query(sql, params);
    return results;
  };

  try {
    await connection.beginTransaction();
    const result = await callback(transactionQuery);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { query, withTransaction };
