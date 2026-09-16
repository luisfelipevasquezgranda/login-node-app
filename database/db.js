// 2 - Invocamos a MySQL y realizamos la conexión
const mysql = require("mysql2");

const connection = mysql.createConnection({
  // Con variables de entorno
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Se añade el puerto configurado (22706)
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // Se corrige DB_DATABASE a DB_NAME
  ssl: {
    rejectUnauthorized: false, // Requisito obligatorio para Railway
  },
});

connection.connect((error) => {
  if (error) {
    console.error("El error de conexión es: " + error);
    return;
  }
  console.log("¡Conectado a la Base de Datos!");
});

module.exports = connection;
