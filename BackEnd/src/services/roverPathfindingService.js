// Motor de navegacion y calculo de rutas para el rover marciano (Dijkstra Multicriterio)
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
  kVecinos: 10, // Conectividad ampliada para permitir multiples corredores alternativos
  velocidadRoverKmH: 0.14 // Velocidad promedio de avance del rover en terreno marciano
};

// Convierte los datos ambientales de un punto a factor de riesgo 0..1
function evaluarRiesgoPunto(p, L, W) {
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

// Construye el grafo ponderado de conexiones entre puntos de Marte
function construirGrafo(puntos, carga, usarRiesgo, pesosPersonalizados, factorPeligroMultiplicador = 3, instrumentos = []) {
  const pf = CONFIG_ROVER.perfiles[carga] || CONFIG_ROVER.perfiles.ninguna;
  const limInstrumentos = {};
  const pesosInstrumentos = {};

  if (instrumentos && instrumentos.length > 0) {
    instrumentos.forEach((inst) => {
      const cInst = PERFILES_INSTRUMENTOS[inst];
      if (cInst) {
        if (cInst.lim) {
          for (const k in cInst.lim) {
            limInstrumentos[k] = Math.min(limInstrumentos[k] ?? Infinity, cInst.lim[k]);
          }
        }
        if (cInst.pesos) {
          for (const k in cInst.pesos) {
            pesosInstrumentos[k] = Math.max(pesosInstrumentos[k] ?? 0, cInst.pesos[k]);
          }
        }
      }
    });
  }

  const L = Object.assign({}, CONFIG_ROVER.rover, pf.lim, limInstrumentos);
  const W = Object.assign({}, CONFIG_ROVER.pesos, pf.pesos, pesosPersonalizados || {}, pesosInstrumentos);
  const por = new Map();
  const info = new Map();
  const g = new Map();

  puntos.forEach((p) => {
    por.set(p.id, p);
    info.set(p.id, evaluarRiesgoPunto(p, L, W));
    g.set(p.id, []);
  });

  const pares = [];
  puntos.forEach((p) =>
    puntos
      .filter((q) => q.id !== p.id)
      .map((q) => [calcularDistanciaMarciana(p.lat, p.lon, q.lat, q.lon), q.id])
      .sort((a, b) => a[0] - b[0])
      .slice(0, CONFIG_ROVER.kVecinos)
      .forEach(([, j]) => pares.push([p.id, j]))
  );

  const vistos = new Set();
  pares.forEach(([a, b]) => {
    const k = [a, b].sort().join('|');
    if (vistos.has(k) || !por.has(a) || !por.has(b)) return;
    vistos.add(k);
    if (usarRiesgo && (info.get(a).bloq || info.get(b).bloq)) return;
    const d = calcularDistanciaMarciana(por.get(a).lat, por.get(a).lon, por.get(b).lat, por.get(b).lon);

    let penalizacionExtraInst = 0;
    let afinidadExtraInst = 0;
    if (usarRiesgo && instrumentos && instrumentos.length > 0) {
      // Efecto del peso acumulado de instrumentación en subidas y tracción
      penalizacionExtraInst += (instrumentos.length * 0.35) * Math.max(0, (por.get(b).pendiente_grados - 4.5) / 3.0);

      instrumentos.forEach((inst) => {
        const pB = por.get(b);
        if (inst.includes('LIBS')) {
          if (pB.id === 13 || pB.id === 4) afinidadExtraInst += 0.45;
          if (pB.opacidad_polvo > 1.2) penalizacionExtraInst += 1.8;
        }
        if (inst.includes('Taladro')) {
          if (pB.id === 13 || pB.id === 4) afinidadExtraInst += 0.50;
          if (pB.pendiente_grados > 5.0) penalizacionExtraInst += 2.5 * Math.pow((pB.pendiente_grados - 5.0) / 2, 1.4);
          if (pB.opacidad_polvo > 1.3) penalizacionExtraInst += 1.5;
        }
        if (inst.includes('RIMFAX')) {
          if (pB.id === 5 || pB.id === 1) afinidadExtraInst += 0.55;
          if (pB.pendiente_grados > 6.0) penalizacionExtraInst += 2.0;
        }
        if (inst.includes('MEDA')) {
          if (pB.viento_ms > 13.0) penalizacionExtraInst += 2.2 * ((pB.viento_ms - 13.0) / 3);
          if (pB.opacidad_polvo > 1.1) penalizacionExtraInst += 2.0 * ((pB.opacidad_polvo - 1.1) / 0.3);
          if (pB.id === 17) afinidadExtraInst += 0.3;
        }
        if (inst.includes('Mastcam')) {
          if (pB.opacidad_polvo > 0.85) penalizacionExtraInst += 3.2 * ((pB.opacidad_polvo - 0.85) / 0.25);
          if (pB.id === 17) afinidadExtraInst += 0.4;
        }
        if (inst.includes('SHERLOC')) {
          if (pB.id === 24 || pB.id === 14 || pB.id === 21) afinidadExtraInst += 0.60;
          const osc = (pB.temp_max_c || 0) - (pB.temp_min_c || -70);
          if (osc > 68) penalizacionExtraInst += 2.0;
        }
      });
    }

    const factorTotal = Math.max(0.2, 1 + factorPeligroMultiplicador * ((info.get(a).riesgo + info.get(b).riesgo) / 2) + penalizacionExtraInst - afinidadExtraInst);
    const c = usarRiesgo ? d * factorTotal : d;
    g.get(a).push([b, c, d]);
    g.get(b).push([a, c, d]);
  });

  return { g, info, por };
}

// Algoritmo de camino mas corto Dijkstra
function ejecutarDijkstra(g, s, t) {
  const dist = new Map([[s, 0]]);
  const prev = new Map();
  const hecho = new Set();

  for (;;) {
    let u = null;
    for (const [n, d] of dist) {
      if (!hecho.has(n) && (u === null || d < dist.get(u))) u = n;
    }
    if (u === null) return null;
    if (u === t) break;
    hecho.add(u);
    const vecinos = g.get(u) || [];
    for (const [v, c] of vecinos) {
      const nuevo = dist.get(u) + c;
      if (nuevo < (dist.has(v) ? dist.get(v) : Infinity)) {
        dist.set(v, nuevo);
        prev.set(v, u);
      }
    }
  }

  const ruta = [t];
  while (ruta[0] !== s) {
    const anterior = prev.get(ruta[0]);
    if (anterior === undefined) return null;
    ruta.unshift(anterior);
  }
  return ruta;
}

// Calcula longitud total de una secuencia de paradas
function calcularLargoRuta(g, ruta) {
  return ruta.slice(1).reduce((s, v, i) => {
    const arista = (g.get(ruta[i]) || []).find((e) => e[0] === v);
    return s + (arista ? arista[2] : 0);
  }, 0);
}

/**
 * Planifica una unica ruta segura tradicional con Dijkstra
 */
export function planificarRutaSimple(origenId, destinoId, tipoCarga = 'ninguna') {
  const o = Number(origenId);
  const d = Number(destinoId);

  if (!CONFIG_ROVER.perfiles[tipoCarga]) {
    return { ok: false, mensaje: `Perfil de carga no reconocido: ${tipoCarga}` };
  }

  const redSegura = construirGrafo(PUNTOS_MARTE, tipoCarga, true);
  if (!redSegura.info.has(o) || !redSegura.info.has(d)) {
    return { ok: false, mensaje: 'El origen o el destino no existen en la red de puntos de Marte.' };
  }

  const ruta = ejecutarDijkstra(redSegura.g, o, d);
  if (!ruta) {
    return { ok: false, mensaje: 'No hay ruta segura entre esos puntos con la carga especificada.' };
  }

  const redDirecta = construirGrafo(PUNTOS_MARTE, tipoCarga, false);
  const directa = ejecutarDijkstra(redDirecta.g, o, d);

  const paradas = ruta.map((i) =>
    Object.assign({}, redSegura.por.get(i), {
      riesgo: redSegura.info.get(i).riesgo,
      falt: redSegura.info.get(i).falt
    })
  );

  const kmTotal = calcularLargoRuta(redSegura.g, ruta);
  const kmDirecta = calcularLargoRuta(redDirecta.g, directa);

  return {
    ok: true,
    carga: tipoCarga,
    rutaIds: ruta,
    paradas,
    km: kmTotal,
    kmDirecta,
    geojson: {
      type: 'Feature',
      properties: { carga: tipoCarga, distanciaKm: kmTotal },
      geometry: {
        type: 'LineString',
        coordinates: paradas.map((p) => [p.lon, p.lat])
      }
    }
  };
}

/**
 * Genera el catalogo completo de rutas alternativas multicriterio evaluando:
 * 1. Superficie (pendiente y terreno)
 * 2. Clima y atmosfera (viento y opacidad de polvo)
 * 3. Termico (temperatura minima, maxima y oscilacion)
 * 4. Instrumental cientifico (sensibilidad a vibraciones y polvo)
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

  const estrategias = [
    {
      id: 'optima',
      nombre: 'Ruta Optima Multicriterio',
      badge: 'Recomendada',
      color: '#10b981',
      usarRiesgo: true,
      pesos: tieneMaterialCientifico
        ? { sup: 6, clima: 3, term: 3.5 }
        : { sup: 3.5, clima: 2.5, term: 2.5 },
      factorPeligro: 3.5,
      descripcionCorta: 'Balance optimo entre seguridad mecanica, proteccion climatica y rango termico.'
    },
    {
      id: 'directa',
      nombre: 'Ruta Directa de Minima Distancia',
      badge: 'Mas Rapida',
      color: '#f59e0b',
      usarRiesgo: false,
      pesos: { sup: 1, clima: 1, term: 1 },
      factorPeligro: 0,
      descripcionCorta: 'Trayectoria geometrica mas corta. Menor kilometraje a expensas de mayor exposicion a pendientes y vientos.'
    },
    {
      id: 'climatica',
      nombre: 'Ruta de Proteccion Termica y Atmosferica',
      badge: 'Menor Estres Climatico',
      color: '#38bdf8',
      usarRiesgo: true,
      pesos: { sup: 1.5, clima: 6, term: 5 },
      factorPeligro: 4.0,
      descripcionCorta: 'Minimiza la acumulacion de polvo en paneles y evita oscilaciones termicas extremas.'
    },
    {
      id: 'suave',
      nombre: 'Ruta de Relieve Suave (Topografica)',
      badge: 'Minima Inclinacion',
      color: '#a855f7',
      usarRiesgo: true,
      pesos: { sup: 7, clima: 1.5, term: 1.5 },
      factorPeligro: 4.5,
      descripcionCorta: 'Disenada para evitar canones y escarpes. Menor desgaste de ruedas y suspension.'
    }
  ];

  const rutasProcesadas = [];
  const vistasRutasSet = new Set();

  for (const est of estrategias) {
    const red = construirGrafo(PUNTOS_MARTE, cargaAjustada, est.usarRiesgo, est.pesos, est.factorPeligro, instrumentos);
    let camino = ejecutarDijkstra(red.g, o, d);

    if (!camino && est.usarRiesgo) {
      const redFallback = construirGrafo(PUNTOS_MARTE, 'normal', true, est.pesos, 2, instrumentos);
      camino = ejecutarDijkstra(redFallback.g, o, d);
    }
    if (!camino) {
      const redDirecta = construirGrafo(PUNTOS_MARTE, 'ninguna', false, null, 0, []);
      camino = ejecutarDijkstra(redDirecta.g, o, d);
    }

    if (!camino || camino.length === 0) continue;

    const claveCamino = camino.join('-');
    const yaExiste = vistasRutasSet.has(claveCamino);
    vistasRutasSet.add(claveCamino);

    const paradas = camino.map((id) => PUNTOS_MARTE.find((p) => p.id === id));
    const redMedicion = construirGrafo(PUNTOS_MARTE, 'ninguna', false);
    const distanciaTotal = calcularLargoRuta(redMedicion.g, camino);
    const horasEstimadas = Math.round(distanciaTotal / CONFIG_ROVER.velocidadRoverKmH);

    const pendientes = paradas.map((p) => p.pendiente_grados || 5);
    const vientos = paradas.map((p) => p.viento_ms || 12);
    const polvos = paradas.map((p) => p.opacidad_polvo || 1);
    const tempsMin = paradas.map((p) => p.temp_min_c || -70);
    const tempsMax = paradas.map((p) => p.temp_max_c || 0);

    const maxPendiente = Math.max(...pendientes);
    const promPendiente = pendientes.reduce((a, b) => a + b, 0) / pendientes.length;
    const maxViento = Math.max(...vientos);
    const promViento = vientos.reduce((a, b) => a + b, 0) / vientos.length;
    const maxPolvo = Math.max(...polvos);
    const promPolvo = polvos.reduce((a, b) => a + b, 0) / polvos.length;
    const tMinGlobal = Math.min(...tempsMin);
    const tMaxGlobal = Math.max(...tempsMax);
    const oscilacionTermica = tMaxGlobal - tMinGlobal;

    const pros = [];
    const contras = [];

    // Evaluacion de Superficie
    if (maxPendiente <= 10) {
      pros.push(`Pendientes muy suaves (max. ${maxPendiente.toFixed(1)}°): riesgo de vuelco nulo y minimo esfuerzo motriz.`);
    } else if (maxPendiente <= 16) {
      pros.push(`Pendiente promedio controlada (${promPendiente.toFixed(1)}°) apta para traccion del rover.`);
    } else {
      contras.push(`Atraviesa zonas de alta pendiente (${maxPendiente.toFixed(1)}°): exige traccion diferencial y control de deslizamiento.`);
    }

    // Evaluacion Atmosferica
    if (maxViento < 18 && promPolvo < 1.2) {
      pros.push(`Ambiente atmosferico despejado: viento promedio de ${promViento.toFixed(1)} m/s y baja concentracion de polvo (${promPolvo.toFixed(2)} tau).`);
    } else if (maxPolvo >= 2.0) {
      contras.push(`Riesgo de atenuacion solar por polvo elevado (${maxPolvo.toFixed(2)} tau): puede ensuciar paneles y lentes.`);
    } else {
      contras.push(`Vientos moderados en rafagas de hasta ${maxViento.toFixed(1)} m/s en zonas abiertas.`);
    }

    // Evaluacion Termica
    if (tMinGlobal >= -85 && oscilacionTermica <= 75) {
      pros.push(`Estabilidad termica favorable (minima de ${tMinGlobal}°C): reduce los ciclos de calentamiento con radioisotopos.`);
    } else {
      contras.push(`Frio extremo nocturno de hasta ${tMinGlobal}°C: requiere precalentamiento continuo de actuadores.`);
    }

    // Impacto en Instrumental
    if (tieneMaterialCientifico) {
      if (maxPendiente <= 10 && promPolvo < 1.4) {
        pros.push(`Excelente para instrumental delicado (${instrumentos.length ? instrumentos.slice(0, 2).join(', ') : 'sensores'}): minima vibracion y calibracion protegida.`);
      } else {
        contras.push(`Precaucion con instrumental sensible: vibraciones por irregularidades en el terreno de hasta ${maxPendiente.toFixed(1)}°.`);
      }
    }

    if (est.id === 'directa') {
      pros.push(`Recorrido mas corto (${Math.round(distanciaTotal).toLocaleString()} km): menor consumo energetico.`);
    } else {
      const redBase = construirGrafo(PUNTOS_MARTE, 'ninguna', false);
      const camDirecto = ejecutarDijkstra(redBase.g, o, d);
      const distDirecta = camDirecto ? calcularLargoRuta(redBase.g, camDirecto) : distanciaTotal;
      const extraKm = Math.max(0, distanciaTotal - distDirecta);
      if (extraKm > 50) {
        contras.push(`Desvio preventivo de seguridad de +${Math.round(extraKm)} km respecto a la linea recta.`);
      }
    }

    let score = 100;
    if (maxPendiente > 15) score -= 18;
    else if (maxPendiente > 10) score -= 8;
    if (maxViento > 20) score -= 12;
    if (maxPolvo > 1.8) score -= 14;
    if (tMinGlobal < -95) score -= 10;
    if (tieneMaterialCientifico && maxPendiente > 10) score -= 20;
    if (est.id === 'directa' && tieneMaterialCientifico) score -= 15;
    score = Math.max(35, Math.min(99, score));

    rutasProcesadas.push({
      id: est.id + (yaExiste ? '-alt' : ''),
      estrategiaId: est.id,
      nombre: est.nombre,
      badge: est.badge,
      color: est.color,
      descripcionCorta: est.descripcionCorta,
      score,
      distanciaKm: Math.round(distanciaTotal),
      horasEstimadas,
      paradas,
      puntosIds: camino,
      coordenadasLeaflet: paradas.map((p) => [p.lat, p.lon]),
      factores: {
        superficie: {
          pendienteMax: maxPendiente,
          pendienteProm: promPendiente,
          estado: maxPendiente <= 10 ? 'Optimo' : maxPendiente <= 17 ? 'Aceptable' : 'Exigente'
        },
        clima: {
          vientoMax: maxViento,
          vientoProm: promViento,
          polvoProm: promPolvo,
          estado: promPolvo < 1.2 && maxViento < 18 ? 'Limpio' : promPolvo < 1.8 ? 'Moderado' : 'Severo'
        },
        termico: {
          tMin: tMinGlobal,
          tMax: tMaxGlobal,
          oscilacion: oscilacionTermica,
          estado: tMinGlobal >= -80 ? 'Controlado' : 'Frio Severo'
        },
        materialCientifico: {
          apto: tieneMaterialCientifico ? maxPendiente <= 12 && promPolvo <= 1.6 : true,
          diagnostico: tieneMaterialCientifico
            ? maxPendiente <= 10
              ? 'Maxima proteccion para sensores opticos y sismologicos.'
              : 'Apto con velocidad reducida para amortiguar vibraciones.'
            : 'Sin restricciones de instrumental.'
        }
      },
      pros,
      contras
    });
  }

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
    origen: puntoO,
    destino: puntoD,
    carga: cargaAjustada,
    tieneMaterialCientifico,
    instrumentos,
    mapaSugerido,
    rutas: rutasProcesadas
  };
}
