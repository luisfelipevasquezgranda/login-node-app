// 1 - traemos a express
const express = require("express");
const app = express();

// 2 - seteamos urlencoded y json para poder recibir datos de formularios y json
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3 - invocamos a dotenv para poder usar variables de entorno
const dotenv = require("dotenv");
dotenv.config({ path: "./env/.env" });

// 4 - Directorio public para que se pueda acceder a los archivos estáticos (css, js, imágenes, etc.)
app.use("/resources", express.static(__dirname + "/public"));

// 5 - Directorio views para que se pueda acceder a los archivos de vistas (html, ejs, etc.)
app.set("view engine", "ejs");

// 6 - hash de las contraseñas
const bcryptjs = require("bcryptjs");

// 7 - express-session para poder crear sesiones de usuario
const session = require("express-session");
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  }),
);

app.use((request, response, next) => {
  response.locals.canAccessProducts =
    !!request.session.loggedin && !!request.session.canAccessProducts;
  response.locals.canAccessSecurity =
    !!request.session.loggedin && !!request.session.canAccessSecurity;
  next();
});

const requireAccess = (permission) => async (request, response, next) => {
  if (!request.session.loggedin) return response.redirect("/login");

  if (typeof request.session[permission] === "undefined") {
    try {
      const users = await queryDatabase(
        "SELECT CanAccessProducts, CanAccessSecurity FROM users WHERE name = ? LIMIT 1",
        [request.session.name],
      );
      if (users.length > 0) {
        request.session.canAccessProducts = !!users[0].CanAccessProducts;
        request.session.canAccessSecurity = !!users[0].CanAccessSecurity;
      }
    } catch (error) {
      console.error(error);
      return response.status(500).send("No se pudieron comprobar los permisos");
    }
  }

  if (!request.session[permission]) {
    return response
      .status(403)
      .send("No tienes permiso para acceder a este módulo");
  }
  next();
};

// 8 - Invocamos a la base de datos
const connection = require("./database/db");
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

// 9 - Rutas
app.get("/", (request, response) => {
  response.render("login");
});

app.get("/login", (request, response) => {
  response.render("login");
});

app.get("/index", (request, response) => {
  response.render("index", {
    login: !!request.session.loggedin,
    name: request.session.name || "",
  });
});

app.get("/facturacion", (request, response) => {
  response.render("facturas-menu", {
    login: !!request.session.loggedin,
    name: request.session.name || "",
  });
});

app.get("/facturacion/nueva", async (request, response) => {
  try {
    const [clients, products] = await Promise.all([
      queryDatabase(
        "SELECT IdCliente, StrNombre FROM tblclientes ORDER BY StrNombre",
      ),
      queryDatabase(
        "SELECT IdProducto, StrNombre, NumPrecioVenta FROM tblproducto ORDER BY StrNombre",
      ),
    ]);

    response.render("facturacion", {
      login: !!request.session.loggedin,
      name: request.session.name || "",
      clients,
      products,
    });
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .send(
        `Error al cargar facturación: ${error.sqlMessage || error.message}`,
      );
  }
});

app.get("/facturacion/admin", async (request, response) => {
  try {
    const search = (request.query.search || "").trim();
    const likeSearch = `%${search}%`;
    const [invoices, statuses] = await Promise.all([
      queryDatabase(
        `SELECT f.*, c.StrNombre AS Cliente, e.StrDescripcion AS Estado,
          (SELECT COUNT(*) FROM tbldetalle_factura d WHERE d.IdFactura = f.IdFactura) AS CantidadDetalles
         FROM tblfactura f
         LEFT JOIN tblclientes c ON c.IdCliente = f.IdCliente
         LEFT JOIN tblestado_factura e ON e.IdEstadoFactura = f.IdEstado
         WHERE CAST(f.IdFactura AS CHAR) LIKE ? OR COALESCE(c.StrNombre, '') LIKE ?
         ORDER BY f.IdFactura DESC`,
        [likeSearch, likeSearch],
      ),
      queryDatabase(
        "SELECT * FROM tblestado_factura ORDER BY IdEstadoFactura DESC",
      ),
    ]);

    response.render("facturas-admin", {
      login: !!request.session.loggedin,
      name: request.session.name || "",
      invoices,
      statuses,
      search,
    });
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .send(
        `Error al cargar la administración: ${error.sqlMessage || error.message}`,
      );
  }
});

app.post("/facturacion/estados", async (request, response) => {
  try {
    await queryDatabase(
      "INSERT INTO tblestado_factura (StrDescripcion) VALUES (?)",
      [request.body.StrDescripcion?.trim() || null],
    );
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .send(`No se pudo crear el estado: ${error.sqlMessage || error.message}`);
  }
});

app.post("/facturacion/estados/:id/update", async (request, response) => {
  try {
    const result = await queryDatabase(
      "UPDATE tblestado_factura SET StrDescripcion = ? WHERE IdEstadoFactura = ?",
      [request.body.StrDescripcion?.trim() || null, request.params.id],
    );
    if (!result.affectedRows)
      return response.status(404).send("Estado no encontrado");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo actualizar el estado");
  }
});

app.post("/facturacion/estados/:id/delete", async (request, response) => {
  try {
    const result = await queryDatabase(
      "DELETE FROM tblestado_factura WHERE IdEstadoFactura = ?",
      [request.params.id],
    );
    if (!result.affectedRows)
      return response.status(404).send("Estado no encontrado");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo eliminar el estado");
  }
});

app.post("/facturacion/facturas", async (request, response) => {
  const {
    DtmFecha,
    IdCliente,
    IdEmpleado,
    NumDescuento,
    NumImpuesto,
    NumValorTotal,
    IdEstado,
  } = request.body;

  try {
    await queryDatabase(
      `INSERT INTO tblfactura
        (DtmFecha, IdCliente, IdEmpleado, NumDescuento, NumImpuesto,
         NumValorTotal, IdEstado, DtmFechaModifica, StrUsuarioModifico)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        DtmFecha || null,
        IdCliente || null,
        IdEmpleado || null,
        NumDescuento || null,
        NumImpuesto || null,
        NumValorTotal || null,
        IdEstado || null,
        request.session.name || "sistema",
      ],
    );
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .send(
        `No se pudo crear la factura: ${error.sqlMessage || error.message}`,
      );
  }
});

app.post("/facturacion/registrar", async (request, response) => {
  const { IdCliente, NumDescuento, NumImpuesto, items } = request.body;

  if (!IdCliente || !Array.isArray(items) || items.length === 0) {
    return response
      .status(400)
      .json({ message: "Selecciona un cliente y agrega al menos un producto" });
  }

  try {
    const invoiceId = await runTransaction(async () => {
      const products = await queryDatabase(
        "SELECT IdProducto, NumPrecioVenta FROM tblproducto WHERE IdProducto IN (?)",
        [items.map((item) => Number(item.IdProducto))],
      );
      const productMap = new Map(
        products.map((product) => [product.IdProducto, product]),
      );
      const normalizedItems = items.map((item) => {
        const product = productMap.get(Number(item.IdProducto));
        const quantity = Number(item.NumCantidad);
        if (!product || !Number.isInteger(quantity) || quantity < 1) {
          throw new Error("Uno de los productos o cantidades no es válido");
        }
        return {
          IdProducto: product.IdProducto,
          NumCantidad: quantity,
          NumPrecio: Number(product.NumPrecioVenta) || 0,
        };
      });
      const subtotal = normalizedItems.reduce(
        (total, item) => total + item.NumCantidad * item.NumPrecio,
        0,
      );
      const discount = Math.max(Number(NumDescuento) || 0, 0);
      const tax = Math.max(Number(NumImpuesto) || 0, 0);
      const total = Math.max(subtotal - discount + tax, 0);
      let statuses = await queryDatabase(
        "SELECT IdEstadoFactura FROM tblestado_factura WHERE LOWER(StrDescripcion) IN ('pendiente', 'creada') LIMIT 1",
      );
      if (statuses.length === 0) {
        const statusResult = await queryDatabase(
          "INSERT INTO tblestado_factura (StrDescripcion) VALUES ('Pendiente')",
        );
        statuses = [{ IdEstadoFactura: statusResult.insertId }];
      }
      const invoiceResult = await queryDatabase(
        `INSERT INTO tblfactura
          (DtmFecha, IdCliente, NumDescuento, NumImpuesto, NumValorTotal,
           IdEstado, DtmFechaModifica, StrUsuarioModifico)
         VALUES (NOW(), ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          IdCliente,
          discount,
          tax,
          total,
          statuses[0].IdEstadoFactura,
          request.session.name || "sistema",
        ],
      );
      for (const item of normalizedItems) {
        await queryDatabase(
          "INSERT INTO tbldetalle_factura (IdFactura, NumCantidad, IdProducto, NumPrecio) VALUES (?, ?, ?, ?)",
          [
            invoiceResult.insertId,
            item.NumCantidad,
            item.IdProducto,
            item.NumPrecio,
          ],
        );
      }
      return invoiceResult.insertId;
    });
    response.json({ ok: true, invoiceId });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      message:
        error.sqlMessage || error.message || "No se pudo crear la factura",
    });
  }
});

app.post("/facturacion/facturas/:id/update", async (request, response) => {
  const {
    DtmFecha,
    IdCliente,
    IdEmpleado,
    NumDescuento,
    NumImpuesto,
    NumValorTotal,
    IdEstado,
  } = request.body;

  try {
    const result = await queryDatabase(
      `UPDATE tblfactura SET DtmFecha = ?, IdCliente = ?, IdEmpleado = ?,
       NumDescuento = ?, NumImpuesto = ?, NumValorTotal = ?, IdEstado = ?,
       DtmFechaModifica = NOW(), StrUsuarioModifico = ?
       WHERE IdFactura = ?`,
      [
        DtmFecha || null,
        IdCliente || null,
        IdEmpleado || null,
        NumDescuento || null,
        NumImpuesto || null,
        NumValorTotal || null,
        IdEstado || null,
        request.session.name || "sistema",
        request.params.id,
      ],
    );
    if (!result.affectedRows)
      return response.status(404).send("Factura no encontrada");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo actualizar la factura");
  }
});

app.post("/facturacion/facturas/:id/delete", async (request, response) => {
  try {
    const result = await queryDatabase(
      "DELETE FROM tblfactura WHERE IdFactura = ?",
      [request.params.id],
    );
    if (!result.affectedRows)
      return response.status(404).send("Factura no encontrada");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo eliminar la factura");
  }
});

app.post("/facturacion/detalles", async (request, response) => {
  const { IdFactura, NumCantidad, IdProducto, NumPrecio } = request.body;

  try {
    await queryDatabase(
      "INSERT INTO tbldetalle_factura (IdFactura, NumCantidad, IdProducto, NumPrecio) VALUES (?, ?, ?, ?)",
      [
        IdFactura || null,
        NumCantidad || null,
        IdProducto || null,
        NumPrecio || null,
      ],
    );
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .send(
        `No se pudo crear el detalle: ${error.sqlMessage || error.message}`,
      );
  }
});

app.post("/facturacion/detalles/:id/update", async (request, response) => {
  const { IdFactura, NumCantidad, IdProducto, NumPrecio } = request.body;

  try {
    const result = await queryDatabase(
      `UPDATE tbldetalle_factura SET IdFactura = ?, NumCantidad = ?,
       IdProducto = ?, NumPrecio = ? WHERE idDetalle = ?`,
      [
        IdFactura || null,
        NumCantidad || null,
        IdProducto || null,
        NumPrecio || null,
        request.params.id,
      ],
    );
    if (!result.affectedRows)
      return response.status(404).send("Detalle no encontrado");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo actualizar el detalle");
  }
});

app.post("/facturacion/detalles/:id/delete", async (request, response) => {
  try {
    const result = await queryDatabase(
      "DELETE FROM tbldetalle_factura WHERE idDetalle = ?",
      [request.params.id],
    );
    if (!result.affectedRows)
      return response.status(404).send("Detalle no encontrado");
    response.redirect("/facturacion");
  } catch (error) {
    console.error(error);
    response.status(500).send("No se pudo eliminar el detalle");
  }
});

app.get(
  "/seguridad",
  requireAccess("canAccessSecurity"),
  (request, response) => {
    const alert = request.session.alert;
    delete request.session.alert;

    connection.query(
      "SELECT id, name, CanAccessProducts, CanAccessSecurity FROM users ORDER BY id DESC",
      (error, users) => {
        if (error) {
          console.error(error);
          return response.status(500).send("Error al cargar los usuarios");
        }

        response.render("seguridad", {
          login: !!request.session.loggedin,
          name: request.session.name || "",
          users,
          alert,
        });
      },
    );
  },
);

app.get(
  "/users/create",
  requireAccess("canAccessSecurity"),
  (request, response) => {
    response.render("create", {
      login: !!request.session.loggedin,
      name: request.session.name || "",
    });
  },
);

app.post(
  "/users",
  requireAccess("canAccessSecurity"),
  async (request, response) => {
    const { name, password } = request.body;

    if (!name || !password) {
      return response
        .status(400)
        .send("El nombre y la contraseña son obligatorios");
    }

    try {
      const passwordHash = await bcryptjs.hash(password, 8);
      connection.query(
        "INSERT INTO users SET ?",
        {
          name: name.trim(),
          pass: passwordHash,
          CanAccessProducts: request.body.CanAccessProducts === "1" ? 1 : 0,
          CanAccessSecurity: request.body.CanAccessSecurity === "1" ? 1 : 0,
        },
        (error) => {
          if (error) {
            console.error(error);
            return response.status(500).send("No se pudo crear el usuario");
          }
          response.redirect("/seguridad");
        },
      );
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo crear el usuario");
    }
  },
);

app.get(
  "/users/:id/edit",
  requireAccess("canAccessSecurity"),
  (request, response) => {
    connection.query(
      "SELECT id, name, CanAccessProducts, CanAccessSecurity FROM users WHERE id = ?",
      [request.params.id],
      (error, results) => {
        if (error) {
          console.error(error);
          return response.status(500).send("Error al buscar el usuario");
        }
        if (results.length === 0)
          return response.status(404).send("Usuario no encontrado");

        response.render("edit", {
          user: results[0],
          login: !!request.session.loggedin,
          name: request.session.name || "",
        });
      },
    );
  },
);

app.post(
  "/users/:id/update",
  requireAccess("canAccessSecurity"),
  async (request, response) => {
    const { name, password } = request.body;

    if (!name) return response.status(400).send("El nombre es obligatorio");

    try {
      const values = [name.trim()];
      let query =
        "UPDATE users SET name = ?, CanAccessProducts = ?, CanAccessSecurity = ?";
      values.push(request.body.CanAccessProducts === "1" ? 1 : 0);
      values.push(request.body.CanAccessSecurity === "1" ? 1 : 0);

      if (password) {
        query += ", pass = ?";
        values.push(await bcryptjs.hash(password, 8));
      }

      query += " WHERE id = ?";
      values.push(request.params.id);

      connection.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          return response.status(500).send("No se pudo actualizar el usuario");
        }
        if (result.affectedRows === 0)
          return response.status(404).send("Usuario no encontrado");
        response.redirect("/seguridad");
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo actualizar el usuario");
    }
  },
);

app.post(
  "/users/:id/delete",
  requireAccess("canAccessSecurity"),
  (request, response) => {
    connection.query(
      "DELETE FROM users WHERE id = ?",
      [request.params.id],
      (error, result) => {
        if (error) {
          console.error(error);
          return response.status(500).send("No se pudo eliminar el usuario");
        }
        if (result.affectedRows === 0)
          return response.status(404).send("Usuario no encontrado");
        response.redirect("/seguridad");
      },
    );
  },
);

app.get("/tablas", (request, response) => {
  response.render("tablas", {
    login: !!request.session.loggedin,
    name: request.session.name || "",
  });
});

app.get(
  "/tablas/productos",
  requireAccess("canAccessProducts"),
  (request, response) => {
    connection.query(
      "SELECT * FROM tblproducto ORDER BY IdProducto DESC",
      (error, products) => {
        if (error) {
          console.error(error);
          return response.status(500).send("Error al cargar los productos");
        }

        connection.query(
          "SELECT idCategoria, StrDescripcion, DtmFechaCreacion, StrUsuarioCreo FROM tblcategoria_prod ORDER BY StrDescripcion",
          (categoryError, categories) => {
            if (categoryError) {
              console.error(categoryError);
              return response
                .status(500)
                .send("Error al cargar las categorías");
            }

            response.render("productos", {
              login: !!request.session.loggedin,
              name: request.session.name || "",
              products,
              categories,
              editingProduct: null,
              editingCategory: null,
            });
          },
        );
      },
    );
  },
);

app.get(
  "/tablas/productos/:id/edit",
  requireAccess("canAccessProducts"),
  (request, response) => {
    connection.query(
      "SELECT * FROM tblproducto WHERE IdProducto = ?",
      [request.params.id],
      (error, productResults) => {
        if (error) {
          console.error(error);
          return response.status(500).send("Error al buscar el producto");
        }
        if (productResults.length === 0) {
          return response.status(404).send("Producto no encontrado");
        }

        connection.query(
          "SELECT * FROM tblproducto ORDER BY IdProducto DESC",
          (listError, products) => {
            if (listError) {
              console.error(listError);
              return response.status(500).send("Error al cargar los productos");
            }

            connection.query(
              "SELECT idCategoria, StrDescripcion, DtmFechaCreacion, StrUsuarioCreo FROM tblcategoria_prod ORDER BY StrDescripcion",
              (categoryError, categories) => {
                if (categoryError) {
                  console.error(categoryError);
                  return response
                    .status(500)
                    .send("Error al cargar las categorías");
                }

                response.render("productos", {
                  login: !!request.session.loggedin,
                  name: request.session.name || "",
                  products,
                  categories,
                  editingProduct: productResults[0],
                  editingCategory: null,
                });
              },
            );
          },
        );
      },
    );
  },
);

app.get(
  "/tablas/categorias/:id/edit",
  requireAccess("canAccessProducts"),
  (request, response) => {
    connection.query(
      "SELECT * FROM tblcategoria_prod WHERE idCategoria = ?",
      [request.params.id],
      (error, categoryResults) => {
        if (error) {
          console.error(error);
          return response.status(500).send("Error al buscar la categoría");
        }
        if (categoryResults.length === 0) {
          return response.status(404).send("Categoría no encontrada");
        }

        connection.query(
          "SELECT * FROM tblproducto ORDER BY IdProducto DESC",
          (productError, products) => {
            if (productError) {
              console.error(productError);
              return response.status(500).send("Error al cargar los productos");
            }
            response.render("productos", {
              login: !!request.session.loggedin,
              name: request.session.name || "",
              products,
              categories: categoryResults,
              editingProduct: null,
              editingCategory: categoryResults[0],
            });
          },
        );
      },
    );
  },
);

app.post(
  "/tablas/categorias",
  requireAccess("canAccessProducts"),
  (request, response) => {
    const { StrDescripcion } = request.body;

    if (!request.session.loggedin || !request.session.name) {
      return response.redirect("/login");
    }

    if (!StrDescripcion || !StrDescripcion.trim()) {
      return response
        .status(400)
        .send("La descripción de la categoría es obligatoria");
    }

    connection.query(
      `INSERT INTO tblcategoria_prod
      (StrDescripcion, DtmFechaCreacion, StrUsuarioCreo,
       DtmFechaModifica, StrUsuarioModifico)
     VALUES (?, NOW(), ?, NOW(), ?)`,
      [StrDescripcion.trim(), request.session.name, request.session.name],
      (error) => {
        if (error) {
          console.error(error);
          return response.status(500).send("No se pudo crear la categoría");
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.post(
  "/tablas/categorias/:id/update",
  requireAccess("canAccessProducts"),
  (request, response) => {
    const { StrDescripcion } = request.body;

    if (!StrDescripcion || !StrDescripcion.trim()) {
      return response
        .status(400)
        .send("La descripción de la categoría es obligatoria");
    }

    connection.query(
      `UPDATE tblcategoria_prod
     SET StrDescripcion = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ?
     WHERE idCategoria = ?`,
      [
        StrDescripcion.trim(),
        request.session.name || "sistema",
        request.params.id,
      ],
      (error, result) => {
        if (error) {
          console.error(error);
          return response
            .status(500)
            .send("No se pudo actualizar la categoría");
        }
        if (result.affectedRows === 0) {
          return response.status(404).send("Categoría no encontrada");
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.post(
  "/tablas/categorias/:id/delete",
  requireAccess("canAccessProducts"),
  (request, response) => {
    connection.query(
      "DELETE FROM tblcategoria_prod WHERE idCategoria = ?",
      [request.params.id],
      (error, result) => {
        if (error) {
          console.error(error);
          return response.status(500).send("No se pudo eliminar la categoría");
        }
        if (result.affectedRows === 0) {
          return response.status(404).send("Categoría no encontrada");
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.post(
  "/tablas/productos",
  requireAccess("canAccessProducts"),
  (request, response) => {
    const {
      StrNombre,
      StrCodigo,
      NumPrecioCompra,
      NumPrecioVenta,
      idCategoria,
      StrDetalle,
      strFoto,
      NumStock,
    } = request.body;

    if (!StrNombre || !StrCodigo) {
      return response
        .status(400)
        .send("El nombre y el código son obligatorios");
    }

    connection.query(
      `INSERT INTO tblproducto
      (StrNombre, StrCodigo, NumPrecioCompra, NumPrecioVenta, idCategoria,
       StrDetalle, strFoto, NumStock, DtmFechaModifica, StrUsuarioModifico)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        StrNombre.trim(),
        StrCodigo.trim(),
        NumPrecioCompra || null,
        NumPrecioVenta || null,
        idCategoria ? Number(idCategoria) : null,
        StrDetalle || null,
        strFoto || null,
        NumStock || 0,
        request.session.name || "sistema",
      ],
      (error) => {
        if (error) {
          console.error(error);
          return response
            .status(500)
            .send(
              `No se pudo crear el producto: ${error.sqlMessage || error.message}`,
            );
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.post(
  "/tablas/productos/:id/update",
  requireAccess("canAccessProducts"),
  (request, response) => {
    const {
      StrNombre,
      StrCodigo,
      NumPrecioCompra,
      NumPrecioVenta,
      idCategoria,
      StrDetalle,
      strFoto,
      NumStock,
    } = request.body;

    if (!StrNombre || !StrCodigo) {
      return response
        .status(400)
        .send("El nombre y el código son obligatorios");
    }

    connection.query(
      `UPDATE tblproducto SET
      StrNombre = ?, StrCodigo = ?, NumPrecioCompra = ?, NumPrecioVenta = ?,
      idCategoria = ?, StrDetalle = ?, strFoto = ?, NumStock = ?,
      DtmFechaModifica = NOW(), StrUsuarioModifico = ?
     WHERE IdProducto = ?`,
      [
        StrNombre.trim(),
        StrCodigo.trim(),
        NumPrecioCompra || null,
        NumPrecioVenta || null,
        idCategoria ? Number(idCategoria) : null,
        StrDetalle || null,
        strFoto || null,
        NumStock || 0,
        request.session.name || "sistema",
        request.params.id,
      ],
      (error, result) => {
        if (error) {
          console.error(error);
          return response.status(500).send("No se pudo actualizar el producto");
        }
        if (result.affectedRows === 0) {
          return response.status(404).send("Producto no encontrado");
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.post(
  "/tablas/productos/:id/delete",
  requireAccess("canAccessProducts"),
  (request, response) => {
    connection.query(
      "DELETE FROM tblproducto WHERE IdProducto = ?",
      [request.params.id],
      (error, result) => {
        if (error) {
          console.error(error);
          return response
            .status(500)
            .send(
              `No se pudo eliminar el producto: ${error.sqlMessage || error.message}`,
            );
        }
        if (result.affectedRows === 0) {
          return response.status(404).send("Producto no encontrado");
        }
        response.redirect("/tablas/productos");
      },
    );
  },
);

app.get("/tablas/clientes", (request, response) => {
  connection.query(
    "SELECT * FROM tblclientes ORDER BY IdCliente DESC",
    (error, clients) => {
      if (error) {
        console.error(error);
        return response.status(500).send("Error al cargar los clientes");
      }

      response.render("clientes", {
        login: !!request.session.loggedin,
        name: request.session.name || "",
        clients,
        editingClient: null,
      });
    },
  );
});

app.get("/tablas/clientes/:id/edit", (request, response) => {
  connection.query(
    "SELECT * FROM tblclientes WHERE IdCliente = ?",
    [request.params.id],
    (error, clientResults) => {
      if (error) {
        console.error(error);
        return response.status(500).send("Error al buscar el cliente");
      }
      if (clientResults.length === 0) {
        return response.status(404).send("Cliente no encontrado");
      }

      connection.query(
        "SELECT * FROM tblclientes ORDER BY IdCliente DESC",
        (listError, clients) => {
          if (listError) {
            console.error(listError);
            return response.status(500).send("Error al cargar los clientes");
          }

          response.render("clientes", {
            login: !!request.session.loggedin,
            name: request.session.name || "",
            clients,
            editingClient: clientResults[0],
          });
        },
      );
    },
  );
});

app.post("/tablas/clientes", (request, response) => {
  const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } =
    request.body;

  if (!StrNombre || !StrNombre.trim()) {
    return response.status(400).send("El nombre del cliente es obligatorio");
  }

  connection.query(
    `INSERT INTO tblclientes
      (StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail,
       DtmFechaModifica, StrUsuarioModifico)
     VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
    [
      StrNombre.trim(),
      NumDocumento || null,
      StrDireccion || null,
      StrTelefono || null,
      StrEmail || null,
      request.session.name || "sistema",
    ],
    (error) => {
      if (error) {
        console.error(error);
        return response
          .status(500)
          .send(
            `No se pudo crear el cliente: ${error.sqlMessage || error.message}`,
          );
      }
      response.redirect("/tablas/clientes");
    },
  );
});

app.post("/tablas/clientes/:id/update", (request, response) => {
  const { StrNombre, NumDocumento, StrDireccion, StrTelefono, StrEmail } =
    request.body;

  if (!StrNombre || !StrNombre.trim()) {
    return response.status(400).send("El nombre del cliente es obligatorio");
  }

  connection.query(
    `UPDATE tblclientes SET
      StrNombre = ?, NumDocumento = ?, StrDireccion = ?, StrTelefono = ?,
      StrEmail = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ?
     WHERE IdCliente = ?`,
    [
      StrNombre.trim(),
      NumDocumento || null,
      StrDireccion || null,
      StrTelefono || null,
      StrEmail || null,
      request.session.name || "sistema",
      request.params.id,
    ],
    (error, result) => {
      if (error) {
        console.error(error);
        return response.status(500).send("No se pudo actualizar el cliente");
      }
      if (result.affectedRows === 0) {
        return response.status(404).send("Cliente no encontrado");
      }
      response.redirect("/tablas/clientes");
    },
  );
});

app.post("/tablas/clientes/:id/delete", (request, response) => {
  connection.query(
    "DELETE FROM tblclientes WHERE IdCliente = ?",
    [request.params.id],
    (error, result) => {
      if (error) {
        console.error(error);
        return response.status(500).send("No se pudo eliminar el cliente");
      }
      if (result.affectedRows === 0) {
        return response.status(404).send("Cliente no encontrado");
      }
      response.redirect("/tablas/clientes");
    },
  );
});

app.get("/ayuda", (request, response) => {
  response.render("ayuda", {
    login: !!request.session.loggedin,
    name: request.session.name || "",
  });
});

app.get("/acerca", (request, response) => {
  response.render("acerca", {
    login: !!request.session.loggedin,
    name: request.session.name || "",
  });
});

app.get("/register", (request, response) => {
  response.render("register");
});

app.post("/register", async (req, res) => {
  const name = req.body.name;
  const password = req.body.password;

  if (!name || !password) {
    return res.send("Please enter user and Password!");
  }

  let passwordHash = await bcryptjs.hash(password, 8);
  connection.query(
    "INSERT INTO users SET ?",
    { name: name, pass: passwordHash },
    async (error, results) => {
      if (error) {
        console.log(error);
      } else {
        res.render("register", {
          alert: true,
          alertTitle: "Registration",
          alertMessage: "¡Successful Registration!",
          alertIcon: "success",
          showConfirmButton: false,
          timer: 1500,
          ruta: "",
        });
      }
    },
  );
});

app.post("/auth", async (req, res) => {
  const name = req.body.name;
  const password = req.body.password;

  if (name && password) {
    connection.query(
      "SELECT * FROM users WHERE name = ?",
      [name],
      async (error, results) => {
        if (error) {
          console.log(error);
          return res.status(500).send("Error al buscar usuario");
        }

        if (
          results.length === 0 ||
          !(await bcryptjs.compare(password, results[0].pass))
        ) {
          res.render("login", {
            alert: true,
            alertTitle: "Error",
            alertMessage: "USUARIO y/o PASSWORD incorrectas",
            alertIcon: "error",
            showConfirmButton: true,
            timer: false,
            ruta: "login",
          });
        } else {
          req.session.loggedin = true;
          req.session.name = results[0].name;
          req.session.canAccessProducts = !!results[0].CanAccessProducts;
          req.session.canAccessSecurity = !!results[0].CanAccessSecurity;
          req.session.alert = {
            alert: true,
            alertTitle: "Conexión exitosa",
            alertMessage: "¡LOGIN CORRECTO!",
            alertIcon: "success",
            showConfirmButton: false,
            timer: 1500,
            ruta: "",
          };
          res.redirect("/index");
        }
      },
    );
  } else {
    res.send("Please enter user and Password!");
  }
});

app.use(function (req, res, next) {
  if (!req.user)
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  next();
});

app.get("/logout", function (req, res) {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
