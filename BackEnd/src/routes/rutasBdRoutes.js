import express from 'express';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /api/rutas/guardar
 * Guarda la ruta planificada en SolicitudRuta y Ruta en la base de datos MySQL.
 * Almacena los datos reales del cálculo de cartografía marciana.
 */
router.post('/guardar', async (req, res) => {
  const {
    astronautaId = 1,
    equipoCientifico = 'Instrumentación general de navegación',
    objetivo = 'Mapeo y reconocimiento de terreno',
    origen,
    destino,
    coordenadas,
    distanciaTotal,
    duracion,
    peligro = 'medio'
  } = req.body;

  if (!origen || !destino || distanciaTotal === undefined) {
    return res.status(400).json({
      ok: false,
      error: 'Parámetros incompletos. Debe proporcionar origen, destino y distanciaTotal.'
    });
  }

  // Serializar coordenadas a formato string JSON si vienen como objeto/array
  const coordString = typeof coordenadas === 'string' ? coordenadas : JSON.stringify(coordenadas || []);

  try {
    // 1. Insertar la solicitud de la ruta
    const sqlSolicitud = `
      INSERT INTO SolicitudRuta (Astronauta_ID, EquipoCientifico, Objetivo)
      VALUES (?, ?, ?)
    `;
    const [solicitudResult] = await pool.query(sqlSolicitud, [
      Number(astronautaId) || 1,
      String(equipoCientifico),
      String(objetivo)
    ]);

    const solicitudRutaId = solicitudResult.insertId;

    // 2. Insertar los datos reales calculados de la ruta
    const sqlRuta = `
      INSERT INTO Ruta (
        SolicitudRuta_ID,
        Origen,
        Destino,
        Coordenadas,
        DistanciaTotal,
        Duracion,
        Peligro
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [rutaResult] = await pool.query(sqlRuta, [
      solicitudRutaId,
      String(origen),
      String(destino),
      coordString,
      Number(distanciaTotal),
      Number(duracion) || Math.round(Number(distanciaTotal) / 0.14),
      String(peligro)
    ]);

    return res.json({
      ok: true,
      mensaje: 'Ruta marciana guardada exitosamente en la base de datos MySQL',
      rutaId: rutaResult.insertId,
      solicitudRutaId,
      datos: {
        origen,
        destino,
        distanciaTotal: Number(distanciaTotal),
        peligro
      }
    });

  } catch (error) {
    console.warn('[MySQL] Error al guardar ruta en base de datos:', error.message);
    // Devolver confirmación informativa sin quebrar el flujo de trabajo
    return res.status(500).json({
      ok: false,
      error: 'Error al persistir en base de datos: ' + error.message,
      modo: 'offline'
    });
  }
});

/**
 * GET /api/rutas/historial
 * Devuelve el historial de rutas almacenadas en MySQL
 */
router.get('/historial', async (req, res) => {
  try {
    const sql = `
      SELECT 
        r.RutaID,
        r.Origen,
        r.Destino,
        r.DistanciaTotal,
        r.Duracion,
        r.Peligro,
        r.FechaCreacion,
        sr.EquipoCientifico,
        sr.Objetivo,
        a.Nombre AS AstronautaNombre,
        a.Identificador AS AstronautaIdentificador
      FROM Ruta r
      INNER JOIN SolicitudRuta sr ON r.SolicitudRuta_ID = sr.SolicitudRuta_ID
      INNER JOIN Astronauta a ON sr.Astronauta_ID = a.Astronauta_ID
      ORDER BY r.RutaID DESC
      LIMIT 20
    `;

    const [rows] = await pool.query(sql);
    return res.json({ ok: true, data: rows });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener el historial: ' + error.message
    });
  }
});

export default router;
