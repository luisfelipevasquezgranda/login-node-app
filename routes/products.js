const express = require("express");
const { requireLogin, requireAccess } = require("../middleware/auth");
const productsModel = require("../models/products");
const categoriesModel = require("../models/categories");
const router = express.Router();

const productsAccess = requireAccess("canAccessProducts");

const loadCatalog = () =>
  Promise.all([
    productsModel.listProducts(),
    categoriesModel.listCategories(),
  ]);

router.get("/tablas", requireLogin, (request, response) =>
  response.render("tablas", { login: true, name: request.session.name }),
);

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

router.get(
  "/tablas/productos/:id/edit",
  productsAccess,
  async (request, response) => {
    try {
      const [products, categories, selected] = await Promise.all([
        productsModel.listProducts(),
        categoriesModel.listCategories(),
        productsModel.findProductById(request.params.id),
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
      await productsModel.createProduct(
        {
          StrNombre: StrNombre.trim(),
          StrCodigo: StrCodigo.trim(),
          NumPrecioCompra,
          NumPrecioVenta,
          idCategoria,
          StrDetalle,
          strFoto,
          NumStock,
        },
        request.session.name || "Sistema",
      );
      response.redirect("/tablas/productos");
    } catch (error) {
      console.error("Error al insertar producto:", error);
      response.status(500).send("No se pudo crear el producto");
    }
  },
);

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
      const result = await productsModel.updateProduct(
        request.params.id,
        {
          StrNombre: StrNombre.trim(),
          StrCodigo: StrCodigo.trim(),
          NumPrecioCompra,
          NumPrecioVenta,
          idCategoria,
          StrDetalle,
          strFoto,
          NumStock,
        },
        request.session.name,
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

router.post(
  "/tablas/productos/:id/delete",
  productsAccess,
  async (request, response) => {
    try {
      const result = await productsModel.deleteProduct(request.params.id);
      if (!result.affectedRows)
        return response.status(404).send("Producto no encontrado");
      response.redirect("/tablas/productos");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo eliminar el producto");
    }
  },
);

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

router.post(
  "/tablas/categorias",
  productsAccess,
  async (request, response) => {
    const description = String(request.body.StrDescripcion || "").trim();
    if (!description)
      return response.status(400).send("La descripción es obligatoria");
    try {
      await categoriesModel.createCategory(
        description,
        request.session.name,
      );
      response.redirect("/tablas/productos");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo crear la categoría");
    }
  },
);

router.post(
  "/tablas/categorias/:id/update",
  productsAccess,
  async (request, response) => {
    const description = String(request.body.StrDescripcion || "").trim();
    if (!description)
      return response.status(400).send("La descripción es obligatoria");
    try {
      await categoriesModel.updateCategory(
        request.params.id,
        description,
        request.session.name,
      );
      response.redirect("/tablas/productos");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo actualizar la categoría");
    }
  },
);

router.post(
  "/tablas/categorias/:id/delete",
  productsAccess,
  async (request, response) => {
    try {
      await categoriesModel.deleteCategory(request.params.id);
      response.redirect("/tablas/productos");
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudo eliminar la categoría");
    }
  },
);

module.exports = router;
