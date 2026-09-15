const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");

dotenv.config({ path: "./env/.env" });

const connection = require("./database/db");
const app = express();

const queryDatabase = (sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });

const runTransaction = async (callback) => {
  await queryDatabase("START TRANSACTION");
  try {
    const result = await callback();
    await queryDatabase("COMMIT");
    return result;
  } catch (error) {
    await queryDatabase("ROLLBACK");
    throw error;
  }
};

app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(express.json({ limit: "50kb" }));
app.use("/resources", express.static(`${__dirname}/public`));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

app.use((request, response, next) => {
  request.queryDatabase = queryDatabase;
  response.locals.canAccessProducts = Boolean(
    request.session.canAccessProducts,
  );
  response.locals.canAccessSecurity = Boolean(
    request.session.canAccessSecurity,
  );
  next();
});

const dependencies = { queryDatabase, runTransaction };
app.use(require("./routes/auth")(dependencies));
app.use(require("./routes/users")(dependencies));
app.use(require("./routes/products")(dependencies));
app.use(require("./routes/clients")(dependencies));
app.use(require("./routes/invoices")(dependencies));

app.get("/index", (request, response) => {
  response.render("index", {
    login: Boolean(request.session.loggedin),
    name: request.session.name || "",
  });
});

app.get("/ayuda", (request, response) => {
  response.render("ayuda", {
    login: Boolean(request.session.loggedin),
    name: request.session.name || "",
  });
});

app.get("/acerca", (request, response) => {
  response.render("acerca", {
    login: Boolean(request.session.loggedin),
    name: request.session.name || "",
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
