const express = require("express");
const session = require("cookie-session");
const dotenv = require("dotenv");

dotenv.config({ path: "./env/.env" });

const pool = require("./database/db");
const app = express();

// Requisito fundamental para que cookie-session funcione bajo el HTTPS de Vercel
app.set("trust proxy", 1);

// Helper para consultas individuales sobre el Pool usando async/await
const queryDatabase = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return results;
};

// Helper para Transacciones
const runTransaction = async (callback) => {
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

app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(express.json({ limit: "50kb" }));
app.use("/resources", express.static(`${__dirname}/public`));
app.set("view engine", "ejs");

// Configuración de Cookies
app.use(
  session({
    name: "controla-session",
    keys: [process.env.SESSION_SECRET || "change-this-session-secret"],
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
  }),
);

app.use((request, response, next) => {
  request.queryDatabase = queryDatabase;

  // Garantizar objeto session para evitar lectura de undefined
  const sessionData = request.session || {};
  response.locals.canAccessProducts = Boolean(sessionData.canAccessProducts);
  response.locals.canAccessSecurity = Boolean(sessionData.canAccessSecurity);
  next();
});

const dependencies = { queryDatabase, runTransaction };
app.use(require("./routes/auth")(dependencies));
app.use(require("./routes/users")(dependencies));
app.use(require("./routes/products")(dependencies));
app.use(require("./routes/clients")(dependencies));
app.use(require("./routes/invoices")(dependencies));

app.get("/index", (request, response) => {
  const sessionData = request.session || {};
  response.render("index", {
    login: Boolean(sessionData.loggedin),
    name: sessionData.name || "",
  });
});

app.get("/ayuda", (request, response) => {
  const sessionData = request.session || {};
  response.render("ayuda", {
    login: Boolean(sessionData.loggedin),
    name: sessionData.name || "",
  });
});

app.get("/acerca", (request, response) => {
  const sessionData = request.session || {};
  response.render("acerca", {
    login: Boolean(sessionData.loggedin),
    name: sessionData.name || "",
  });
});

app.use((request, response) =>
  response.status(404).send("Página no encontrada"),
);

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).send("Error interno del servidor");
});

if (require.main === module) {
  app.listen(process.env.PORT || 3000, () => {
    console.log(
      `Server running on http://localhost:${process.env.PORT || 3000}`,
    );
  });
}

module.exports = app;
