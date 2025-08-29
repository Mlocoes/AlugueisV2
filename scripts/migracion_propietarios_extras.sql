-- Migración para agregar campos extra a la tabla propietarios
ALTER TABLE propietarios
    ADD COLUMN apellido VARCHAR(255),
    ADD COLUMN documento VARCHAR(100),
    ADD COLUMN tipo_documento VARCHAR(50),
    ADD COLUMN direccion VARCHAR(500),
    ADD COLUMN banco VARCHAR(100),
    ADD COLUMN agencia VARCHAR(100),
    ADD COLUMN cuenta VARCHAR(100),
    ADD COLUMN tipo_cuenta VARCHAR(50);
