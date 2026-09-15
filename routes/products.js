const express = require("express");
const { requireLogin, requireAccess } = require("../middleware/auth");
const router = express.Router();

module.exports = ({ queryDatabase }) => {
  const productsAccess = requireAccess("canAccessProducts");

  // =========================================
  // CARGA INICIAL / LECTURA
  // =========================================
  const loadCatalog = async () =>
    Promise.all([
      queryDatabase("SELECT * FROM tblproducto ORDER BY IdProducto DESC"),
      queryDatabase(
        "SELECT idCategoria, StrDescripcion, DtmFechaCreacion, StrUsuarioCreo FROM tblcategoria_prod ORDER BY StrDescripcion",
      ),
    ]);

  // Ruta principal de tablas.
  router.get("/tablas", requireLogin, (request, response) =>
    response.render("tablas", { login: true, name: request.session.name }),
  );

  // CRUD PRODUCTOS
  // READ: listar productos .
  router.get("/tablas/productos", productsAccess, async (request, response) => {
    try {
      const [products, categories] = await loadCatalog();
      response.render("productos", {
        login: true,
        name: request.session.name,
        products,
        categories,
        editingProduct: null,
        editingCategory: null,
      });
    } catch (error) {
      console.error(error);
      response.status(500).send("Error al cargar el catálogo");
    }
  });

  // READ: cargar producto para editar.
  router.get(
    "/tablas/productos/:id/edit",
    productsAccess,
    async (request, response) => {
      try {
        const [products, categories, selected] = await Promise.all([
          queryDatabase("SELECT * FROM tblproducto ORDER BY IdProducto DESC"),
          queryDatabase(
            "SELECT idCategoria, StrDescripcion, DtmFechaCreacion, StrUsuarioCreo FROM tblcategoria_prod ORDER BY StrDescripcion",
          ),
          queryDatabase("SELECT * FROM tblproducto WHERE IdProducto = ?", [
            request.params.id,
          ]),
        ]);
        if (!selected.length)
          return response.status(404).send("Producto no encontrado");
        response.render("productos", {
          login: true,
          name: request.session.name,
          products,
          categories,
          editingProduct: selected[0],
          editingCategory: null,
        });
      } catch (error) {
        console.error(error);
        response.status(500).send("Error al editar el producto");
      }
    },
  );

  // CREATE: insertar producto.
  router.post(
    "/tablas/productos",
    productsAccess,
    async (request, response) => {
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
      if (!String(StrNombre || "").trim() || !String(StrCodigo || "").trim())
        return response
          .status(400)
          .send("El nombre y el código son obligatorios");
      try {
        await queryDatabase(
          `INSERT INTO tblproducto (StrNombre, StrCodigo, NumPrecioCompra, NumPrecioVenta, idCategoria, StrDetalle, strFoto, NumStock, DtmFechaModifica, StrUsuarioModifico) VALUES (?, ?, ?, ?, N?, ?, ?, ?, OW(), ?)`,
          [
            StrNombre.trim(),
            StrCodigo.trim(),
            NumPrecioCompra || null,
            NumPrecioVenta || null,
            idCategoria || null,
            StrDetalle || null,
            strFoto || null,
            NumStock || 0,
            request.session.name,
          ],
        );
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo crear el producto");
      }
    },
  );

  // UPDATE: actualizar producto.
  router.post(
    "/tablas/productos/:id/update",
    productsAccess,
    async (request, response) => {
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
      if (!String(StrNombre || "").trim() || !String(StrCodigo || "").trim())
        return response
          .status(400)
          .send("El nombre y el código son obligatorios");
      try {
        const result = await queryDatabase(
          `UPDATE tblproducto SET StrNombre = ?, StrCodigo = ?, NumPrecioCompra = ?, NumPrecioVenta = ?, idCategoria = ?, StrDetalle = ?, strFoto = ?, NumStock = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE IdProducto = ?`,
          [
            StrNombre.trim(),
            StrCodigo.trim(),
            NumPrecioCompra || null,
            NumPrecioVenta || null,
            idCategoria || null,
            StrDetalle || null,
            strFoto || null,
            NumStock || 0,
            request.session.name,
            request.params.id,
          ],
        );
        if (!result.affectedRows)
          return response.status(404).send("Producto no encontrado");
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo actualizar el producto");
      }
    },
  );

  // DELETE: eliminar producto.
  router.post(
    "/tablas/productos/:id/delete",
    productsAccess,
    async (request, response) => {
      try {
        const result = await queryDatabase(
          "DELETE FROM tblproducto WHERE IdProducto = ?",
          [request.params.id],
        );
        if (!result.affectedRows)
          return response.status(404).send("Producto no encontrado");
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo eliminar el producto");
      }
    },
  );

  // =========================================
  // CRUD CATEGORÍAS
  // =========================================
  // READ: cargar categoría para editar.
  router.get(
    "/tablas/categorias/:id/edit",
    productsAccess,
    async (request, response) => {
      try {
        const [products, categories] = await loadCatalog();
        const selected = categories.find(
          (category) =>
            String(category.idCategoria) === String(request.params.id),
        );
        if (!selected)
          return response.status(404).send("Categoría no encontrada");
        response.render("productos", {
          login: true,
          name: request.session.name,
          products,
          categories,
          editingProduct: null,
          editingCategory: selected,
        });
      } catch (error) {
        console.error(error);
        response.status(500).send("Error al editar la categoría");
      }
    },
  );

  // CREATE: insertar categoría.
  router.post(
    "/tablas/categorias",
    productsAccess,
    async (request, response) => {
      const description = String(request.body.StrDescripcion || "").trim();
      if (!description)
        return response.status(400).send("La descripción es obligatoria");
      try {
        await queryDatabase(
          "INSERT INTO tblcategoria_prod (StrDescripcion, DtmFechaCreacion, StrUsuarioCreo, DtmFechaModifica, StrUsuarioModifico) VALUES (?, NOW(), ?, NOW(), ?)",
          [description, request.session.name, request.session.name],
        );
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo crear la categoría");
      }
    },
  );

  // UPDATE: actualizar categoría.
  router.post(
    "/tablas/categorias/:id/update",
    productsAccess,
    async (request, response) => {
      const description = String(request.body.StrDescripcion || "").trim();
      if (!description)
        return response.status(400).send("La descripción es obligatoria");
      try {
        await queryDatabase(
          "UPDATE tblcategoria_prod SET StrDescripcion = ?, DtmFechaModifica = NOW(), StrUsuarioModifico = ? WHERE idCategoria = ?",
          [description, request.session.name, request.params.id],
        );
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo actualizar la categoría");
      }
    },
  );

  // DELETE: eliminar categoría.
  router.post(
    "/tablas/categorias/:id/delete",
    productsAccess,
    async (request, response) => {
      try {
        await queryDatabase(
          "DELETE FROM tblcategoria_prod WHERE idCategoria = ?",
          [request.params.id],
        );
        response.redirect("/tablas/productos");
      } catch (error) {
        console.error(error);
        response.status(500).send("No se pudo eliminar la categoría");
      }
    },
  );

  return router;
};
