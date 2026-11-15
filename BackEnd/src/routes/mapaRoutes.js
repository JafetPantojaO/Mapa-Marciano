// Rutas de API para Cartografia Marciana, Geodesia y Planificacion de Rutas
import express from 'express';
import {
  CAPAS_MARTE,
  PUNTOS_MARTE,
  OPCIONES_EQUIPO_CIENTIFICO,
  OPCIONES_OBJETIVO_MISION
} from '../constants/marsConstants.js';
import {
  calcularDistanciaMarciana,
  calcularRumbo,
  formatearCoordenadas,
  resolverPuntoCercano
} from '../services/marsGeodesyService.js';
import {
  generarListaRutas,
  planificarRutaSimple
} from '../services/roverPathfindingService.js';
import { muestrearDatosEspectralesRover } from '../services/marsSpectralService.js';

const router = express.Router();

/**
 * GET /api/mapa/capas
 * Devuelve las capas cartograficas WMTS oficiales de NASA Trek
 */
router.get('/capas', (req, res) => {
  res.json({
    status: 'success',
    count: CAPAS_MARTE.length,
    data: CAPAS_MARTE
  });
});

/**
 * GET /api/mapa/lugares
 * Devuelve los 25 puntos y regiones cartografiadas de Marte con datos ambientales
 */
router.get('/lugares', (req, res) => {
  res.json({
    status: 'success',
    count: PUNTOS_MARTE.length,
    data: PUNTOS_MARTE
  });
});

/**
 * GET /api/mapa/misiones-config
 * Devuelve las opciones oficiales de equipamiento cientifico y objetivos de mision
 */
router.get('/misiones-config', (req, res) => {
  res.json({
    status: 'success',
    equipos: OPCIONES_EQUIPO_CIENTIFICO,
    objetivos: OPCIONES_OBJETIVO_MISION
  });
});

/**
 * POST /api/mapa/calcular-distancia
 * Recibe { lat1, lon1, lat2, lon2 } y calcula distancia ortodromica y azimut
 */
router.post('/calcular-distancia', (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.body;

  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Debe proporcionar lat1, lon1, lat2 y lon2.'
    });
  }

  const l1 = Number(lat1);
  const ln1 = Number(lon1);
  const l2 = Number(lat2);
  const ln2 = Number(lon2);

  const distanciaKm = calcularDistanciaMarciana(l1, ln1, l2, ln2);
  const rumboGrados = calcularRumbo(l1, ln1, l2, ln2);

  res.json({
    status: 'success',
    distanciaKm,
    rumboGrados,
    origenCoords: formatearCoordenadas(l1, ln1),
    destinoCoords: formatearCoordenadas(l2, ln2)
  });
});

/**
 * POST /api/mapa/planificar-rutas
 * Recibe { origenId, destinoId, perfilCarga, tieneEquipo, equiposSeleccionados }
 * Ejecuta el calculo exhaustivo de rutas y devuelve todas las rutas disponibles
 * ordenadas desde la mas factible y rapida hasta la mas ineficiente y lenta.
 */
router.post('/planificar-rutas', (req, res) => {
  const {
    origenId,
    destinoId,
    perfilCarga = 'normal',
    tieneEquipo = false,
    equiposSeleccionados = []
  } = req.body;

  if (origenId === undefined || destinoId === undefined) {
    return res.status(400).json({
      ok: false,
      message: 'Debe especificar origenId y destinoId.'
    });
  }

  const resultado = generarListaRutas(
    origenId,
    destinoId,
    perfilCarga,
    Boolean(tieneEquipo),
    equiposSeleccionados
  );

  if (!resultado.ok) {
    return res.status(400).json(resultado);
  }

  res.json(resultado);
});

/**
 * POST /api/mapa/planificar
 * Planificación simple con salida GeoJSON
 */
router.post('/planificar', (req, res) => {
  const { origenId, destinoId, tipoCarga = 'ninguna' } = req.body;

  if (origenId === undefined || destinoId === undefined) {
    return res.status(400).json({
      ok: false,
      message: 'Debe especificar origenId y destinoId.'
    });
  }

  const resultado = planificarRutaSimple(origenId, destinoId, tipoCarga);
  if (!resultado.ok) {
    return res.status(400).json(resultado);
  }

  res.json(resultado);
});

/**
 * POST /api/mapa/resolver-punto
 * Devuelve el punto de la red mas cercano a las coordenadas enviadas
 */
router.post('/resolver-punto', (req, res) => {
  const { punto } = req.body;
  const resPunto = resolverPuntoCercano(punto);
  res.json({
    status: 'success',
    punto: resPunto
  });
});

/**
 * POST /api/mapa/muestrear-espectral
 * Muestrea las capas reales de NASA Trek en las coordenadas exactas del rover.
 * REGLA CRÍTICA: Prohibido inventar o simular. Se muestrean las capas satelitales reales.
 */
router.post('/muestrear-espectral', async (req, res) => {
  try {
    const { lat, lon, tramoActual = 1, totalTramos = 1, waypointCercano = 'Ubicación Rover' } = req.body;
    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Debe proporcionar lat y lon para el muestreo espectral.'
      });
    }

    const resultado = await muestrearDatosEspectralesRover({
      lat: Number(lat),
      lon: Number(lon),
      tramoActual: Number(tramoActual),
      totalTramos: Number(totalTramos),
      waypointCercano
    });

    res.json(resultado);
  } catch (err) {
    console.error('Error en muestreo espectral:', err);
    res.status(500).json({
      status: 'error',
      mensaje: 'Fallo al muestrear capas satelitales reales.'
    });
  }
});

/**
 * GET /api/mapa/muestrear-espectral
 * Soporte de consulta GET con parámetros de query
 */
router.get('/muestrear-espectral', async (req, res) => {
  try {
    const { lat, lon, tramoActual = 1, totalTramos = 1, waypointCercano = 'Ubicación Rover' } = req.query;
    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Debe proporcionar lat y lon en query params.'
      });
    }

    const resultado = await muestrearDatosEspectralesRover({
      lat: Number(lat),
      lon: Number(lon),
      tramoActual: Number(tramoActual),
      totalTramos: Number(totalTramos),
      waypointCercano
    });

    res.json(resultado);
  } catch (err) {
    console.error('Error en muestreo espectral:', err);
    res.status(500).json({
      status: 'error',
      mensaje: 'Fallo al muestrear capas satelitales reales.'
    });
  }
});

export default router;
