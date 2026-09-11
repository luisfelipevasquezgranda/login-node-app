function requireLogin(request, response, next) {
  if (!request.session.loggedin) return response.redirect("/login");
  next();
}

function requireAccess(permission) {
  return async (request, response, next) => {
    if (!request.session.loggedin) return response.redirect("/login");

    try {
      const users = await request.queryDatabase(
        "SELECT CanAccessProducts, CanAccessSecurity FROM users WHERE id = ? LIMIT 1",
        [request.session.userId],
      );
      if (!users.length) {
        request.session.destroy(() => response.redirect("/login"));
        return;
      }

      request.session.canAccessProducts = Boolean(users[0].CanAccessProducts);
      request.session.canAccessSecurity = Boolean(users[0].CanAccessSecurity);
      if (!request.session[permission]) {
        return response.status(403).send("No tienes permiso para acceder a este módulo");
      }
      next();
    } catch (error) {
      console.error(error);
      response.status(500).send("No se pudieron comprobar los permisos");
    }
  };
}

module.exports = { requireLogin, requireAccess };
