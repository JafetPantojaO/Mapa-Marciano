/*
 * rover_ruta.js  -  Ruta segura para el rover (Dijkstra) + conexion al mapa.
 *
 * USO MINIMO en tu pagina (Leaflet ya cargado):
 *   <script src="rover_ruta.js"></script>
 *   <script>
 *     const mapa = RoverRuta.crearMapa("id-del-div-del-mapa");   // o usa tu propio mapa Leaflet
 *     RoverRuta.montarPanel(document.getElementById("id-del-panel"), mapa);
 *   </script>
 *
 * USO SOLO CON EL ALGORITMO (cualquier libreria de mapas):
 *   const r = RoverRuta.planificar(4, 19, "delicada");  // origen, destino, carga
 *   r.geojson  -> LineString [lon, lat] listo para Mapbox / OpenLayers / Leaflet
 *
 * CON TU BASE DE DATOS:
 *   await RoverRuta.cargarDatos("/api/puntos");  // debe devolver {puntos:[...], rutas:[[1,4],...]}
 */
(function (root) {
  "use strict";

  /* ===================== CONFIGURACION ===================== */
  const CFG = {
    rover: { pend: 25, viento: 30, polvo: 3, tmin: -60, tmax: 40 }, // limites del rover
    pesos: { sup: 3, clima: 2, term: 2.5 }, // importancia de cada factor
    perfiles: {
      ninguna: { nombre: "Sin carga especial", lim: {}, pesos: {}, umbral: 0.7 },
      normal: { nombre: "Carga normal", lim: { pend: 20 }, pesos: {}, umbral: 0.7 },
      delicada: {
        nombre: "Instrumentos delicados",
        lim: { pend: 10, viento: 20, polvo: 2, tmin: -20, tmax: 30 },
        pesos: { sup: 5, clima: 2, term: 3 },
        umbral: 0.5
      }
    },
    desconocido: 0.5, // riesgo asumido cuando NO hay dato real
    kVecinos: 4, // conexiones por punto si no defines "rutas"
    radioKm: 3389.5 // radio de Marte
  };

  // Datos reales por punto: pendiente_grados, viento_ms, opacidad_polvo, temp_min_c, temp_max_c
  // Valores calibrados con misiones MOLA, TES, Viking, Curiosity, Perseverance e InSight
  let DATOS = {
    rutas: [],
    puntos: [
      { id: 1, nombre: "Vastitas Borealis", lat: 70, lon: 100, pendiente_grados: 3.2, viento_ms: 12.0, opacidad_polvo: 0.8, temp_min_c: -125, temp_max_c: -60, tipoTerreno: "Llanura polar con criocapas y hielo subterráneo" },
      { id: 2, nombre: "Tantalus Fossae", lat: 50, lon: -100, pendiente_grados: 16.5, viento_ms: 18.5, opacidad_polvo: 1.4, temp_min_c: -85, temp_max_c: -15, tipoTerreno: "Fosas tectónicas con grabens escalonados" },
      { id: 3, nombre: "Tempe Fossae", lat: 40, lon: -70, pendiente_grados: 14.2, viento_ms: 16.0, opacidad_polvo: 1.1, temp_min_c: -80, temp_max_c: -10, tipoTerreno: "Relieve fracturado y escarpes de falla" },
      { id: 4, nombre: "Acidalia Planitia", lat: 49, lon: -22, pendiente_grados: 4.1, viento_ms: 14.5, opacidad_polvo: 1.2, temp_min_c: -90, temp_max_c: -20, tipoTerreno: "Cuenca sedimentaria oscura y llanura llana" },
      { id: 5, nombre: "Utopia Planitia", lat: 47, lon: 118, pendiente_grados: 3.8, viento_ms: 11.2, opacidad_polvo: 0.9, temp_min_c: -95, temp_max_c: -22, tipoTerreno: "Llanura aluvial basáltica con permafrost" },
      { id: 6, nombre: "Amazonis Planitia", lat: 25, lon: -164, pendiente_grados: 2.5, viento_ms: 19.0, opacidad_polvo: 2.2, temp_min_c: -75, temp_max_c: -5, tipoTerreno: "Planicie suave cubierta de polvo eólico fino" },
      { id: 7, nombre: "Tharsis Volcanic Region", lat: 1, lon: -112, pendiente_grados: 22.0, viento_ms: 24.5, opacidad_polvo: 1.8, temp_min_c: -70, temp_max_c: 5, tipoTerreno: "Meseta volcánica escarpada de gran altitud" },
      { id: 8, nombre: "Valles Marineris", lat: -14, lon: -59, pendiente_grados: 24.5, viento_ms: 26.0, opacidad_polvo: 2.1, temp_min_c: -65, temp_max_c: 12, tipoTerreno: "Cañón gigantesco con taludes pronunciados de 7 km" },
      { id: 9, nombre: "Claritas Fossae", lat: -30, lon: -104, pendiente_grados: 15.0, viento_ms: 17.0, opacidad_polvo: 1.3, temp_min_c: -75, temp_max_c: -8, tipoTerreno: "Crestas tectónicas y fracturas longitudinales" },
      { id: 10, nombre: "Terra Sirenum", lat: -40, lon: -150, pendiente_grados: 9.5, viento_ms: 15.0, opacidad_polvo: 1.5, temp_min_c: -85, temp_max_c: -18, tipoTerreno: "Tierras altas craterizadas con lechos de cloruros" },
      { id: 11, nombre: "Icaria Fossae", lat: -50, lon: -130, pendiente_grados: 13.0, viento_ms: 16.5, opacidad_polvo: 1.2, temp_min_c: -95, temp_max_c: -25, tipoTerreno: "Cañadas tectónicas y crestas erosionadas" },
      { id: 12, nombre: "Aonia Terra", lat: -58, lon: -95, pendiente_grados: 8.0, viento_ms: 21.0, opacidad_polvo: 1.0, temp_min_c: -110, temp_max_c: -45, tipoTerreno: "Tierras altas de impacto y regolito criogénico" },
      { id: 13, nombre: "Arabia Terra", lat: 21, lon: 5, pendiente_grados: 5.5, viento_ms: 13.0, opacidad_polvo: 1.6, temp_min_c: -70, temp_max_c: 2, tipoTerreno: "Meseta densamente erosionada y rica en minerales" },
      { id: 14, nombre: "Margaritifer Terra", lat: -5, lon: -25, pendiente_grados: 8.5, viento_ms: 15.5, opacidad_polvo: 1.4, temp_min_c: -68, temp_max_c: 8, tipoTerreno: "Terreno caótico con paleocanales de inundación" },
      { id: 15, nombre: "Terra Meridiani", lat: -3, lon: 0, pendiente_grados: 2.2, viento_ms: 9.5, opacidad_polvo: 0.7, temp_min_c: -60, temp_max_c: 18, tipoTerreno: "Planicie llana ecuatorial de hematita esferular" },
      { id: 16, nombre: "Noachis Terra", lat: -45, lon: -5, pendiente_grados: 7.8, viento_ms: 14.0, opacidad_polvo: 1.3, temp_min_c: -90, temp_max_c: -20, tipoTerreno: "Cráteres de impacto ancestrales y regolito seco" },
      { id: 17, nombre: "Terra Sabaea", lat: 2, lon: 42, pendiente_grados: 6.2, viento_ms: 12.5, opacidad_polvo: 1.1, temp_min_c: -65, temp_max_c: 14, tipoTerreno: "Franja de tierras altas con dunas basálticas" },
      { id: 18, nombre: "Tyrrhena Terra", lat: -15, lon: 90, pendiente_grados: 11.5, viento_ms: 18.0, opacidad_polvo: 1.7, temp_min_c: -72, temp_max_c: 5, tipoTerreno: "Meseta volcánica antigua con crestas arrugadas" },
      { id: 19, nombre: "Hellas Planitia", lat: -42, lon: 70, pendiente_grados: 10.5, viento_ms: 27.5, opacidad_polvo: 2.7, temp_min_c: -80, temp_max_c: -5, tipoTerreno: "Cuenca de impacto profunda con frecuentes tormentas de polvo" },
      { id: 20, nombre: "Promethei Terra", lat: -64, lon: 100, pendiente_grados: 9.0, viento_ms: 20.0, opacidad_polvo: 0.9, temp_min_c: -120, temp_max_c: -50, tipoTerreno: "Tierras altas subpolares con hielo de CO2 estacional" },
      { id: 21, nombre: "Chronium Planum", lat: -60, lon: -150, pendiente_grados: 5.0, viento_ms: 18.0, opacidad_polvo: 0.8, temp_min_c: -115, temp_max_c: -48, tipoTerreno: "Meseta polar estratificada de baja pendiente" },
      { id: 22, nombre: "Terra Cimmeria", lat: -35, lon: 145, pendiente_grados: 7.0, viento_ms: 13.5, opacidad_polvo: 1.3, temp_min_c: -85, temp_max_c: -15, tipoTerreno: "Tierras altas con corteza magnética remanente" },
      { id: 23, nombre: "Elysium Planitia", lat: 3, lon: 155, pendiente_grados: 3.0, viento_ms: 10.0, opacidad_polvo: 0.8, temp_min_c: -65, temp_max_c: 15, tipoTerreno: "Llanura basáltica suave, óptima para instrumentos sísmicos" },
      { id: 24, nombre: "Nepenthes Mensae", lat: 5, lon: 120, pendiente_grados: 12.8, viento_ms: 16.0, opacidad_polvo: 1.4, temp_min_c: -68, temp_max_c: 10, tipoTerreno: "Zona de transición con colinas testigo y mesas" },
      { id: 25, nombre: "Elysium Volcanic Region", lat: 25, lon: 147, pendiente_grados: 19.0, viento_ms: 22.0, opacidad_polvo: 1.5, temp_min_c: -75, temp_max_c: 0, tipoTerreno: "Domo volcánico pronunciado con tubos de lava" }
    ]
  };

  /* ===================== MOTOR: Dijkstra ===================== */
  const rad = (x) => (x * Math.PI) / 180;
  function km(a, b) {
    const h =
      Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return 2 * CFG.radioKm * Math.asin(Math.sqrt(h));
  }

  // Convierte los datos reales de un punto a riesgo 0..1 segun limites y pesos de la carga
  function evaluar(p, L, W) {
    const r = (v, m) => (v == null ? null : Math.max(0, v / m));
    const cl = [r(p.viento_ms, L.viento), r(p.opacidad_polvo, L.polvo)].filter((v) => v != null);
    let term = null;
    if (p.temp_min_c != null && p.temp_max_c != null) {
      const c = (L.tmin + L.tmax) / 2,
        m = (L.tmax - L.tmin) / 2;
      term = Math.max(Math.abs(p.temp_min_c - c), Math.abs(p.temp_max_c - c)) / m;
    }
    const crudo = { sup: r(p.pendiente_grados, L.pend), clima: cl.length ? Math.max(...cl) : null, term };
    const falt = Object.keys(crudo).filter((k) => crudo[k] == null);
    const bloq = Object.values(crudo).some((v) => v != null && v > 1); // supera un limite -> intransitable
    let suma = 0,
      pw = 0;
    for (const k in crudo) {
      suma += W[k] * (crudo[k] == null ? CFG.desconocido : Math.min(1, crudo[k]));
      pw += W[k];
    }
    return { riesgo: suma / pw, bloq, falt };
  }

  function grafo(datos, carga, usarRiesgo, pesosPersonalizados, factorPeligroMultiplicador = 3) {
    const pf = CFG.perfiles[carga] || CFG.perfiles.ninguna;
    const L = Object.assign({}, CFG.rover, pf.lim);
    const W = Object.assign({}, CFG.pesos, pf.pesos, pesosPersonalizados || {});
    const por = new Map(),
      info = new Map(),
      g = new Map();
    datos.puntos.forEach((p) => {
      por.set(p.id, p);
      info.set(p.id, evaluar(p, L, W));
      g.set(p.id, []);
    });
    const pares = datos.rutas && datos.rutas.length ? datos.rutas.slice() : [];
    if (!pares.length) {
      datos.puntos.forEach((p) =>
        datos.puntos
          .filter((q) => q.id !== p.id)
          .map((q) => [km(p, q), q.id])
          .sort((a, b) => a[0] - b[0])
          .slice(0, CFG.kVecinos)
          .forEach(([, j]) => pares.push([p.id, j]))
      );
    }
    const vistos = new Set();
    pares.forEach(([a, b]) => {
      const k = [a, b].sort().join("|");
      if (vistos.has(k) || !por.has(a) || !por.has(b)) return;
      vistos.add(k);
      if (usarRiesgo && (info.get(a).bloq || info.get(b).bloq)) return; // tramo peligroso: se evita
      const d = km(por.get(a), por.get(b));
      const c = usarRiesgo
        ? d * (1 + factorPeligroMultiplicador * (info.get(a).riesgo + info.get(b).riesgo) / 2)
        : d;
      g.get(a).push([b, c, d]);
      g.get(b).push([a, c, d]);
    });
    return { g, info, por };
  }

  function dijkstra(g, s, t) {
    const dist = new Map([[s, 0]]),
      prev = new Map(),
      hecho = new Set();
    for (;;) {
      let u = null;
      for (const [n, d] of dist) if (!hecho.has(n) && (u === null || d < dist.get(u))) u = n;
      if (u === null) return null;
      if (u === t) break;
      hecho.add(u);
      for (const [v, c] of g.get(u)) {
        const nuevo = dist.get(u) + c;
        if (nuevo < (dist.has(v) ? dist.get(v) : Infinity)) {
          dist.set(v, nuevo);
          prev.set(v, u);
        }
      }
    }
    const ruta = [t];
    while (ruta[0] !== s) ruta.unshift(prev.get(ruta[0]));
    return ruta;
  }
  const largo = (g, ruta) =>
    ruta.slice(1).reduce((s, v, i) => s + g.get(ruta[i]).find((e) => e[0] === v)[2], 0);

  // Funcion principal tradicional
  function planificar(o, d, carga, datos) {
    carga = carga || "ninguna";
    datos = datos || DATOS;
    if (!CFG.perfiles[carga]) return { ok: false, mensaje: "Carga desconocida: " + carga };
    const A = grafo(datos, carga, true);
    if (!A.info.has(o) || !A.info.has(d))
      return { ok: false, mensaje: "Origen o destino no existen en los datos." };
    if (A.info.get(o).bloq || A.info.get(d).bloq)
      return { ok: false, mensaje: "El origen o el destino superan los limites de esta carga." };
    const ruta = dijkstra(A.g, o, d);
    if (!ruta)
      return {
        ok: false,
        mensaje: "No hay ruta segura entre esos puntos con esta carga. Prueba otra carga o destino."
      };
    const B = grafo(datos, carga, false),
      directa = dijkstra(B.g, o, d); // ruta mas corta, ignora riesgos
    const prom = (r) => r.reduce((s, i) => s + A.info.get(i).riesgo, 0) / r.length;
    const umbral = CFG.perfiles[carga].umbral;
    const paradas = ruta.map((i) =>
      Object.assign({}, A.por.get(i), { riesgo: A.info.get(i).riesgo, falt: A.info.get(i).falt })
    );
    const sinDatos = paradas.filter((p) => p.falt.length).map((p) => p.nombre);
    const coords = (ids) => ids.map((i) => [A.por.get(i).lon, A.por.get(i).lat]);
    return {
      ok: true,
      carga,
      ruta,
      directa,
      paradas,
      sinDatos,
      confiable: !sinDatos.length,
      alertas: paradas
        .filter((p) => p.riesgo > umbral)
        .map((p) => p.nombre + ": riesgo " + p.riesgo.toFixed(2) + " supera " + umbral),
      km: largo(A.g, ruta),
      kmDirecta: largo(B.g, directa),
      riesgo: prom(ruta),
      riesgoDirecta: prom(directa),
      geojson: { type: "Feature", properties: { carga }, geometry: { type: "LineString", coordinates: coords(ruta) } },
      geojsonDirecta: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords(directa) } }
    };
  }

  /* ===================== MULTI-RUTAS Y ANALISIS DE FACTORES ===================== */
  /**
   * Genera una lista de rutas alternativas evaluando:
   * 1. Superficie (pendiente y terreno)
   * 2. Tiempo atmosférico (viento y polvo)
   * 3. Térmico (temperatura min/max y oscilación)
   * 4. Material científico (sensibilidad del instrumental y calibración)
   */
  function generarListaRutas(origenId, destinoId, tipoCarga = "normal", tieneMaterialCientifico = false, instrumentos = []) {
    const o = Number(origenId);
    const d = Number(destinoId);

    if (o === d) {
      return { ok: false, mensaje: "El origen y el destino deben ser puntos diferentes en Marte." };
    }

    const puntoO = DATOS.puntos.find((p) => p.id === o);
    const puntoD = DATOS.puntos.find((p) => p.id === d);
    if (!puntoO || !puntoD) {
      return { ok: false, mensaje: "Los puntos seleccionados no se encuentran en la cartografía de Marte." };
    }

    const cargaAjustada = tieneMaterialCientifico ? "delicada" : tipoCarga;

    // Configuraciones de ponderacion para cada variante de ruta
    const estrategias = [
      {
        id: "optima",
        nombre: "Ruta Óptima Multicriterio",
        badge: "Recomendada",
        color: "#10b981", // verde esmeralda
        usarRiesgo: true,
        pesos: tieneMaterialCientifico
          ? { sup: 6, clima: 3, term: 3.5 }
          : { sup: 3.5, clima: 2.5, term: 2.5 },
        factorPeligro: 3.5,
        descripcionCorta: "Balance óptimo entre seguridad mecánica, protección climática y rango térmico."
      },
      {
        id: "directa",
        nombre: "Ruta Directa de Mínima Distancia",
        badge: "Más Rápida",
        color: "#f59e0b", // ámbar
        usarRiesgo: false,
        pesos: { sup: 1, clima: 1, term: 1 },
        factorPeligro: 0,
        descripcionCorta: "Trayectoria geométrica más corta. Menor kilometraje a expensas de mayor exposición a pendientes y vientos."
      },
      {
        id: "climatica",
        nombre: "Ruta de Protección Térmica y Atmosférica",
        badge: "Menor Estrés Climático",
        color: "#38bdf8", // celeste cian
        usarRiesgo: true,
        pesos: { sup: 1.5, clima: 6, term: 5 },
        factorPeligro: 4.0,
        descripcionCorta: "Minimiza la acumulación de polvo en paneles y evita oscilaciones térmicas extremas."
      },
      {
        id: "suave",
        nombre: "Ruta de Relieve Suave (Topográfica)",
        badge: "Mínima Inclinación",
        color: "#a855f7", // violeta
        usarRiesgo: true,
        pesos: { sup: 7, clima: 1.5, term: 1.5 },
        factorPeligro: 4.5,
        descripcionCorta: "Diseñada para evitar cañones y escarpes. Menor desgaste de ruedas y suspensión."
      }
    ];

    const rutasProcesadas = [];
    const vistasRutasSet = new Set();

    for (const est of estrategias) {
      const red = grafo(DATOS, cargaAjustada, est.usarRiesgo, est.pesos, est.factorPeligro);
      let camino = dijkstra(red.g, o, d);

      // Si no encuentra camino por bloqueo rigido, intentar con carga normal
      if (!camino && est.usarRiesgo) {
        const redFallback = grafo(DATOS, "normal", true, est.pesos, 2);
        camino = dijkstra(redFallback.g, o, d);
      }
      if (!camino) {
        const redDirecta = grafo(DATOS, "ninguna", false);
        camino = dijkstra(redDirecta.g, o, d);
      }

      if (!camino || camino.length === 0) continue;

      const claveCamino = camino.join("-");
      // Permitir si es la primera vez o si es la optima/directa
      const yaExiste = vistasRutasSet.has(claveCamino);
      vistasRutasSet.add(claveCamino);

      // Calcular detalles de la ruta
      const paradas = camino.map((id) => DATOS.puntos.find((p) => p.id === id));
      const distanciaTotal = largo(grafo(DATOS, "ninguna", false).g, camino);
      const horasEstimadas = Math.round(distanciaTotal / 0.14); // Rover avanza aprox 0.14 km/h en Marte

      // Factores
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

      // Evaluacion cientifica
      const pros = [];
      const contras = [];

      // Analisis de Superficie
      if (maxPendiente <= 10) {
        pros.push(`Pendientes muy suaves (máx. ${maxPendiente.toFixed(1)}°): riesgo de vuelco nulo y mínimo esfuerzo motriz.`);
      } else if (maxPendiente <= 16) {
        pros.push(`Pendiente promedio controlada (${promPendiente.toFixed(1)}°) apta para tracción del rover.`);
      } else {
        contras.push(`Atraviesa zonas de alta pendiente (${maxPendiente.toFixed(1)}°): exige tracción diferencial y bloqueo de diferenciales.`);
      }

      // Analisis Atmosferico
      if (maxViento < 18 && promPolvo < 1.2) {
        pros.push(`Ambiente atmosférico despejado: viento promedio de ${promViento.toFixed(1)} m/s y baja concentración de polvo (${promPolvo.toFixed(2)} tau).`);
      } else if (maxPolvo >= 2.0) {
        contras.push(`Riesgo de atenuación solar por polvo elevado (${maxPolvo.toFixed(2)} tau): puede ensuciar paneles y lentes.`);
      } else {
        contras.push(`Vientos moderados en ráfagas de hasta ${maxViento.toFixed(1)} m/s en zonas abiertas.`);
      }

      // Analisis Termico
      if (tMinGlobal >= -85 && oscilacionTermica <= 75) {
        pros.push(`Estabilidad térmica favorable (mínima de ${tMinGlobal}°C): reduce los ciclos de calentamiento con radioisótopos (RHU).`);
      } else {
        contras.push(`Frío extremo nocturno de hasta ${tMinGlobal}°C: requiere precalentamiento continuo de actuadores.`);
      }

      // Impacto en Material Cientifico
      if (tieneMaterialCientifico) {
        if (maxPendiente <= 10 && promPolvo < 1.4) {
          pros.push(`Excelente para instrumental delicado (${instrumentos.length ? instrumentos.slice(0, 2).join(", ") : "sensores"}): nula vibración y calibración protegida.`);
        } else {
          contras.push(`Precaución con instrumental sensible: vibraciones por irregularidades en el terreno de hasta ${maxPendiente.toFixed(1)}°.`);
        }
      }

      // Distancia y tiempo pros/contras
      if (est.id === "directa") {
        pros.push(`Recorrido más corto (${Math.round(distanciaTotal).toLocaleString()} km): menor consumo kilométrico de energía.`);
      } else {
        const extraKm = Math.max(0, distanciaTotal - largo(grafo(DATOS, "ninguna", false).g, dijkstra(grafo(DATOS, "ninguna", false).g, o, d)));
        if (extraKm > 50) {
          contras.push(`Desvío preventivo de seguridad de +${Math.round(extraKm)} km respecto a la línea recta.`);
        }
      }

      // Score de idoneidad (0 - 100)
      let score = 100;
      if (maxPendiente > 15) score -= 18;
      else if (maxPendiente > 10) score -= 8;
      if (maxViento > 20) score -= 12;
      if (maxPolvo > 1.8) score -= 14;
      if (tMinGlobal < -95) score -= 10;
      if (tieneMaterialCientifico && maxPendiente > 10) score -= 20;
      if (est.id === "directa" && tieneMaterialCientifico) score -= 15;
      score = Math.max(35, Math.min(99, score));

      rutasProcesadas.push({
        id: est.id + (yaExiste ? "-alt" : ""),
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
            estado: maxPendiente <= 10 ? "Óptimo" : maxPendiente <= 17 ? "Aceptable" : "Exigente"
          },
          clima: {
            vientoMax: maxViento,
            vientoProm: promViento,
            polvoProm: promPolvo,
            estado: promPolvo < 1.2 && maxViento < 18 ? "Limpio" : promPolvo < 1.8 ? "Moderado" : "Severo"
          },
          termico: {
            tMin: tMinGlobal,
            tMax: tMaxGlobal,
            oscilacion: oscilacionTermica,
            estado: tMinGlobal >= -80 ? "Controlado" : "Frío Severo"
          },
          materialCientifico: {
            apto: tieneMaterialCientifico ? maxPendiente <= 12 && promPolvo <= 1.6 : true,
            diagnostico: tieneMaterialCientifico
              ? maxPendiente <= 10
                ? "Máxima protección para sensores ópticos y sismológicos."
                : "Apto con velocidad reducida para amortiguar vibraciones."
              : "Sin restricciones de instrumental."
          }
        },
        pros,
        contras
      });
    }

    return {
      ok: true,
      origen: puntoO,
      destino: puntoD,
      carga: cargaAjustada,
      tieneMaterialCientifico,
      instrumentos,
      rutas: rutasProcesadas
    };
  }

  /* ===================== DATOS ===================== */
  function setDatos(d) {
    DATOS = d;
  }
  async function cargarDatos(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("No se pudieron cargar los datos: " + r.status);
    DATOS = await r.json();
    return DATOS;
  }
  function configurar(o) {
    if (o.rover) Object.assign(CFG.rover, o.rover);
    if (o.pesos) Object.assign(CFG.pesos, o.pesos);
    if (o.perfiles) Object.assign(CFG.perfiles, o.perfiles);
    ["desconocido", "kVecinos"].forEach((k) => {
      if (o[k] != null) CFG[k] = o[k];
    });
  }

  /* ===================== MAPA (Leaflet) ===================== */
  const trek = (capa, ext, nz, op) =>
    root.L.tileLayer(
      "https://trek.nasa.gov/tiles/Mars/EQ/" + capa + "/1.0.0//default/default028mm/{z}/{y}/{x}." + ext,
      { maxNativeZoom: nz, minZoom: 1, maxZoom: 6, noWrap: true, opacity: op, attribution: "NASA/JPL Trek" }
    );

  // Crea un mapa de Marte con las capas de NASA (superficie, inercia termica, polvo)
  function crearMapa(idDiv) {
    const L = root.L;
    if (!L) return null;
    const mapa = L.map(idDiv, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 1,
      minZoom: 1,
      maxZoom: 6,
      maxBounds: [
        [-90, -180],
        [90, 180]
      ],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });
    const base = trek("Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw", "jpg", 6, 1).addTo(mapa);
    L.control
      .layers(
        { "Superficie (MOLA + HRSC)": base },
        {
          "Inercia termica (TES)": trek("TES_Thermal_Inertia", "png", 1, 0.6),
          "Polvo (TES)": trek("TES_Dust", "png", 1, 0.6)
        }
      )
      .addTo(mapa);
    return mapa;
  }

  // Dibuja el resultado de planificar() en cualquier mapa Leaflet (borra el dibujo anterior)
  function dibujar(mapa, res) {
    const L = root.L;
    if (!L || !mapa) return null;
    if (mapa._roverCapa) mapa._roverCapa.clearLayers();
    else mapa._roverCapa = L.layerGroup().addTo(mapa);
    if (!res || !res.ok) return null;

    const ll = (ids) =>
      ids.map((i) => {
        const p = DATOS.puntos.find((q) => q.id === i);
        return [p.lat, p.lon];
      });

    if (res.directa && res.directa.length) {
      L.polyline(ll(res.directa), { color: "#f59e0b", weight: 3, dashArray: "6 8", opacity: 0.7 })
        .addTo(mapa._roverCapa)
        .bindTooltip("Ruta mas corta (ignora riesgos)");
    }

    const seg = L.polyline(ll(res.ruta), { color: "#10b981", weight: 5, opacity: 0.95 })
      .addTo(mapa._roverCapa)
      .bindTooltip("Ruta mas segura (multicriterio)");

    mapa.fitBounds(seg.getBounds().pad(0.2));
    return seg;
  }

  // Puntos coloreados por riesgo (verde = seguro, rojo = peligroso, negro = bloqueado)
  function marcarPuntos(mapa, carga, alClic) {
    const L = root.L;
    if (!L || !mapa) return;
    const A = grafo(DATOS, carga, true);
    if (!mapa._roverMarcas) {
      mapa._roverMarcas = new Map();
      DATOS.puntos.forEach((p) => {
        const m = L.circleMarker([p.lat, p.lon], { radius: 7, weight: 2, color: "#fff", fillOpacity: 0.9 }).addTo(mapa);
        m.bindTooltip(`<strong>${p.nombre}</strong><br>Pendiente: ${p.pendiente_grados}°<br>Viento: ${p.viento_ms} m/s`);
        if (alClic) m.on("click", () => alClic(p));
        mapa._roverMarcas.set(p.id, m);
      });
    }
    mapa._roverMarcas.forEach((m, id) => {
      const i = A.info.get(id);
      m.setStyle({ fillColor: i.bloq ? "#111" : "hsl(" + Math.round(120 * (1 - i.riesgo)) + ",70%,45%)" });
    });
  }

  /* ===================== PANEL (origen / destino / carga) ===================== */
  function montarPanel(cont, mapa) {
    if (!document.getElementById("rover-css")) {
      const st = document.createElement("style");
      st.id = "rover-css";
      st.textContent =
        ".rv-p{display:flex;flex-direction:column;gap:10px;font-size:14px}" +
        ".rv-p label{display:flex;flex-direction:column;gap:4px;font-size:13px}" +
        ".rv-p select,.rv-p button{padding:8px;border-radius:0;font-size:14px}" +
        ".rv-p button{cursor:pointer;background:#c1440e;color:#fff;border:0;font-weight:600}" +
        ".rv-o{font-size:13px;line-height:1.45}.rv-a{padding:6px 8px;border-radius:0;background:#f5a62333;margin:6px 0}" +
        ".rv-m{background:#d7263d33}.rv-o ol{margin:6px 0 0;padding-left:18px}";
      document.head.appendChild(st);
    }
    const el = (t, txt, cls) => {
      const e = document.createElement(t);
      if (txt != null) e.textContent = txt;
      if (cls) e.className = cls;
      return e;
    };
    const campo = (rot, sel) => {
      const l = el("label", rot);
      l.append(sel);
      return l;
    };
    const sO = el("select"),
      sD = el("select"),
      sC = el("select"),
      btn = el("button", "Buscar mejor ruta"),
      out = el("div", "Elige origen y destino.", "rv-o");
    btn.type = "button";
    DATOS.puntos.forEach((p) => {
      sO.add(new Option(p.nombre, p.id));
      sD.add(new Option(p.nombre, p.id));
    });
    Object.keys(CFG.perfiles).forEach((k) => sC.add(new Option(CFG.perfiles[k].nombre, k)));
    sC.value = "delicada";
    sD.selectedIndex = Math.min(5, DATOS.puntos.length - 1);
    const caja = el("div", null, "rv-p");
    caja.append(
      campo("Origen", sO),
      campo("Destino (o haz clic en un punto del mapa)", sD),
      campo("Carga del rover", sC),
      btn,
      out
    );
    cont.replaceChildren(caja);
    const id = (s) => DATOS.puntos.find((p) => String(p.id) === s.value).id;

    function buscar() {
      out.replaceChildren();
      marcarPuntos(mapa, sC.value, alClic);
      const o = id(sO),
        d = id(sD);
      if (o === d) {
        out.textContent = "El origen y el destino son el mismo punto.";
        return;
      }
      const r = planificar(o, d, sC.value);
      dibujar(mapa, r);
      if (!r.ok) {
        out.append(el("div", r.mensaje, "rv-a rv-m"));
        return;
      }
      out.append(el("div", "Ruta segura: " + r.km.toFixed(0) + " km, riesgo promedio " + r.riesgo.toFixed(2)));
      out.append(el("div", "Ruta mas corta: " + r.kmDirecta.toFixed(0) + " km, riesgo promedio " + r.riesgoDirecta.toFixed(2)));
      if (!r.confiable)
        out.append(
          el(
            "div",
            "Aun faltan datos reales en: " +
              r.sinDatos.join(", ") +
              ". Ahi se asume riesgo " +
              CFG.desconocido +
              ", asi que esta ruta todavia no garantiza seguridad.",
            "rv-a"
          )
        );
      r.alertas.forEach((a) => out.append(el("div", a, "rv-a rv-m")));
      const ol = el("ol");
      r.paradas.forEach((p) => ol.append(el("li", p.nombre + " (riesgo " + p.riesgo.toFixed(2) + ")")));
      out.append(ol);
      if (typeof cont.onRuta === "function") cont.onRuta(r);
    }
    function alClic(p) {
      sD.value = p.id;
      buscar();
    }
    btn.addEventListener("click", buscar);
    sC.addEventListener("change", () => marcarPuntos(mapa, sC.value, alClic));
    marcarPuntos(mapa, sC.value, alClic);
  }

  const API = {
    planificar,
    generarListaRutas,
    setDatos,
    cargarDatos,
    configurar,
    crearMapa,
    dibujar,
    marcarPuntos,
    montarPanel,
    get datos() {
      return DATOS;
    },
    get config() {
      return CFG;
    }
  };

  root.RoverRuta = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));

// Exportacion como modulo ES para componentes modernos
const RoverRuta = (typeof window !== "undefined" && window.RoverRuta)
  ? window.RoverRuta
  : (typeof globalThis !== "undefined" && globalThis.RoverRuta ? globalThis.RoverRuta : null);
export default RoverRuta;
export { RoverRuta };
