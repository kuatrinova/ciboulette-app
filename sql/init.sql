CREATE DATABASE IF NOT EXISTS ciboulette_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ciboulette_db;

CREATE TABLE IF NOT EXISTS ciclos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  semana INT NOT NULL,
  ano INT NOT NULL,
  fecha_inicio DATETIME NOT NULL,
  fecha_cierre DATETIME DEFAULT NULL,
  estado ENUM('abierto', 'cerrado') DEFAULT 'abierto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disponibilidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciclo_id INT NOT NULL,
  nombre_o_telefono VARCHAR(255) NOT NULL,
  viernes_comida BOOLEAN DEFAULT FALSE,
  viernes_cena BOOLEAN DEFAULT FALSE,
  sabado_comida BOOLEAN DEFAULT FALSE,
  sabado_cena BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ciclo_id) REFERENCES ciclos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT NOT NULL
);

-- Insertar configuracion inicial
INSERT INTO config (clave, valor) VALUES
  ('email_receptor', 'destino@email.com')
ON DUPLICATE KEY UPDATE valor = valor;

-- Tablas de asignacion de eventos
CREATE TABLE IF NOT EXISTS eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciclo_id INT NOT NULL,
  dia ENUM('viernes', 'sabado') NOT NULL,
  turno ENUM('comida', 'cena') NOT NULL,
  finca VARCHAR(255) NOT NULL,
  num_camareros INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ciclo_id) REFERENCES ciclos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asignaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evento_id INT NOT NULL,
  disponibilidad_id INT NOT NULL,
  estado ENUM('pendiente', 'aceptado', 'rechazado') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
  FOREIGN KEY (disponibilidad_id) REFERENCES disponibilidades(id) ON DELETE CASCADE,
  UNIQUE KEY unique_asignacion (evento_id, disponibilidad_id)
);

-- Crear primer ciclo abierto
INSERT INTO ciclos (semana, ano, fecha_inicio, estado)
VALUES (WEEK(NOW(), 1), YEAR(NOW()), NOW(), 'abierto');
