-- ========================================================
-- Script de Inicialización Automática: Base de Datos Mapa Marciano
-- Motor: MySQL 8.0
-- Mapeado a: /docker-entrypoint-initdb.d/init.sql
-- ========================================================

-- Crear base de datos si no existe con codificación UTF-8 Multibyte
CREATE DATABASE IF NOT EXISTS `mapa_marciano`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mapa_marciano`;

-- --------------------------------------------------------
-- 1. Tabla: astronautas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `astronautas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo_astronauta` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `rango` VARCHAR(50) NOT NULL DEFAULT 'Especialista de Misión',
  `especialidad` VARCHAR(100) DEFAULT 'Cartografía y Telemetría',
  `estado` ENUM('activo', 'en_mision', 'descanso', 'inactivo') NOT NULL DEFAULT 'activo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabla: rutas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rutas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `origen_id` INT NOT NULL,
  `origen_nombre` VARCHAR(100) NOT NULL,
  `destino_id` INT NOT NULL,
  `destino_nombre` VARCHAR(100) NOT NULL,
  `distancia_km` DECIMAL(10, 2) NOT NULL,
  `nivel_riesgo` ENUM('bajo', 'medio', 'alto', 'critico') NOT NULL DEFAULT 'medio',
  `perfil_carga` ENUM('ninguna', 'normal', 'delicada') NOT NULL DEFAULT 'normal',
  `tiempo_estimado_horas` DECIMAL(8, 2) DEFAULT NULL,
  `waypoints` JSON DEFAULT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabla intermedia: astronauta_rutas (Muchos a Muchos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `astronauta_rutas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `astronauta_id` INT NOT NULL,
  `ruta_id` INT NOT NULL,
  `rol_mision` VARCHAR(100) NOT NULL DEFAULT 'Operador de Rover',
  `fecha_asignacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `estado_mision` ENUM('planificada', 'en_curso', 'completada', 'cancelada') NOT NULL DEFAULT 'planificada',
  `observaciones` TEXT DEFAULT NULL,
  CONSTRAINT `fk_astronauta_rutas_astronauta`
    FOREIGN KEY (`astronauta_id`) REFERENCES `astronautas` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_astronauta_rutas_ruta`
    FOREIGN KEY (`ruta_id`) REFERENCES `rutas` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `uq_astronauta_ruta` UNIQUE (`astronauta_id`, `ruta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Índices para optimización de consultas
-- --------------------------------------------------------
CREATE INDEX `idx_rutas_origen_destino` ON `rutas` (`origen_id`, `destino_id`);
CREATE INDEX `idx_astronauta_rutas_mision` ON `astronauta_rutas` (`estado_mision`);

-- --------------------------------------------------------
-- Datos Semilla (Seed Data) Iniciales Opcionales
-- --------------------------------------------------------
INSERT INTO `astronautas` (`codigo_astronauta`, `nombre`, `email`, `password`, `rango`, `especialidad`, `estado`) VALUES
('ASTRO-01', 'Elena Ramos', 'elena.ramos@ares.nasa.gov', 'Ares2026Pass!', 'Comandante de Misión', 'Geodesia y Navegación', 'activo'),
('ASTRO-02', 'Mark Watney', 'mark.watney@ares.nasa.gov', 'BotanistMars42!', 'Especialista Científico', 'Botánica y Geología', 'activo'),
('ASTRO-03', 'Carlos Herrera', 'carlos.herrera@ares.nasa.gov', 'RoverPilot33!', 'Piloto de Rover', 'Teleoperación Robótica', 'en_mision')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `rutas` (`nombre`, `origen_id`, `origen_nombre`, `destino_id`, `destino_nombre`, `distancia_km`, `nivel_riesgo`, `perfil_carga`, `tiempo_estimado_horas`, `waypoints`, `descripcion`) VALUES
('Travesía Meridiani - Elysium', 15, 'Terra Meridiani', 23, 'Elysium Planitia', 4120.50, 'medio', 'delicada', 164.80, '[{"punto": "Terra Meridiani", "lat": 0.2, "lon": -2.5}, {"punto": "Arabia Terra", "lat": 21.0, "lon": 5.0}, {"punto": "Elysium Planitia", "lat": 3.0, "lon": 154.7}]', 'Ruta principal de transporte de muestras geoquímicas y espectrometría.'),
('Expedición Valles Marineris Explorador', 8, 'Valles Marineris', 7, 'Tharsis Volcanic Region', 2150.30, 'alto', 'normal', 95.50, '[{"punto": "Valles Marineris", "lat": -14.0, "lon": -59.0}, {"punto": "Claritas Fossae", "lat": -30.0, "lon": -104.0}, {"punto": "Tharsis Volcanic Region", "lat": 1.0, "lon": -112.0}]', 'Ruta geológica a través de cañones profundos y laderas escarpadas.'),
('Corredor Polar Utopia - Borealis', 5, 'Utopia Planitia', 1, 'Vastitas Borealis', 1480.00, 'bajo', 'delicada', 62.00, '[{"punto": "Utopia Planitia", "lat": 47.0, "lon": 118.0}, {"punto": "Vastitas Borealis", "lat": 70.0, "lon": 100.0}]', 'Ruta criogénica para recolección de hielo subterráneo.')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `astronauta_rutas` (`astronauta_id`, `ruta_id`, `rol_mision`, `estado_mision`, `observaciones`) VALUES
(1, 1, 'Supervisora de Cartografía', 'planificada', 'Monitoreo de telemetría y sensores espectrales.'),
(3, 1, 'Piloto Principal de Rover', 'en_curso', 'En camino al segundo waypoint en Arabia Terra.'),
(2, 2, 'Especialista en Muestreo', 'planificada', 'Extracción de testigos de roca basáltica en Tharsis.')
ON DUPLICATE KEY UPDATE `rol_mision` = VALUES(`rol_mision`);
