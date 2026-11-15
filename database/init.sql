-- ========================================================
-- Script de Inicialización: Base de Datos Centro de Control Marte
-- Motor: MySQL 8.0
-- Mapeado a: /docker-entrypoint-initdb.d/init.sql
-- ========================================================

CREATE DATABASE IF NOT EXISTS `mapa_marciano`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mapa_marciano`;

-- --------------------------------------------------------
-- 1. Tabla: Astronauta
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Astronauta` (
  `Astronauta_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Nombre` VARCHAR(100) NOT NULL,
  `Identificador` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabla: Cuenta
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Cuenta` (
  `CUENTA_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Astronauta_ID` INT NOT NULL,
  `Usuario` VARCHAR(50) NOT NULL UNIQUE,
  `PasswordHash` VARCHAR(255) NOT NULL,
  CONSTRAINT `fk_cuenta_astronauta`
    FOREIGN KEY (`Astronauta_ID`) REFERENCES `Astronauta` (`Astronauta_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabla: InicioSesion
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `InicioSesion` (
  `Login_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `CUENTA_ID` INT NOT NULL,
  `FechaHora` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_iniciosesion_cuenta`
    FOREIGN KEY (`CUENTA_ID`) REFERENCES `Cuenta` (`CUENTA_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Tabla: DatosEspectrales
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DatosEspectrales` (
  `BarraEspectral` INT AUTO_INCREMENT PRIMARY KEY,
  `Termico` DECIMAL(8, 2) NOT NULL,
  `Opticos` DECIMAL(8, 2) NOT NULL,
  `Radiacion` DECIMAL(8, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Tabla: Mapa
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Mapa` (
  `Mapa_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Coordenadas` VARCHAR(120) NOT NULL,
  `Posicion` VARCHAR(100) NOT NULL,
  `Brujula` DECIMAL(6, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Tabla: HUD
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `HUD` (
  `HUD_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `BarraEspectral` INT NOT NULL,
  `Mapa_ID` INT NOT NULL,
  `TiempoAtmosferico` VARCHAR(150) NOT NULL,
  CONSTRAINT `fk_hud_datosespectrales`
    FOREIGN KEY (`BarraEspectral`) REFERENCES `DatosEspectrales` (`BarraEspectral`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hud_mapa`
    FOREIGN KEY (`Mapa_ID`) REFERENCES `Mapa` (`Mapa_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Tabla: StatusAstronauta
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `StatusAstronauta` (
  `UniqueID` INT AUTO_INCREMENT PRIMARY KEY,
  `Astronauta_ID` INT NOT NULL,
  `TemperaturaCorporal` DECIMAL(4, 1) NOT NULL,
  `Oxigeno` DECIMAL(5, 2) NOT NULL,
  `Radiacion` DECIMAL(6, 2) NOT NULL,
  `Comunicacion` VARCHAR(100) NOT NULL,
  CONSTRAINT `fk_status_astronauta`
    FOREIGN KEY (`Astronauta_ID`) REFERENCES `Astronauta` (`Astronauta_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Tabla: Rover
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Rover` (
  `Rover_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Energia` DECIMAL(5, 2) NOT NULL,
  `Tamaño` VARCHAR(50) NOT NULL,
  `Peso` DECIMAL(7, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Tabla: StatusRover
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `StatusRover` (
  `Status_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Rover_ID` INT NOT NULL,
  `Capacidad` VARCHAR(100) NOT NULL,
  `Sensores` TEXT NOT NULL,
  `Disponibilidad` VARCHAR(50) NOT NULL,
  `Ruedas` VARCHAR(100) NOT NULL,
  `Comunicacion` VARCHAR(100) NOT NULL,
  `Brazo` VARCHAR(100) NOT NULL,
  CONSTRAINT `fk_status_rover`
    FOREIGN KEY (`Rover_ID`) REFERENCES `Rover` (`Rover_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Tabla: SolicitudRuta
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `SolicitudRuta` (
  `SolicitudRuta_ID` INT AUTO_INCREMENT PRIMARY KEY,
  `Astronauta_ID` INT NOT NULL,
  `EquipoCientifico` TEXT NOT NULL,
  `Objetivo` VARCHAR(255) NOT NULL,
  `FechaSolicitud` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_solicitud_astronauta`
    FOREIGN KEY (`Astronauta_ID`) REFERENCES `Astronauta` (`Astronauta_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Tabla: Ruta
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Ruta` (
  `RutaID` INT AUTO_INCREMENT PRIMARY KEY,
  `SolicitudRuta_ID` INT NOT NULL,
  `Origen` VARCHAR(100) NOT NULL,
  `Destino` VARCHAR(100) NOT NULL,
  `Coordenadas` LONGTEXT NOT NULL,
  `DistanciaTotal` DECIMAL(10, 2) NOT NULL,
  `Duracion` DECIMAL(8, 2) NOT NULL,
  `Peligro` VARCHAR(50) NOT NULL,
  `FechaCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ruta_solicitud`
    FOREIGN KEY (`SolicitudRuta_ID`) REFERENCES `SolicitudRuta` (`SolicitudRuta_ID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Índices para optimización
-- --------------------------------------------------------
CREATE INDEX `idx_cuenta_usuario` ON `Cuenta` (`Usuario`);
CREATE INDEX `idx_ruta_origen_destino` ON `Ruta` (`Origen`, `Destino`);
CREATE INDEX `idx_mapa_posicion` ON `Mapa` (`Posicion`);

-- ========================================================
-- DATOS SEMILLA (SEED DATA)
-- ========================================================

-- 1. Astronautas inventados
INSERT INTO `Astronauta` (`Astronauta_ID`, `Nombre`, `Identificador`) VALUES
(1, 'Elena Ramos', 'ASTRO-01'),
(2, 'Mark Watney', 'ASTRO-02'),
(3, 'Carlos Herrera', 'ASTRO-03')
ON DUPLICATE KEY UPDATE `Nombre` = VALUES(`Nombre`);

-- 2. Cuentas para autenticación
INSERT INTO `Cuenta` (`CUENTA_ID`, `Astronauta_ID`, `Usuario`, `PasswordHash`) VALUES
(1, 1, 'eramos', 'Ares2026Pass!'),
(2, 2, 'mwatney', 'BotanistMars42!'),
(3, 3, 'cherrera', 'RoverPilot33!')
ON DUPLICATE KEY UPDATE `PasswordHash` = VALUES(`PasswordHash`);

-- 3. Estado fisiológico de los astronautas
INSERT INTO `StatusAstronauta` (`UniqueID`, `Astronauta_ID`, `TemperaturaCorporal`, `Oxigeno`, `Radiacion`, `Comunicacion`) VALUES
(1, 1, 36.6, 98.5, 0.11, 'Enlace Nominal DSN Goldstone'),
(2, 2, 36.8, 97.9, 0.14, 'Enlace Nominal DSN Madrid'),
(3, 3, 36.5, 99.1, 0.09, 'Enlace Nominal DSN Canberra')
ON DUPLICATE KEY UPDATE `TemperaturaCorporal` = VALUES(`TemperaturaCorporal`);

-- 4. Rover y Estado del Rover
INSERT INTO `Rover` (`Rover_ID`, `Energia`, `Tamaño`, `Peso`) VALUES
(1, 98.40, '3.0m x 2.7m x 2.2m', 1025.00)
ON DUPLICATE KEY UPDATE `Energia` = VALUES(`Energia`);

INSERT INTO `StatusRover` (`Status_ID`, `Rover_ID`, `Capacidad`, `Sensores`, `Disponibilidad`, `Ruedas`, `Comunicacion`, `Brazo`) VALUES
(1, 1, 'Carga útil científica 150 kg', 'Espectrómetro APXS, MOLA Altimeter, ChemCam, Radiómetro TES', 'Operativo', '6 ruedas de tracción directa', 'UHF Relay MRO 250 kbps', 'Brazo robótico 5-DOF percutor')
ON DUPLICATE KEY UPDATE `Disponibilidad` = VALUES(`Disponibilidad`);

-- 5. Datos Espectrales reales (calibración MOLA/TES de Marte)
INSERT INTO `DatosEspectrales` (`BarraEspectral`, `Termico`, `Opticos`, `Radiacion`) VALUES
(1, 360.00, 0.18, 0.85),
(2, 480.00, 0.22, 1.40),
(3, 290.00, 0.31, 2.10)
ON DUPLICATE KEY UPDATE `Termico` = VALUES(`Termico`);

-- 6. Puntos y regiones reales de Marte en la tabla Mapa
INSERT INTO `Mapa` (`Mapa_ID`, `Coordenadas`, `Posicion`, `Brujula`) VALUES
(1, 'lat: 70.0, lon: 100.0', 'Vastitas Borealis', 12.00),
(2, 'lat: 50.0, lon: -100.0', 'Tantalus Fossae', 185.30),
(3, 'lat: 40.0, lon: -70.0', 'Tempe Fossae', 142.10),
(4, 'lat: 49.0, lon: -22.0', 'Acidalia Planitia', 28.40),
(5, 'lat: 47.0, lon: 118.0', 'Utopia Planitia', 44.60),
(6, 'lat: 25.0, lon: -164.0', 'Amazonis Planitia', 210.50),
(7, 'lat: 1.0, lon: -112.0', 'Tharsis Volcanic Region', 265.00),
(8, 'lat: -14.0, lon: -59.0', 'Valles Marineris', 245.10),
(9, 'lat: -30.0, lon: -104.0', 'Claritas Fossae', 220.80),
(10, 'lat: -40.0, lon: -150.0', 'Terra Sirenum', 235.00),
(11, 'lat: -50.0, lon: -130.0', 'Icaria Fossae', 215.40),
(12, 'lat: -58.0, lon: -95.0', 'Aonia Terra', 195.20),
(13, 'lat: 21.0, lon: 5.0', 'Arabia Terra', 22.00),
(14, 'lat: -5.0, lon: -25.0', 'Margaritifer Terra', 255.80),
(15, 'lat: -3.0, lon: 0.0', 'Terra Meridiani', 0.00),
(16, 'lat: -45.0, lon: -5.0', 'Noachis Terra', 180.50),
(17, 'lat: -42.0, lon: 70.0', 'Hellas Planitia', 125.70),
(18, 'lat: -10.0, lon: 160.0', 'Terra Cimmeria', 98.40),
(19, 'lat: -15.0, lon: 115.0', 'Terra Tyrrhena', 108.60),
(20, 'lat: 10.0, lon: 75.0', 'Syrtis Major', 65.20),
(21, 'lat: 15.0, lon: 50.0', 'Isidis Planitia', 55.00),
(22, 'lat: 18.65, lon: -133.8', 'Olympus Mons', 310.20),
(23, 'lat: 3.0, lon: 154.7', 'Elysium Planitia', 78.40),
(24, 'lat: 18.4, lon: 77.5', 'Jezero Crater', 60.10),
(25, 'lat: -4.6, lon: 137.4', 'Gale Crater', 92.30)
ON DUPLICATE KEY UPDATE `Posicion` = VALUES(`Posicion`);

-- 7. HUD telemetry entries
INSERT INTO `HUD` (`HUD_ID`, `BarraEspectral`, `Mapa_ID`, `TiempoAtmosferico`) VALUES
(1, 1, 15, 'Ecuatorial despejado, -55°C, Viento 9.5 m/s, Opacidad 0.7 tau'),
(2, 2, 23, 'Llanura volcánica, -62°C, Viento 12.0 m/s, Opacidad 1.1 tau'),
(3, 3, 8, 'Taludes profundos, -48°C, Viento 26.0 m/s, Opacidad 2.1 tau')
ON DUPLICATE KEY UPDATE `TiempoAtmosferico` = VALUES(`TiempoAtmosferico`);

-- 8. Solicitud y Ruta inicial de prueba con coordenadas reales
INSERT INTO `SolicitudRuta` (`SolicitudRuta_ID`, `Astronauta_ID`, `EquipoCientifico`, `Objetivo`) VALUES
(1, 1, 'Espectrómetro Raman, Sensor Térmico TES, Cámara LIDAR', 'Cartografía y muestreo de hematita esferular')
ON DUPLICATE KEY UPDATE `Objetivo` = VALUES(`Objetivo`);

INSERT INTO `Ruta` (`RutaID`, `SolicitudRuta_ID`, `Origen`, `Destino`, `Coordenadas`, `DistanciaTotal`, `Duracion`, `Peligro`) VALUES
(1, 1, 'Terra Meridiani', 'Elysium Planitia', '[{"nombre":"Terra Meridiani","lat":-3.0,"lon":0.0},{"nombre":"Arabia Terra","lat":21.0,"lon":5.0},{"nombre":"Isidis Planitia","lat":15.0,"lon":50.0},{"nombre":"Elysium Planitia","lat":3.0,"lon":154.7}]', 4121.00, 29435.71, 'bajo')
ON DUPLICATE KEY UPDATE `Origen` = VALUES(`Origen`);
