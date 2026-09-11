USE login_node_curso;

ALTER TABLE tblcategoria_prod
  ADD COLUMN IF NOT EXISTS DtmFechaCreacion DATETIME NULL AFTER StrDescripcion,
  ADD COLUMN IF NOT EXISTS StrUsuarioCreo VARCHAR(40) NULL AFTER DtmFechaCreacion;
