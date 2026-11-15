// Motor de navegacion y calculo de rutas para el rover marciano (Exploración Exhaustiva Multicriterio)
import { RADIO_MARTE_KM, PUNTOS_MARTE } from '../constants/marsConstants.js';
import { calcularDistanciaMarciana } from './marsGeodesyService.js';

// Parametros tecnicos del rover marciano y perfiles de carga
export const PERFILES_INSTRUMENTOS = {
  'Espectrometro Laser LIBS (analisis quimico de rocas)': {
    lim: { polvo: 1.3, pend: 14 },
    pesos: { sup: 4.5, clima: 5.0, term: 2.0 },
    penalizacionPolvo: 2.8,
    mapaSugerido: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw'
  },
  'Radar de Penetracion Subterranea RIMFAX (deteccion de hielo)': {
    lim: { pend: 8.5 },
    pesos: { sup: 7.0, clima: 1.5, term: 2.5 },
    penalizacionPendiente: 3.5,
    mapaSugerido: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw'
  },
  'Taladro de perforacion y toma de muestras de suelo': {
    lim: { pend: 7.0, viento: 16.0 },
    pesos: { sup: 8.0, clima: 3.0, term: 1.5 },
    penalizacionPendiente: 4.0,
    mapaSugerido: 'Mars_Viking_MDIM21_ClrMosaic_global_232m'
  },
  'Estacion meteorologica y medicion de radiacion MEDA': {
    lim: { viento: 15.0, polvo: 1.2 },
    pesos: { sup: 2.0, clima: 7.5, term: 3.0 },
    penalizacionViento: 3.2,
    penalizacionPolvo: 2.5,
    mapaSugerido: 'TES_Dust'
  },
  'Camara multiespectral Mastcam-Z de alta resolucion': {
    lim: { polvo: 1.0, viento: 18.0 },
    pesos: { sup: 3.0, clima: 6.5, term: 2.0 },
    penalizacionPolvo: 3.5,
    mapaSugerido: 'TES_Dust'
  },
  'Detector de biofirmas y compuestos organicos SHERLOC': {
    lim: { tmin: -30, tmax: 20, polvo: 1.4 },
    pesos: { sup: 3.5, clima: 2.5, term: 7.0 },
    penalizacionTermica: 3.8,
    mapaSugerido: 'TES_Thermal_Inertia'
  }
};

const CONFIG_ROVER = {
  rover: { pend: 25, viento: 30, polvo: 3, tmin: -125, tmax: 35 },
  pesos: { sup: 3, clima: 2, term: 2.5 },
  perfiles: {
    ninguna: { nombre: 'Sin carga especial', lim: {}, pesos: {}, umbral: 0.7 },
    normal: { nombre: 'Carga normal', lim: { pend: 20 }, pesos: {}, umbral: 0.7 },
    delicada: {
      nombre: 'Instrumentos delicados',
      lim: { pend: 14, viento: 20, polvo: 1.8, tmin: -105, tmax: 30 },
      pesos: { sup: 5, clima: 2, term: 3 },
      umbral: 0.5
    }
  },
  desconocido: 0.5,
  kVecinos: 5, // Conectividad topologica equilibrada para exploracion exhaustiva de caminos
  velocidadRoverKmH: 0.14 // Velocidad promedio de avance del rover en superficie marciana
};

// Convierte los datos ambientales de un punto a factor de riesgo 0..1
export function evaluarRiesgoPunto(p, L = CONFIG_ROVER.rover, W = CONFIG_ROVER.pesos) {
  const r = (v, m) => (v == null ? null : Math.max(0, v / m));
  const cl = [r(p.viento_ms, L.viento), r(p.opacidad_polvo, L.polvo)].filter((v) => v != null);
  let term = null;
  if (p.temp_min_c != null && p.temp_max_c != null) {
    const c = (L.tmin + L.tmax) / 2;
    const m = (L.tmax - L.tmin) / 2;
    term = Math.max(Math.abs(p.temp_min_c - c), Math.abs(p.temp_max_c - c)) / m;
  }
  const crudo = {
    sup: r(p.pendiente_grados, L.pend),
    clima: cl.length ? Math.max(...cl) : null,
    term
  };
  const falt = Object.keys(crudo).filter((k) => crudo[k] == null);
  const bloq = Object.values(crudo).some((v) => v != null && v > 1);

  let suma = 0;
  let pw = 0;
  for (const k in crudo) {
    suma += W[k] * (crudo[k] == null ? CONFIG_ROVER.desconocido : Math.min(1, crudo[k]));
    pw += W[k];
  }
  return { riesgo: pw > 0 ? suma / pw : 0.5, bloq, falt };
}

/**
 * Construye el grafo de conectividad espacial entre los puntos cartografiados de Marte.
 * Conecta cada punto con sus k vecinos mas cercanos segun la distancia ortodromica marciana.
 */
export function construirGrafoBacktracking(puntos = PUNTOS_MARTE, kVecinos = CONFIG_ROVER.kVecinos) {
  const g = new Map();
  puntos.forEach((p) => g.set(p.id, []));

  const pares = [];
  puntos.forEach((p) => {
    puntos
      .filter((q) => q.id !== p.id)
      .map((q) => [calcularDistanciaMarciana(p.lat, p.lon, q.lat, q.lon), q.id])
      .sort((a, b) => a[0] - b[0])
      .slice(0, kVecinos)
      .forEach(([, j]) => pares.push([p.id, j]));
  });

  const vistos = new Set();
  pares.forEach(([a, b]) => {
    const key = [a, b].sort().join('|');
    if (vistos.has(key)) return;
    vistos.add(key);

    const pa = puntos.find((p) => p.id === a);
    const pb = puntos.find((p) => p.id === b);
    if (!pa || !pb) return;

    const d = calcularDistanciaMarciana(pa.lat, pa.lon, pb.lat, pb.lon);
    g.get(a).push({ to: b, dist: d });
    g.get(b).push({ to: a, dist: d });
  });

  return g;
}

/**
 * ALGORITMO BACKTRACKING (Recursivo con poda de ciclos y limite de saltos):
 * Explora el espacio de estados para encontrar todos los caminos simples entre origen y destino.
 * Deshace cada decision (backtracking) para explorar exhaustivamente todas las rutas disponibles.
 */
export function buscarTodasLasRutasBacktracking(grafo, origenId, destinoId, maxSaltos = 5, limiteMax = 80) {
  const rutasEncontradas = [];
  const visitados = new Set([origenId]);

  function backtrack(nodoActual, caminoActual, distAcumulada) {
    // Caso base de exito: hemos alcanzado el destino
    if (nodoActual === destinoId) {
      rutasEncontradas.push({
        puntosIds: [...caminoActual],
        distanciaKm: Math.round(distAcumulada)
      });
      return;
    }

    // Poda: si excedemos el numero maximo de saltos o el cupo de seguridad
    if (caminoActual.length > maxSaltos || rutasEncontradas.length >= limiteMax * 2) {
      return;
    }

    const vecinos = grafo.get(nodoActual) || [];
    for (let i = 0; i < vecinos.length; i++) {
      const arista = vecinos[i];
      // Poda de ciclos: no revisitar un punto ya presente en la ruta actual
      if (!visitados.has(arista.to)) {
        // 1. Elegir paso (Decision)
        visitados.add(arista.to);
        caminoActual.push(arista.to);

        // 2. Explorar recursivamente
        backtrack(arista.to, caminoActual, distAcumulada + arista.dist);

        // 3. Deshacer paso (Retroceso / Backtrack del estado)
        caminoActual.pop();
        visitados.delete(arista.to);
      }
    }
  }

  // Ejecucion inicial del backtracking
  backtrack(origenId, [origenId], 0);

  // Si los puntos estan muy distantes o en polos opuestos y se encontraron pocas rutas,
  // se profundiza adaptativamente un salto mas
  if (rutasEncontradas.length < 6 && maxSaltos < 7) {
    rutasEncontradas.length = 0;
    visitados.clear();
    visitados.add(origenId);

    function backtrackAdaptativo(nodoActual, caminoActual, distAcumulada) {
      if (nodoActual === destinoId) {
        rutasEncontradas.push({
          puntosIds: [...caminoActual],
          distanciaKm: Math.round(distAcumulada)
        });
        return;
      }
      if (caminoActual.length > maxSaltos + 1 || rutasEncontradas.length >= limiteMax * 2) {
        return;
      }

      const vecinos = grafo.get(nodoActual) || [];
      for (let i = 0; i < vecinos.length; i++) {
        const arista = vecinos[i];
        if (!visitados.has(arista.to)) {
          visitados.add(arista.to);
          caminoActual.push(arista.to);
          backtrackAdaptativo(arista.to, caminoActual, distAcumulada + arista.dist);
          caminoActual.pop();
          visitados.delete(arista.to);
        }
      }
    }

    backtrackAdaptativo(origenId, [origenId], 0);
  }

  return rutasEncontradas;
}

/**
 * Evalua multicriterio y ordena todas las rutas encontradas por el backtracking:
 * Desde la mas factible y rapida (alta seguridad, menor tiempo)
 * Hasta la mas ineficiente y lenta (desvios kilometricos extremos, alto riesgo).
 */
function evaluarYOrdenarRutasBacktracking(rutasRaw, origenPunto, destinoPunto, tieneMaterialCientifico = false, instrumentos = []) {
  if (!rutasRaw || rutasRaw.length === 0) return [];

  const minDist = Math.min(...rutasRaw.map((r) => r.distanciaKm));

  // 1. Evaluacion de factores ambientales, mecanicos y de duracion por cada ruta
  const rutasEvaluadas = rutasRaw.map((r) => {
    const paradas = r.puntosIds.map((id) => PUNTOS_MARTE.find((p) => p.id === id)).filter(Boolean);
    const distanciaKm = r.distanciaKm;
    const horasEstimadas = Math.round(distanciaKm / CONFIG_ROVER.velocidadRoverKmH);

    const pendientes = paradas.map((p) => p.pendiente_grados ?? 5);
    const vientos = paradas.map((p) => p.viento_ms ?? 12);
    const polvos = paradas.map((p) => p.opacidad_polvo ?? 1);
    const tempsMin = paradas.map((p) => p.temp_min_c ?? -70);
    const tempsMax = paradas.map((p) => p.temp_max_c ?? 0);

    const maxPendiente = Math.max(...pendientes);
    const promPendiente = pendientes.reduce((a, b) => a + b, 0) / pendientes.length;
    const maxViento = Math.max(...vientos);
    const promViento = vientos.reduce((a, b) => a + b, 0) / vientos.length;
    const maxPolvo = Math.max(...polvos);
    const promPolvo = polvos.reduce((a, b) => a + b, 0) / polvos.length;
    const tMinGlobal = Math.min(...tempsMin);
    const tMaxGlobal = Math.max(...tempsMax);
    const oscilacionTermica = tMaxGlobal - tMinGlobal;

    // Calculo de penalizacion multicriterio
    // Factibilidad y rapidez: menor distancia, menor tiempo, menores pendientes y menor polvo
    const ratioDistancia = distanciaKm / (minDist || 1);
    let penalizacion = (ratioDistancia - 1.0) * 36; // Penalizacion por desvio kilometrico y lentitud
    penalizacion += Math.max(0, maxPendiente - 8) * 1.8; // Terreno escarpado
    penalizacion += Math.max(0, promPendiente - 6) * 1.4;
    penalizacion += Math.max(0, maxPolvo - 1.1) * 12; // Polvo que atenua paneles solares
    penalizacion += Math.max(0, promPolvo - 1.0) * 8;
    penalizacion += Math.max(0, maxViento - 16) * 1.2; // Rafagas eolicas
    penalizacion += Math.max(0, -75 - tMinGlobal) * 0.35; // Frio severo nocturno
    penalizacion += Math.max(0, oscilacionTermica - 65) * 0.25;
    penalizacion += (paradas.length - 2) * 2.2; // Friccion de maniobra por paradas extra

    // Penalizaciones especificas por carga cientifica
    if (tieneMaterialCientifico) {
      if (maxPendiente > 10) penalizacion += 16 + (maxPendiente - 10) * 1.5;
      if (maxPolvo > 1.3) penalizacion += 12;
      if (oscilacionTermica > 70) penalizacion += 8;
    }

    if (instrumentos && instrumentos.length > 0) {
      instrumentos.forEach((inst) => {
        if (inst.includes('RIMFAX') && maxPendiente > 8.5) penalizacion += 9;
        if (inst.includes('LIBS') && maxPolvo > 1.2) penalizacion += 9;
        if (inst.includes('Taladro') && maxPendiente > 7.0) penalizacion += 12;
        if (inst.includes('MEDA') && maxViento > 15.0) penalizacion += 8;
        if (inst.includes('Mastcam') && maxPolvo > 1.0) penalizacion += 11;
        if (inst.includes('SHERLOC') && oscilacionTermica > 65) penalizacion += 9;
      });
    }

    const rawScore = 100 - penalizacion;

    return {
      puntosIds: r.puntosIds,
      paradas,
      distanciaKm,
      horasEstimadas,
      maxPendiente,
      promPendiente,
      maxViento,
      promViento,
      maxPolvo,
      promPolvo,
      tMinGlobal,
      tMaxGlobal,
      oscilacionTermica,
      rawScore
    };
  });

  // 2. ORDENAMIENTO ESTRICTO:
  // Desde la mas factible y rapida (mayor score / menor tiempo) hasta la mas ineficiente y lenta
  rutasEvaluadas.sort((a, b) => {
    if (Math.abs(b.rawScore - a.rawScore) > 0.01) {
      return b.rawScore - a.rawScore;
    }
    return a.distanciaKm - b.distanciaKm;
  });

  const total = rutasEvaluadas.length;
  const maxRaw = rutasEvaluadas[0].rawScore;
  const minRaw = rutasEvaluadas[total - 1].rawScore;
  const rango = Math.max(1, maxRaw - minRaw);

  // 3. Normalizacion y asignacion de clasificacion, insignias, colores y pros/contras
  return rutasEvaluadas.map((r, index) => {
    const esMejor = index === 0;
    const esPeor = index === total - 1 && total > 1;
    const rankingPos = index + 1;

    // Normalizar score entre 97 (mejor) y 28 (peor)
    let score;
    if (esMejor) {
      score = 97;
    } else if (esPeor) {
      score = 28;
    } else {
      const fraccion = (r.rawScore - minRaw) / rango;
      score = Math.round(34 + fraccion * 58);
      score = Math.max(34, Math.min(94, score));
    }

    // Clasificacion de badges y colores tematicos en degradado de seguridad
    let tipoEvaluacion = 'alternativa';
    let badge = 'ALTERNATIVA VIABLE';
    let color = '#38bdf8'; // Celeste
    let nombre = `Ruta ${rankingPos} • Alternativa`;
    let descripcionCorta = '';

    if (esMejor) {
      tipoEvaluacion = 'mejor';
      badge = 'MÁS FACTIBLE Y RÁPIDA (RECOMENDADA)';
      color = '#10b981'; // Verde esmeralda
      nombre = `Ruta 1 • Más Factible y Rápida (Óptima)`;
      descripcionCorta = 'Máxima viabilidad operativa y menor tiempo de traslado. Pendientes controladas, baja atenuación de polvo y óptima estabilidad.';
    } else if (esPeor) {
      tipoEvaluacion = 'peor';
      badge = 'MÁS INEFICIENTE Y LENTA (ALTO RIESGO)';
      color = '#ef4444'; // Rojo advertencia
      nombre = `Ruta ${rankingPos} • Más Ineficiente y Lenta`;
      descripcionCorta = 'Ruta crítica desaconsejada. Máximo tiempo de navegación acumulado, desvíos kilométricos masivos y alta exposición ambiental.';
    } else {
      const percentil = index / (total - 1);
      if (percentil < 0.25) {
        badge = 'ALTA FACTIBILIDAD';
        color = '#06b6d4'; // Cian
        nombre = `Ruta ${rankingPos} • Alta Factibilidad / Rápida`;
        descripcionCorta = 'Excelente alternativa de navegación con bajo kilometraje y superficie predominantemente llana.';
      } else if (percentil < 0.55) {
        badge = 'EFICIENTE / RELIEVE SUAVE';
        color = '#8b5cf6'; // Violeta
        nombre = `Ruta ${rankingPos} • Corredor Alternativo`;
        descripcionCorta = 'Corredor secundario viable con velocidad de avance constante y relieve moderado.';
      } else if (percentil < 0.80) {
        badge = 'MODERADA (DESVÍO)';
        color = '#f59e0b'; // Ámbar
        nombre = `Ruta ${rankingPos} • Desvío Secundario`;
        descripcionCorta = 'Ruta con mayor tiempo de recorrido y exposición a variaciones térmicas intermedias.';
      } else {
        badge = 'INEFICIENTE Y LENTA';
        color = '#f97316'; // Naranja
        nombre = `Ruta ${rankingPos} • Ineficiente / Mayor Desgaste`;
        descripcionCorta = 'Trayectoria prolongada con múltiples escalas intermedias y mayor fatiga mecánica para el rover.';
      }
    }

    // Generacion de Pros y Contras calibrados
    const pros = [];
    const contras = [];

    if (esMejor) {
      pros.push(`MÁXIMA FACTIBILIDAD: Calificada con el mayor índice de seguridad y rapidez (${score}/100).`);
      pros.push(`Menor tiempo de desplazamiento estimado (${r.horasEstimadas.toLocaleString()} h) en ${r.distanciaKm.toLocaleString()} km.`);
      pros.push(`Pendientes controladas (máx. ${r.maxPendiente.toFixed(1)}°, prom. ${r.promPendiente.toFixed(1)}°): mínimo esfuerzo motriz y nulo riesgo de vuelco.`);
      pros.push(`Baja opacidad atmosférica (${r.promPolvo.toFixed(2)} tau): óptima visibilidad LIDAR y carga fotovoltaica.`);
      if (tieneMaterialCientifico) {
        pros.push(`Protección integral garantizada para instrumental científico y sensores de navegación.`);
      }
      contras.push(`Requiere circular por ${r.paradas.length} zonas de paso intermedias.`);
    } else if (esPeor) {
      pros.push(`Conecta los puntos mediante corredores geográficos alternos en caso de bloqueo catastrófico.`);
      contras.push(`MÁS INEFICIENTE Y LENTA: Calificación de riesgo crítico (Score: ${score}/100).`);
      contras.push(`Tiempo de viaje masivo (${r.horasEstimadas.toLocaleString()} h): +${Math.round(r.distanciaKm - minDist).toLocaleString()} km extras de desvío.`);
      contras.push(`Atraviesa terrenos con pendientes de hasta ${r.maxPendiente.toFixed(1)}°: peligro inminente de deslizamiento en regolito.`);
      contras.push(`Exposición a tormentas de polvo densas (hasta ${r.maxPolvo.toFixed(2)} tau) y vientos de ${r.maxViento.toFixed(1)} m/s.`);
      contras.push(`Frío nocturno severo de hasta ${r.tMinGlobal}°C con drenaje intensivo de baterías.`);
      if (tieneMaterialCientifico) {
        contras.push(`NO RECOMENDADA: Riesgo crítico de descalibración o ruptura de instrumental delicado.`);
      }
    } else {
      pros.push(`Ruta disponible #${rankingPos}: ${r.distanciaKm.toLocaleString()} km en aprox. ${r.horasEstimadas.toLocaleString()} horas.`);
      if (r.maxPendiente <= 10) {
        pros.push(`Relieve suave con pendiente máxima de ${r.maxPendiente.toFixed(1)}°: bajo consumo en tracción.`);
      } else {
        pros.push(`Superficie transitable apta para tracción diferencial.`);
      }
      if (r.promPolvo < 1.3) {
        pros.push(`Atmósfera aceptable con opacidad promedio de ${r.promPolvo.toFixed(2)} tau.`);
      }

      const kmExtra = r.distanciaKm - minDist;
      if (kmExtra > 0) {
        contras.push(`Desvío de +${Math.round(kmExtra).toLocaleString()} km (+${Math.round(kmExtra / CONFIG_ROVER.velocidadRoverKmH).toLocaleString()} h) frente a la ruta más directa.`);
      }
      if (r.maxPendiente > 12) {
        contras.push(`Tramos con inclinación de hasta ${r.maxPendiente.toFixed(1)}° que exigen precaución.`);
      }
      if (r.maxPolvo >= 1.6) {
        contras.push(`Presencia de polvo moderado (${r.maxPolvo.toFixed(2)} tau) en sectores abiertos.`);
      }
    }

    return {
      id: esMejor ? 'optima' : esPeor ? 'peor' : `ruta-${rankingPos}`,
      estrategiaId: esMejor ? 'optima' : esPeor ? 'peor' : `alternativa-${rankingPos}`,
      tipoEvaluacion,
      rankingPos,
      nombre,
      badge,
      color,
      descripcionCorta,
      score,
      distanciaKm: r.distanciaKm,
      horasEstimadas: r.horasEstimadas,
      paradas: r.paradas,
      puntosIds: r.puntosIds,
      coordenadasLeaflet: r.paradas.map((p) => [p.lat, p.lon]),
      factores: {
        superficie: {
          pendienteMax: r.maxPendiente,
          pendienteProm: r.promPendiente,
          estado: r.maxPendiente <= 10 ? 'Óptimo' : r.maxPendiente <= 16 ? 'Aceptable' : 'Peligroso'
        },
        clima: {
          vientoMax: r.maxViento,
          vientoProm: r.promViento,
          polvoMax: r.maxPolvo,
          polvoProm: r.promPolvo,
          estado: r.promPolvo < 1.2 && r.maxViento < 18 ? 'Limpio' : r.promPolvo < 1.8 ? 'Moderado' : 'Severo'
        },
        termico: {
          tMin: r.tMinGlobal,
          tMax: r.tMaxGlobal,
          oscilacion: r.oscilacionTermica,
          estado: r.tMinGlobal >= -80 ? 'Controlado' : 'Frío Crítico'
        },
        materialCientifico: {
          apto: esPeor ? false : (tieneMaterialCientifico ? r.maxPendiente <= 12 && r.promPolvo <= 1.5 : true),
          diagnostico: esPeor
            ? 'NO APTO: Alto riesgo de destrucción o descalibración irreversible del instrumental.'
            : (tieneMaterialCientifico
                ? (r.maxPendiente <= 10
                    ? 'Apto: Máxima protección y amortiguación para sensores ópticos y de subsuelo.'
                    : 'Apto con precaución en velocidad para amortiguar vibraciones mecánicas.')
                : 'Apto: Sin restricciones de carga científica.')
        }
      },
      pros,
      contras
    };
  });
}

/**
 * Genera el catalogo completo de todas las rutas disponibles entre dos puntos en Marte,
 * exploradas exhaustivamente mediante el ALGORITMO BACKTRACKING y ordenadas:
 * desde la mas factible y rapida hasta la mas ineficiente y lenta.
 */
export function generarListaRutas(origenId, destinoId, tipoCarga = 'normal', tieneMaterialCientifico = false, instrumentos = []) {
  const o = Number(origenId);
  const d = Number(destinoId);

  if (o === d) {
    return { ok: false, mensaje: 'El origen y el destino deben ser puntos diferentes en Marte.' };
  }

  const puntoO = PUNTOS_MARTE.find((p) => p.id === o);
  const puntoD = PUNTOS_MARTE.find((p) => p.id === d);
  if (!puntoO || !puntoD) {
    return { ok: false, mensaje: 'Los puntos seleccionados no se encuentran en la cartografia de Marte.' };
  }

  const cargaAjustada = tieneMaterialCientifico ? 'delicada' : tipoCarga;

  // 1. Construir grafo de conectividad espacial
  const grafo = construirGrafoBacktracking(PUNTOS_MARTE, CONFIG_ROVER.kVecinos);

  // 2. Ejecutar Algoritmo Backtracking Recursivo
  const rutasRaw = buscarTodasLasRutasBacktracking(grafo, o, d, 5, 80);

  if (!rutasRaw || rutasRaw.length === 0) {
    return { ok: false, mensaje: 'No se encontraron rutas conectadas entre los puntos seleccionados.' };
  }

  // 3. Evaluar y ordenar todas las rutas (de la mas factible y rapida a la mas ineficiente y lenta)
  const rutasProcesadas = evaluarYOrdenarRutasBacktracking(
    rutasRaw,
    puntoO,
    puntoD,
    tieneMaterialCientifico,
    instrumentos
  );

  // Determinacion de capa sugerida segun instrumental
  let mapaSugerido = 'Mars_Viking_MDIM21_ClrMosaic_global_232m';
  if (instrumentos && instrumentos.length > 0) {
    for (const inst of instrumentos) {
      if (PERFILES_INSTRUMENTOS[inst]?.mapaSugerido) {
        mapaSugerido = PERFILES_INSTRUMENTOS[inst].mapaSugerido;
        break;
      }
    }
  }

  return {
    ok: true,
    algoritmo: 'Exploración Exhaustiva Multicriterio',
    totalRutasDisponibles: rutasProcesadas.length,
    origen: puntoO,
    destino: puntoD,
    carga: cargaAjustada,
    tieneMaterialCientifico,
    instrumentos,
    mapaSugerido,
    rutas: rutasProcesadas
  };
}

/**
 * Planifica una unica ruta de minima distancia y factibilidad (Retrocompatible)
 */
export function planificarRutaSimple(origenId, destinoId, tipoCarga = 'ninguna') {
  const o = Number(origenId);
  const d = Number(destinoId);

  const res = generarListaRutas(o, d, tipoCarga, false, []);
  if (!res.ok || !res.rutas?.length) {
    return { ok: false, mensaje: res.mensaje || 'No se encontro ruta disponible.' };
  }

  const mejorRuta = res.rutas[0];
  return {
    ok: true,
    carga: tipoCarga,
    rutaIds: mejorRuta.puntosIds,
    paradas: mejorRuta.paradas,
    km: mejorRuta.distanciaKm,
    kmDirecta: mejorRuta.distanciaKm,
    geojson: {
      type: 'Feature',
      properties: { carga: tipoCarga, distanciaKm: mejorRuta.distanciaKm },
      geometry: {
        type: 'LineString',
        coordinates: mejorRuta.paradas.map((p) => [p.lon, p.lat])
      }
    }
  };
}
