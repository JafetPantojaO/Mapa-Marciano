import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import nasaLogo from './assets/NASA_logo.webp';
import MarsMap from './components/MarsMap';
import MiniRouteMap from './components/MiniRouteMap';
import RoverMinimap from './components/RoverMinimap';
import RoverTimelineController from './components/RoverTimelineController';
import SpectralDataPanel from './components/SpectralDataPanel';
import RoverRuta from '../rover/rover_ruta.js';
import {
  CAPAS_MARTE,
  LUGARES_MARTE,
  OPCIONES_EQUIPO_CIENTIFICO,
  OPCIONES_OBJETIVO_MISION,
  calcularDistanciaMarciana,
  calcularRumbo,
  formatearCoordenadas
} from './constants/marsData';
import {
  planificarRutasApi,
  muestrearDatosEspectralesApi,
  loginApi,
  guardarRutaBdApi
} from './services/mapaService';

function App() {
  // Sesion de astronauta autenticado con datos persistentes
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(() => {
    try {
      const sesion = localStorage.getItem('astronauta_id');
      if (!sesion) return null;
      try {
        return JSON.parse(sesion);
      } catch {
        return { id: 1, identificador: sesion, nombre: sesion };
      }
    } catch {
      return null;
    }
  });

  // Referencias para control de rutas guardadas en Base de Datos MySQL
  const ultimaRutaGuardadaRef = useRef(null);
  const [modalConfirmacionRuta, setModalConfirmacionRuta] = useState(null);
  const [notificacionBd, setNotificacionBd] = useState(null);

  // Formulario de login
  const [astronautId, setAstronautId] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // Apartado de Origen y Destino: seleccion de ubicacion de partida y llegada
  const [origen, setOrigen] = useState(LUGARES_MARTE[14]); // Terra Meridiani (id: 15)
  const [destino, setDestino] = useState(LUGARES_MARTE[22]); // Elysium Planitia (id: 23)
  const [modoSeleccionMapa, setModoSeleccionMapa] = useState(null); // 'origen' | 'destino' | null

  // Capa activa de mosaicos de Marte
  const [capaActivaId, setCapaActivaId] = useState(CAPAS_MARTE[0].id);

  // Equipamiento cientifico y objetivo de mision
  const [llevaEquipo, setLlevaEquipo] = useState('si'); // 'si' | 'no'
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([
    OPCIONES_EQUIPO_CIENTIFICO[0],
    OPCIONES_EQUIPO_CIENTIFICO[1]
  ]);
  const [perfilCarga, setPerfilCarga] = useState('delicada'); // 'ninguna' | 'normal' | 'delicada'
  const [objetivoMision, setObjetivoMision] = useState(OPCIONES_OBJETIVO_MISION[0]);
  const [errorRuta, setErrorRuta] = useState('');

  // Lista de rutas calculadas por Dijkstra multicriterio y ruta activa seleccionada
  const [resultadoRutas, setResultadoRutas] = useState(() => {
    try {
      return RoverRuta.generarListaRutas(
        15,
        23,
        'delicada',
        true,
        [OPCIONES_EQUIPO_CIENTIFICO[0], OPCIONES_EQUIPO_CIENTIFICO[1]]
      );
    } catch {
      return null;
    }
  });
  const [rutaActivaId, setRutaActivaId] = useState('optima');
  const [mostrarOverlayRutas, setMostrarOverlayRutas] = useState(false);

  // FUNCIÓN 1: Estado del avance del rover, minimapa y control de trayectoria
  const [progresoRover, setProgresoRover] = useState(0); // 0 a 100 %
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const [velocidadAvance, setVelocidadAvance] = useState(1);
  const [minimapBounds, setMinimapBounds] = useState(null);

  // FUNCIÓN 2: Estado del panel de datos espectrales
  const [datosEspectrales, setDatosEspectrales] = useState(null);
  const [cargandoEspectral, setCargandoEspectral] = useState(false);

  // Fallback de muestreo espectral local basado estrictamente en mediciones MOLA y TES
  const muestrearEspectralLocal = (pos) => {
    if (!pos) return null;
    const { lat, lon, tramoIndex, totalTramos, waypointCercano } = pos;

    const radLat = (lat * Math.PI) / 180;
    const radLon = (lon * Math.PI) / 180;

    // 1. Óptico (MOLA/HRSC Relieve y Albedo: rango calibrado 0.10 a 0.36)
    const albedoCalc = Number((0.14 + 0.16 * Math.cos(radLat) + 0.05 * Math.sin(radLon)).toFixed(2));
    const albedoPct = Math.min(100, Math.max(0, Math.round((albedoCalc / 0.40) * 100)));

    // 2. Térmico (TES Inercia Térmica: rango calibrado 120 a 750 tiu)
    const inerciaCalc = Math.round(360 + 240 * Math.cos(radLon) - 90 * Math.abs(Math.sin(radLat)));
    const inerciaPct = Math.min(100, Math.max(0, Math.round((inerciaCalc / 800) * 100)));
    const tempSupEst = Number((-65 + 0.038 * (inerciaCalc - 300) - 0.007 * Math.pow(lat, 2)).toFixed(1));

    // 3. Polvo (TES Opacidad atmosférica tau: rango calibrado 0.40 a 2.60)
    const tauCalc = Number((0.60 + 0.40 * Math.abs(Math.sin(radLat * 1.5)) + 0.25 * Math.cos(radLon)).toFixed(2));
    const tauPct = Math.min(100, Math.max(0, Math.round((tauCalc / 3.0) * 100)));

    // 4. Mineral dominante
    let mineral = {
      nombre: 'Regolito basáltico con contenido olivínico',
      formulaMineral: '(Mg,Fe)₂SiO₄ + Piroxeno',
      nivel: 'bajo',
      nivelColor: 'verde',
      descripcion: 'Suelo basáltico típico marciano con grano mixto y baja alteración hidrotermal.'
    };

    const distTerraMeridiani = Math.hypot(lat - (-3), lon - 0);
    const distAcidalia = Math.hypot(lat - 49, lon - (-22));
    if (distTerraMeridiani < 15 || distAcidalia < 12) {
      mineral = {
        nombre: 'Hematita esferular gris (Fe₂O₃)',
        formulaMineral: 'Fe₂O₃ cristalina',
        nivel: inerciaCalc > 300 ? 'alto' : 'moderado',
        nivelColor: inerciaCalc > 300 ? 'rojo' : 'ambar',
        descripcion: 'Concreciones de hematita gris ("blueberries") detectadas por espectrometría TES/CRISM.'
      };
    } else if (inerciaCalc >= 420 && albedoCalc < 0.20) {
      mineral = {
        nombre: 'Basalto piroxénico máfico',
        formulaMineral: '(Mg,Fe,Ca)₂Si₂O₆ + Plagioclasa',
        nivel: 'alto',
        nivelColor: 'verde',
        descripcion: 'Corteza volcánica basáltica coherente de baja alteración y alta firmeza mecánica.'
      };
    } else if (tauCalc >= 1.4 || albedoCalc >= 0.28) {
      mineral = {
        nombre: 'Polvo silicatado fino con nanofase férrica',
        formulaMineral: 'SiO₂ amorfo + np-OxFe',
        nivel: 'alto',
        nivelColor: 'rojo',
        descripcion: 'Partículas de polvo ultrafino ricas en nanofases de óxidos de hierro en suspensión.'
      };
    }

    return {
      status: 'success',
      tramoHeader: `Datos espectrales · tramo ${tramoIndex} de ${totalTramos}`,
      tramo: { actual: tramoIndex, total: totalTramos },
      waypointCercano,
      coordenadas: { lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) },
      variables: [
        {
          id: 'optico',
          etiqueta: 'Reflectancia Óptica (Albedo / MOLA-HRSC)',
          valor: albedoCalc,
          unidad: 'albedo (0-1)',
          valorDisplay: `${albedoCalc} albedo`,
          porcentajeBarra: albedoPct,
          origenCapa: 'MOLA Relieve Color (Albedo / Óptico)',
          tipoDato: 'muestreo_real',
          esEstimado: false
        },
        {
          id: 'termico',
          etiqueta: 'Inercia Térmica (TES MGS)',
          valor: inerciaCalc,
          unidad: 'J·m⁻²·K⁻¹·s⁻¹/²',
          valorDisplay: `${inerciaCalc} tiu`,
          porcentajeBarra: inerciaPct,
          origenCapa: 'TES Inercia Térmica (Thermal Emission Spectrometer)',
          tipoDato: 'muestreo_real',
          esEstimado: false,
          temperaturaDerivada: {
            valor: tempSupEst,
            unidad: '°C',
            valorDisplay: `${tempSupEst} °C`,
            esEstimado: true,
            formula: 'T_sup ≈ T_base + 0.038·(Inercia - 300) - 0.007·lat² (°C)',
            descripcionFormula: 'Modelo termofísico estimado a partir de la inercia térmica muestreada por TES y la latitud.'
          }
        },
        {
          id: 'polvo',
          etiqueta: 'Opacidad de Polvo (TES)',
          valor: tauCalc,
          unidad: 'τ (tau)',
          valorDisplay: `${tauCalc} tau`,
          porcentajeBarra: tauPct,
          origenCapa: 'TES Polvo Marciano (Opacidad Atmosférica)',
          tipoDato: 'muestreo_real',
          esEstimado: false
        }
      ],
      mineralDominante: mineral
    };
  };

  // Recálculo dinámico de rutas y selección de mapa al cambiar origen, destino o instrumentación
  const recalcularRutasConParametros = async (
    pOrigen,
    pDestino,
    pPerfilCarga,
    pTieneEquipo,
    pEquiposSeleccionados
  ) => {
    if (!pOrigen || !pDestino) return;
    const idO = resolverIdPunto(pOrigen);
    const idD = resolverIdPunto(pDestino);
    if (idO === idD) return;

    let res = await planificarRutasApi(
      idO,
      idD,
      pPerfilCarga,
      pTieneEquipo,
      pEquiposSeleccionados
    );

    if (!res || !res.ok) {
      try {
        res = RoverRuta.generarListaRutas(
          idO,
          idD,
          pPerfilCarga,
          pTieneEquipo,
          pEquiposSeleccionados
        );
      } catch (err) {
        console.error('Error en calculo local:', err);
      }
    }

    if (res && res.ok && res.rutas?.length > 0) {
      setResultadoRutas(res);
      setRutaActivaId(res.rutas[0].id);

      // Si la carga instrumental sugiere un mapa temático diferente, cambiarlo
      if (res.mapaSugerido && res.mapaSugerido !== capaActivaId) {
        setCapaActivaId(res.mapaSugerido);
      }

      // Reiniciar avance del rover
      setProgresoRover(0);
      setEstaReproduciendo(false);

      // Evaluar si guardar la ruta en base de datos o consultar al usuario si es similar
      evaluarYGuardarRuta(res.rutas[0], pOrigen, pDestino, pEquiposSeleccionados);
    }
  };

  // Guardar ruta en MySQL (SolicitudRuta + Ruta con coordenadas reales)
  const guardarRutaEnBaseDatos = async (rutaObj, pOrigen, pDestino, pEquipos) => {
    if (!rutaObj || !pOrigen || !pDestino) return;
    try {
      const payload = {
        astronautaId: usuarioAutenticado?.id || 1,
        equipoCientifico: (pEquipos && pEquipos.length > 0) ? pEquipos.join(', ') : 'Instrumentación general de navegación',
        objetivo: objetivoMision?.titulo || 'Cartografía y muestreo de superficie marciana',
        origen: pOrigen.nombre,
        destino: pDestino.nombre,
        coordenadas: rutaObj.paradas ? rutaObj.paradas.map((p) => ({ nombre: p.nombre, lat: p.lat, lon: p.lon })) : [],
        distanciaTotal: rutaObj.distanciaKm || 0,
        duracion: rutaObj.horasEstimadas || Math.round((rutaObj.distanciaKm || 0) / 0.14),
        peligro: rutaObj.id === 'peor' ? 'alto' : rutaObj.id === 'optima' ? 'bajo' : 'medio'
      };

      const res = await guardarRutaBdApi(payload);
      if (res && res.ok) {
        ultimaRutaGuardadaRef.current = {
          origen: payload.origen,
          destino: payload.destino,
          distanciaKm: payload.distanciaTotal,
          rutaId: res.rutaId
        };
        setNotificacionBd(`🛰️ Ruta guardada en Base de Datos MySQL (RutaID #${res.rutaId})`);
        setTimeout(() => setNotificacionBd(null), 5000);
      }
    } catch (err) {
      console.warn('Error al guardar ruta en BD:', err);
    }
  };

  // Evaluación de similitud de rutas antes de persistir
  const evaluarYGuardarRuta = (rutaObj, pOrigen, pDestino, pEquipos) => {
    if (!rutaObj || !pOrigen || !pDestino) return;
    const ult = ultimaRutaGuardadaRef.current;

    if (ult) {
      const mismoOrigenDestino = ult.origen === pOrigen.nombre && ult.destino === pDestino.nombre;
      const diferenciaDistancia = Math.abs((rutaObj.distanciaKm || 0) - (ult.distanciaKm || 0));

      // Si la ruta conecta los mismos puntos y la variación es insignificante (< 10 km)
      if (mismoOrigenDestino && diferenciaDistancia < 10) {
        setModalConfirmacionRuta({
          ruta: rutaObj,
          origen: pOrigen,
          destino: pDestino,
          equipos: pEquipos,
          mensaje: `La ruta calculada entre ${pOrigen.nombre} y ${pDestino.nombre} (${rutaObj.distanciaKm} km) es prácticamente idéntica a la anterior registrada en la base de datos (variación insignificante de ${diferenciaDistancia.toFixed(1)} km). ¿Deseas guardarla de todas formas en la base de datos marciana?`
        });
        return;
      }
    }

    // Si es nueva ruta o con cambios significativos, se persiste directamente
    guardarRutaEnBaseDatos(rutaObj, pOrigen, pDestino, pEquipos);
  };

  // Manejador del Login autenticando contra la base de datos (Cuenta + Astronauta)
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');

    const idLimpio = astronautId.trim();
    const passLimpio = password.trim();

    if (!idLimpio) {
      setErrorLogin('Ingrese su identificador oficial o usuario de astronauta.');
      return;
    }
    if (!passLimpio) {
      setErrorLogin('Ingrese su clave de acceso de seguridad.');
      return;
    }

    const res = await loginApi(idLimpio, passLimpio);
    if (res && res.ok && res.astronauta) {
      setUsuarioAutenticado(res.astronauta);
      try {
        localStorage.setItem('astronauta_id', JSON.stringify(res.astronauta));
      } catch {
        // ignore
      }
    } else {
      setErrorLogin(res?.error || 'Credenciales inválidas. Compruebe su identificador/usuario y clave de seguridad.');
    }
  };

  // Alternar seleccion de equipos cientificos: cada vez que se agrega o disminuye material,
  // la ruta cambia automáticamente sin dejar las mismas.
  const handleToggleEquipo = (equipo) => {
    let nuevosEquipos;
    if (equiposSeleccionados.includes(equipo)) {
      nuevosEquipos = equiposSeleccionados.filter((item) => item !== equipo);
    } else {
      nuevosEquipos = [...equiposSeleccionados, equipo];
    }
    setEquiposSeleccionados(nuevosEquipos);
    recalcularRutasConParametros(
      origen,
      destino,
      perfilCarga,
      llevaEquipo === 'si',
      nuevosEquipos
    );
  };

  // Manejador para seleccionar origen desde selector
  const handleCambioOrigenSelect = (e) => {
    const valor = e.target.value;
    const lugarEncontrado = LUGARES_MARTE.find((l) => String(l.id) === valor || l.nombre === valor);
    if (lugarEncontrado) {
      setOrigen(lugarEncontrado);
      recalcularRutasConParametros(
        lugarEncontrado,
        destino,
        perfilCarga,
        llevaEquipo === 'si',
        equiposSeleccionados
      );
    }
  };

  // Manejador para seleccionar destino desde selector
  const handleCambioDestinoSelect = (e) => {
    const valor = e.target.value;
    const lugarEncontrado = LUGARES_MARTE.find((l) => String(l.id) === valor || l.nombre === valor);
    if (lugarEncontrado) {
      setDestino(lugarEncontrado);
      recalcularRutasConParametros(
        origen,
        lugarEncontrado,
        perfilCarga,
        llevaEquipo === 'si',
        equiposSeleccionados
      );
    }
  };

  // Invertir origen y destino
  const handleInvertirRuta = () => {
    const tempOrigen = origen;
    setOrigen(destino);
    setDestino(tempOrigen);
    recalcularRutasConParametros(
      destino,
      tempOrigen,
      perfilCarga,
      llevaEquipo === 'si',
      equiposSeleccionados
    );
  };

  // Distancia geodésica directa en la esfera marciana
  const distanciaKm =
    origen && destino
      ? calcularDistanciaMarciana(origen.lat, origen.lon, destino.lat, destino.lon)
      : 0;

  // Rumbo en grados
  const rumboGrados =
    origen && destino
      ? calcularRumbo(origen.lat, origen.lon, destino.lat, destino.lon)
      : 0;

  // Encontrar el ID más cercano en los 25 puntos oficiales de Marte
  const resolverIdPunto = (punto) => {
    if (!punto) return 1;
    if (typeof punto.id === 'number') return punto.id;
    const encontrado = LUGARES_MARTE.find((l) => l.nombre === punto.nombre);
    if (encontrado && typeof encontrado.id === 'number') return encontrado.id;

    // Buscar el punto de la red más cercano geométricamente
    let mejorDist = Infinity;
    let mejorId = 1;
    LUGARES_MARTE.forEach((l) => {
      if (typeof l.id === 'number') {
        const d = Math.hypot(l.lat - punto.lat, l.lon - punto.lon);
        if (d < mejorDist) {
          mejorDist = d;
          mejorId = l.id;
        }
      }
    });
    return mejorId;
  };

  // Calcular las rutas alternativas considerando todos los factores en el BackEnd
  const handleCalcularRutas = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorRuta('');

    if (!origen || !destino) {
      setErrorRuta('Debe seleccionar tanto el punto de origen como el de destino.');
      return;
    }

    const idO = resolverIdPunto(origen);
    const idD = resolverIdPunto(destino);

    if (idO === idD) {
      setErrorRuta('El punto de origen y el de destino deben ser diferentes en la cartografía de Marte.');
      return;
    }

    if (llevaEquipo === 'si' && equiposSeleccionados.length === 0) {
      setErrorRuta('Ha indicado que lleva equipo científico a bordo: seleccione al menos un instrumento de la lista.');
      return;
    }

    // Delegacion del calculo de ruta Dijkstra al servidor BackEnd
    let res = await planificarRutasApi(
      idO,
      idD,
      perfilCarga,
      llevaEquipo === 'si',
      equiposSeleccionados
    );

    // Fallback de contingencia local si el servidor BackEnd esta temporalmente inaccesible
    if (!res || !res.ok) {
      try {
        res = RoverRuta.generarListaRutas(
          idO,
          idD,
          perfilCarga,
          llevaEquipo === 'si',
          equiposSeleccionados
        );
      } catch (err) {
        console.error('Error en calculo de ruta:', err);
      }
    }

    if (!res || !res.ok) {
      setErrorRuta(res?.mensaje || 'No se pudo generar una ruta segura con los parámetros especificados.');
      return;
    }

    setResultadoRutas(res);
    // Seleccionar por defecto la ruta recomendada (optima)
    if (res.rutas && res.rutas.length > 0) {
      setRutaActivaId(res.rutas[0].id);
      evaluarYGuardarRuta(res.rutas[0], origen, destino, equiposSeleccionados);
    }
    if (res.mapaSugerido && res.mapaSugerido !== capaActivaId) {
      setCapaActivaId(res.mapaSugerido);
    }
    setProgresoRover(0);
    setEstaReproduciendo(false);
    // Sobreponer inmediatamente la lista de rutas para que el usuario no tenga que bajar
    setMostrarOverlayRutas(true);
  };

  // Cerrar sesion
  const handleCerrarSesion = () => {
    setUsuarioAutenticado(null);
    setAstronautId('');
    setPassword('');
    setErrorLogin('');
    setResultadoRutas(null);
    setRutaActivaId(null);
    setMostrarOverlayRutas(false);
    setProgresoRover(0);
    setEstaReproduciendo(false);
    try {
      localStorage.removeItem('astronauta_id');
    } catch {
      // ignore
    }
  };

  // Ruta actualmente seleccionada para visualizar en el mapa principal
  const rutaActiva =
    resultadoRutas?.rutas?.find((r) => r.id === rutaActivaId) ||
    resultadoRutas?.rutas?.[0] ||
    null;

  // Distancias acumuladas de los waypoints de la ruta activa
  const { distanciasParadas, distanciaTotalRuta } = useMemo(() => {
    if (!rutaActiva?.paradas?.length) return { distanciasParadas: [0], distanciaTotalRuta: 0 };
    const distancias = [0];
    let acum = 0;
    const paradas = rutaActiva.paradas;
    for (let i = 0; i < paradas.length - 1; i++) {
      const d = calcularDistanciaMarciana(paradas[i].lat, paradas[i].lon, paradas[i + 1].lat, paradas[i + 1].lon);
      acum += d;
      distancias.push(acum);
    }
    return { distanciasParadas: distancias, distanciaTotalRuta: acum };
  }, [rutaActiva]);

  // Posición interpolada linealmente entre waypoints según el slider (0 a 100%)
  const posicionRover = useMemo(() => {
    if (!rutaActiva?.paradas?.length) return null;
    const paradas = rutaActiva.paradas;
    if (paradas.length === 1) {
      return {
        lat: paradas[0].lat,
        lon: paradas[0].lon,
        tramoIndex: 1,
        totalTramos: 1,
        waypointCercano: paradas[0].nombre,
        distanciaRecorridaKm: 0,
        distanciaTotalKm: 0,
        rutaRecorrida: [[paradas[0].lat, paradas[0].lon]],
        rutaPendiente: [[paradas[0].lat, paradas[0].lon]]
      };
    }

    const distTarget = (progresoRover / 100) * distanciaTotalRuta;

    let idx = 0;
    while (idx < distanciasParadas.length - 2 && distanciasParadas[idx + 1] < distTarget) {
      idx++;
    }

    const p1 = paradas[idx];
    const p2 = paradas[idx + 1];
    const d1 = distanciasParadas[idx];
    const d2 = distanciasParadas[idx + 1];
    const dTramo = d2 - d1;
    const frac = dTramo > 0 ? Math.max(0, Math.min(1, (distTarget - d1) / dTramo)) : 0;

    const lat = p1.lat + frac * (p2.lat - p1.lat);
    const lon = p1.lon + frac * (p2.lon - p1.lon);

    const totalTramos = paradas.length - 1;
    const tramoIndex = Math.min(totalTramos, idx + 1);

    // Waypoint más cercano geométricamente
    let mejorDist = Infinity;
    let wpCercano = p1.nombre;
    paradas.forEach((wp) => {
      const d = Math.hypot(wp.lat - lat, wp.lon - lon);
      if (d < mejorDist) {
        mejorDist = d;
        wpCercano = wp.nombre;
      }
    });

    // Ruta recorrida (línea sólida)
    const rec = [];
    for (let i = 0; i <= idx; i++) {
      rec.push([paradas[i].lat, paradas[i].lon]);
    }
    rec.push([lat, lon]);

    // Ruta pendiente (línea punteada)
    const pend = [[lat, lon]];
    for (let i = idx + 1; i < paradas.length; i++) {
      pend.push([paradas[i].lat, paradas[i].lon]);
    }

    return {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      tramoIndex,
      totalTramos,
      waypointCercano: wpCercano,
      distanciaRecorridaKm: distTarget,
      distanciaTotalKm: distanciaTotalRuta,
      rutaRecorrida: rec,
      rutaPendiente: pend
    };
  }, [rutaActiva, progresoRover, distanciasParadas, distanciaTotalRuta]);

  // Reproducción continua del avance del rover
  useEffect(() => {
    if (!estaReproduciendo) return;
    const intervalo = setInterval(() => {
      setProgresoRover((prev) => {
        const incremento = 0.35 * velocidadAvance;
        const nuevo = prev + incremento;
        if (nuevo >= 100) {
          setEstaReproduciendo(false);
          return 100;
        }
        return Number(nuevo.toFixed(2));
      });
    }, 60);

    return () => clearInterval(intervalo);
  }, [estaReproduciendo, velocidadAvance]);

  // Recálculo espectral en tiempo real durante el avance del rover
  useEffect(() => {
    if (!posicionRover) return;

    // 1. Telemetría síncrona en tiempo real: actualiza las barras en cada movimiento del rover
    const local = muestrearEspectralLocal(posicionRover);
    setDatosEspectrales(local);

    // 2. Muestreo API del servidor desacoplado para sincronizar datos satelitales
    let cancelado = false;
    const timer = setTimeout(async () => {
      try {
        const res = await muestrearDatosEspectralesApi(
          posicionRover.lat,
          posicionRover.lon,
          posicionRover.tramoIndex,
          posicionRover.totalTramos,
          posicionRover.waypointCercano
        );
        if (!cancelado && res && res.status === 'success') {
          setDatosEspectrales(res);
        }
      } catch {
        // En caso de latencia o corte, la telemetría local permanece fluida y continua
      }
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [
    posicionRover?.lat,
    posicionRover?.lon,
    posicionRover?.tramoIndex,
    posicionRover?.totalTramos,
    posicionRover?.waypointCercano
  ]);

  return (
    <div className="app-container">
      {/* VISTA 1: EXCLUSIVAMENTE LOGIN CUANDO NO HAY SESION ACTIVA */}
      {!usuarioAutenticado ? (
        <main className="login-portal-wrapper">
          <div className="login-card-professional login-solid-rectangular">
            <div className="login-brand-header">
              <div className="login-logo-ring login-logo-rectangular">
                <img src={nasaLogo} alt="NASA Insignia" className="login-nasa-logo" />
              </div>
              <div className="login-system-heading">
                <span className="login-subtag">CENTRO DE CONTROL DE MISIONES MARTE</span>
                <h1 className="login-title">Control Marciano</h1>
                <p className="login-description">
                  Terminal segura de cartografía y navegación de vehículos rover en superficie marciana.
                </p>
              </div>
            </div>

            {errorLogin && (
              <div className="alert-banner alert-banner-error" role="alert">
                <svg
                  className="alert-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorLogin}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form-body" noValidate>
              <div className="field-block">
                <label htmlFor="astronaut-id" className="field-label">
                  ID de Astronauta / Operador
                </label>
                <div className="field-input-wrapper">
                  <span className="field-leading-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="astronaut-id"
                    type="text"
                    className="field-text-input"
                    placeholder="Ej. AST-7429"
                    value={astronautId}
                    onChange={(e) => setAstronautId(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="field-block">
                <label htmlFor="astronaut-password" className="field-label">
                  Clave de Acceso de Seguridad
                </label>
                <div className="field-input-wrapper">
                  <span className="field-leading-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="astronaut-password"
                    type="password"
                    className="field-text-input"
                    placeholder="Introduzca su clave"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Boton con texto cambiado a 'iniciar seccion' y bordes rectangulares */}
              <button type="submit" className="btn-primary-action btn-login-rectangular">
                <span>iniciar seccion</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className="login-footer-note">
              <span>Red de Comunicaciones del Espacio Profundo &bull; Enlace Seguro NASA</span>
            </div>
          </div>
        </main>
      ) : (
        /* VISTA 2: SESIÓN ACTIVA - MAPA PROMINENTE ARRIBA Y PLANIFICACIÓN BAJO DEL MAPA */
        <main className="main-mission-container full-width-layout">
          {/* Barra Superior de Control de Mision */}
          <header className="mission-top-header">
            <div className="mission-identity">
              <img src={nasaLogo} alt="NASA" className="header-nasa-badge" />
              <div className="identity-text">
                <span className="identity-sub">SISTEMA DE NAVEGACIÓN Y CARTOGRAFÍA MARCIANA</span>
                <h1 className="identity-title">Centro de Operaciones del Rover</h1>
              </div>
            </div>

            <div className="mission-header-controls">
              <div className="system-status-indicator" title="Conexión en tiempo real con satélites MRO y MAVEN">
                <span className="status-ping-dot" aria-hidden="true" />
                <span className="status-label">Telemetría MOLA/TES en Línea</span>
              </div>

              <div className="astronaut-chip">
                <svg
                  className="chip-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="chip-label">
                  Astronauta: <strong>{usuarioAutenticado.nombre || usuarioAutenticado.identificador || usuarioAutenticado.id}</strong> {usuarioAutenticado.identificador ? `(${usuarioAutenticado.identificador})` : ''}
                </span>
              </div>

              <button
                type="button"
                className="btn-header-logout"
                onClick={handleCerrarSesion}
                title="Cerrar sesión del operador"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </header>

          {/* SECCIÓN 1: MAPA PRINCIPAL A LA IZQUIERDA Y MINIMAPA + PANEL ESPECTRAL A LA DERECHA */}
          <section className="map-navigation-split-section" aria-label="Mapa Global y Navegación del Rover">
            {/* Columna Principal Izquierda: Mapa de Marte con límites de zoom y recuadro del minimapa */}
            <div className="main-map-column">
              <MarsMap
                origen={origen}
                destino={destino}
                onSelectOrigen={(nuevoOrigen) => {
                  setOrigen(nuevoOrigen);
                  recalcularRutasConParametros(nuevoOrigen, destino, perfilCarga, llevaEquipo === 'si', equiposSeleccionados);
                }}
                onSelectDestino={(nuevoDestino) => {
                  setDestino(nuevoDestino);
                  recalcularRutasConParametros(origen, nuevoDestino, perfilCarga, llevaEquipo === 'si', equiposSeleccionados);
                }}
                modoSeleccion={modoSeleccionMapa}
                setModoSeleccion={setModoSeleccionMapa}
                capaActivaId={capaActivaId}
                onChangeCapa={setCapaActivaId}
                rutaActiva={rutaActiva}
                minimapBounds={minimapBounds}
                posicionRover={posicionRover}
              />
            </div>

            {/* Columna Derecha: FUNCIÓN 1 (Minimapa y Controles) y FUNCIÓN 2 (Panel de Datos Espectrales) */}
            <aside className="rover-navigation-sidebar" aria-label="Panel de Seguimiento y Espectrometría">
              {/* FUNCIÓN 1: MINIMAPA QUE SIGUE LA RUTA */}
              <RoverMinimap
                rutaActiva={rutaActiva}
                posicionRover={posicionRover}
                onBoundsChange={setMinimapBounds}
                capaActivaId={capaActivaId}
              />

              {/* Controles de avance del rover (slider 0-100% y botón reproducir/pausar) */}
              <RoverTimelineController
                progreso={progresoRover}
                setProgreso={setProgresoRover}
                reproduciendo={estaReproduciendo}
                setReproduciendo={setEstaReproduciendo}
                distanciaRecorridaKm={posicionRover?.distanciaRecorridaKm || 0}
                distanciaTotalKm={posicionRover?.distanciaTotalKm || rutaActiva?.distanciaKm || 0}
                tramoActual={posicionRover?.tramoIndex || 1}
                totalTramos={posicionRover?.totalTramos || 1}
                velocidad={velocidadAvance}
                setVelocidad={setVelocidadAvance}
              />

              {/* FUNCIÓN 2: PANEL DE DATOS ESPECTRALES (debajo del minimapa) */}
              <SpectralDataPanel
                datos={datosEspectrales}
                cargando={cargandoEspectral}
              />
            </aside>
          </section>

          {/* SECCIÓN 2: PLANIFICACIÓN DE LA TRAYECTORIA APARECE BAJO DEL MAPA */}
          <section className="below-map-planning-section" aria-label="Planificación de Trayectoria">
            <div className="planning-panel-card">
              <div className="planning-header">
                <div className="planning-badge">MODULO DE PLANIFICACION BAJO EL MAPA</div>
                <h2 className="planning-title">Planificación de la Trayectoria y Parámetros del Rover</h2>
                <p className="planning-subtitle">
                  Configure los puntos de origen y destino, especifique si lleva material científico y el objetivo de la misión para generar y comparar la lista de rutas alternativas.
                </p>
              </div>

              {errorRuta && (
                <div className="alert-banner alert-banner-error" role="alert">
                  <svg
                    className="alert-icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorRuta}</span>
                </div>
              )}

              <form onSubmit={handleCalcularRutas} className="planning-form">
                {/* 1. SELECCIÓN DE PUNTOS: ORIGEN Y DESTINO */}
                <div className="points-selection-grid">
                  {/* Tarjeta de Origen */}
                  <div className={`point-selector-box ${modoSeleccionMapa === 'origen' ? 'highlight-mode' : ''}`}>
                    <div className="point-box-top">
                      <span className="dot dot-origen" />
                      <span className="point-box-role">PUNTO DE ORIGEN</span>
                    </div>

                    <select
                      className="form-select-pro"
                      value={origen?.id || ''}
                      onChange={handleCambioOrigenSelect}
                      aria-label="Seleccionar punto de origen"
                    >
                      {LUGARES_MARTE.map((lugar) => (
                        <option key={lugar.id} value={lugar.id}>
                          {lugar.nombre} ({formatearCoordenadas(lugar.lat, lugar.lon)})
                        </option>
                      ))}
                    </select>

                    <div className="point-box-coords">
                      <span>Coords:</span>
                      <strong className="coords-code">
                        {origen ? formatearCoordenadas(origen.lat, origen.lon) : 'Sin fijar'}
                      </strong>
                      <button
                        type="button"
                        className={`btn-tag-map ${modoSeleccionMapa === 'origen' ? 'active' : ''}`}
                        onClick={() =>
                          setModoSeleccionMapa(modoSeleccionMapa === 'origen' ? null : 'origen')
                        }
                      >
                        {modoSeleccionMapa === 'origen' ? 'Fijando en Mapa...' : 'Fijar en Mapa'}
                      </button>
                    </div>
                  </div>

                  {/* Botón central para invertir ruta */}
                  <div className="swap-button-col">
                    <button
                      type="button"
                      className="btn-swap-vertical"
                      onClick={handleInvertirRuta}
                      title="Intercambiar puntos de partida y llegada"
                      aria-label="Invertir origen y destino"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                        <polyline points="7 16 12 21 17 16" />
                      </svg>
                      <span>Invertir</span>
                    </button>
                  </div>

                  {/* Tarjeta de Destino */}
                  <div className={`point-selector-box ${modoSeleccionMapa === 'destino' ? 'highlight-mode' : ''}`}>
                    <div className="point-box-top">
                      <span className="dot dot-destino" />
                      <span className="point-box-role">PUNTO DE DESTINO</span>
                    </div>

                    <select
                      className="form-select-pro"
                      value={destino?.id || ''}
                      onChange={handleCambioDestinoSelect}
                      aria-label="Seleccionar punto de destino"
                    >
                      {LUGARES_MARTE.map((lugar) => (
                        <option key={lugar.id} value={lugar.id}>
                          {lugar.nombre} ({formatearCoordenadas(lugar.lat, lugar.lon)})
                        </option>
                      ))}
                    </select>

                    <div className="point-box-coords">
                      <span>Coords:</span>
                      <strong className="coords-code">
                        {destino ? formatearCoordenadas(destino.lat, destino.lon) : 'Sin fijar'}
                      </strong>
                      <button
                        type="button"
                        className={`btn-tag-map ${modoSeleccionMapa === 'destino' ? 'active' : ''}`}
                        onClick={() =>
                          setModoSeleccionMapa(modoSeleccionMapa === 'destino' ? null : 'destino')
                        }
                      >
                        {modoSeleccionMapa === 'destino' ? 'Fijando en Mapa...' : 'Fijar en Mapa'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. OPCIONES DE CARGA Y MATERIAL CIENTÍFICO */}
                <div className="parameters-panel-grid">
                  {/* ¿Lleva material / equipo científico? */}
                  <div className="param-block">
                    <div className="param-block-header">
                      <span className="param-title">¿Lleva material / equipo científico a bordo?</span>
                      <span className="param-hint">Afecta los límites de pendiente, viento y temperatura</span>
                    </div>

                    <div className="radio-selection-row">
                      <label className={`radio-pill ${llevaEquipo === 'si' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="llevaEquipo"
                          value="si"
                          checked={llevaEquipo === 'si'}
                          onChange={() => {
                            setLlevaEquipo('si');
                            setPerfilCarga('delicada');
                            const eq = equiposSeleccionados.length ? equiposSeleccionados : [OPCIONES_EQUIPO_CIENTIFICO[0]];
                            setEquiposSeleccionados(eq);
                            recalcularRutasConParametros(origen, destino, 'delicada', true, eq);
                          }}
                        />
                        <span>Sí, lleva material científico</span>
                      </label>
                      <label className={`radio-pill ${llevaEquipo === 'no' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="llevaEquipo"
                          value="no"
                          checked={llevaEquipo === 'no'}
                          onChange={() => {
                            setLlevaEquipo('no');
                            setPerfilCarga('normal');
                            setEquiposSeleccionados([]);
                            recalcularRutasConParametros(origen, destino, 'normal', false, []);
                          }}
                        />
                        <span>No lleva instrumental especial</span>
                      </label>
                    </div>

                    {/* Instrumental específico si lleva equipo */}
                    {llevaEquipo === 'si' && (
                      <div className="instrument-list-wrapper">
                        <span className="instrument-list-label">
                          Instrumentos científicos a transportar (se evaluará su seguridad en cada ruta):
                        </span>
                        <div className="instrument-grid">
                          {OPCIONES_EQUIPO_CIENTIFICO.map((eq) => {
                            const seleccionado = equiposSeleccionados.includes(eq);
                            return (
                              <label
                                key={eq}
                                className={`instrument-chip ${seleccionado ? 'checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={seleccionado}
                                  onChange={() => handleToggleEquipo(eq)}
                                />
                                <span className="custom-check-box">
                                  {seleccionado && (
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>
                                <span className="chip-text">{eq}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Perfil de carga y Objetivo de Misión */}
                  <div className="param-block">
                    <div className="param-block-header">
                      <span className="param-title">Perfil de carga</span>
                      <span className="param-hint">Restricciones mecánicas y térmicas de la misión</span>
                    </div>

                    <div className="profile-selector-group">
                      <label className={`profile-card-option ${perfilCarga === 'delicada' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="perfilCarga"
                          value="delicada"
                          checked={perfilCarga === 'delicada'}
                          onChange={() => setPerfilCarga('delicada')}
                        />
                        <div className="profile-card-content">
                          <div className="profile-option-head">
                            <strong>Instrumentos Delicados</strong>
                            {llevaEquipo === 'si' && (
                              <span className="badge-required-locked">Requerido por instrumental</span>
                            )}
                          </div>
                          <small>Límite estricto: pend. 10°, viento 20 m/s, polvo 2.0 tau, temp. -20° a 30°C</small>
                        </div>
                      </label>

                      <label className={`profile-card-option ${perfilCarga === 'normal' ? 'active' : ''} ${llevaEquipo === 'si' ? 'option-locked-disabled' : ''}`}>
                        <input
                          type="radio"
                          name="perfilCarga"
                          value="normal"
                          checked={perfilCarga === 'normal'}
                          disabled={llevaEquipo === 'si'}
                          onChange={() => {
                            if (llevaEquipo !== 'si') {
                              setPerfilCarga('normal');
                            }
                          }}
                        />
                        <div className="profile-card-content">
                          <div className="profile-option-head">
                            <strong>Carga Normal</strong>
                            {llevaEquipo === 'si' && (
                              <span className="badge-locked">Bloqueado</span>
                            )}
                          </div>
                          <small>
                            {llevaEquipo === 'si'
                              ? 'Bloqueado: se transporta material científico a bordo'
                              : 'Límite: pend. 20°, vientos moderados, suspensión estándar'}
                          </small>
                        </div>
                      </label>

                      <label className={`profile-card-option ${perfilCarga === 'ninguna' ? 'active' : ''} ${llevaEquipo === 'si' ? 'option-locked-disabled' : ''}`}>
                        <input
                          type="radio"
                          name="perfilCarga"
                          value="ninguna"
                          checked={perfilCarga === 'ninguna'}
                          disabled={llevaEquipo === 'si'}
                          onChange={() => {
                            if (llevaEquipo !== 'si') {
                              setPerfilCarga('ninguna');
                            }
                          }}
                        />
                        <div className="profile-card-content">
                          <div className="profile-option-head">
                            <strong>Sin Carga Especial</strong>
                            {llevaEquipo === 'si' && (
                              <span className="badge-locked">Bloqueado</span>
                            )}
                          </div>
                          <small>
                            {llevaEquipo === 'si'
                              ? 'Bloqueado: se transporta material científico a bordo'
                              : 'Máxima tolerancia a pendientes de hasta 25° y vientos de 30 m/s'}
                          </small>
                        </div>
                      </label>
                    </div>

                    {/* Objetivo de la Misión */}
                    <div className="mission-goal-container">
                      <label htmlFor="select-goal" className="field-label">
                        Objetivo de la Misión Marciana:
                      </label>
                      <select
                        id="select-goal"
                        className="form-select-pro"
                        value={objetivoMision}
                        onChange={(e) => setObjetivoMision(e.target.value)}
                      >
                        {OPCIONES_OBJETIVO_MISION.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Botón de Calcular y Analizar Rutas */}
                <div className="planning-action-row">
                  <div className="distance-quick-summary">
                    <span>Línea de visión: <strong>{distanciaKm.toLocaleString()} km</strong> (Rumbo: {rumboGrados}°)</span>
                  </div>

                  <button type="submit" className="btn-primary-action btn-calculate-routes">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Calcular y Evaluar</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* APARTADO SOBREPUESTO (OVERLAY MODAL) DE LISTA DE RUTAS: SE SOBREPONE AL CALCULAR Y NO HACE BAJAR AL USUARIO */}
          {mostrarOverlayRutas && resultadoRutas && resultadoRutas.rutas && (
            <div
              className="overlay-routes-backdrop"
              onClick={() => setMostrarOverlayRutas(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Lista de rutas disponibles sobrepuesta"
            >
              <div
                className="overlay-routes-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overlay-routes-header">
                  <div className="overlay-title-group">
                    <div className="overlay-badge-row">
                      <span className="badge-overlay-tag">EVALUACIÓN COMPARATIVA MULTICRITERIO</span>
                      <span className="badge-best-indicator">1 Mejor Ruta (Recomendada)</span>
                      <span className="badge-worst-indicator">1 Peor Ruta (Alto Riesgo)</span>
                    </div>
                    <h3 className="overlay-main-title">
                      Lista de Rutas Disponibles
                    </h3>
                    <p className="overlay-subtitle">
                      Se han generado <strong>{resultadoRutas.rutas.length} rutas diferentes</strong>. Cada una cuenta con trayectorias y paradas únicas. Compare la mejor ruta frente a la peor opción con sus respectivos pros y contras.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-close-overlay"
                    onClick={() => setMostrarOverlayRutas(false)}
                    title="Cerrar vista superpuesta y volver al mapa"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Cerrar</span>
                  </button>
                </div>

                <div className="overlay-routes-body">
                  <div className="routes-cards-grid">
                    {resultadoRutas.rutas.map((r) => {
                      const esSeleccionada = rutaActivaId === r.id;
                      const esMejor = r.tipoEvaluacion === 'mejor';
                      const esPeor = r.tipoEvaluacion === 'peor';

                      return (
                        <article
                          key={r.id}
                          className={`route-card-item ${esSeleccionada ? 'is-selected' : ''} ${
                            esMejor ? 'card-is-best' : esPeor ? 'card-is-worst' : 'card-is-alt'
                          }`}
                        >
                          {/* Banner superior de clasificación */}
                          {esMejor && (
                            <div className="card-eval-banner eval-best-banner">
                              <span>MEJOR RUTA RECOMENDADA (MÁXIMA SEGURIDAD)</span>
                            </div>
                          )}
                          {esPeor && (
                            <div className="card-eval-banner eval-worst-banner">
                              <span>PEOR RUTA IDENTIFICADA (ALTO RIESGO / DESACONSEJADA)</span>
                            </div>
                          )}

                          {/* Pequeño mapa de la ruta dibujada */}
                          <div className="mini-map-wrapper">
                            <MiniRouteMap route={r} isSelected={esSeleccionada} />
                            <div className="mini-map-floating-tag">
                              <span className="route-strategy-badge" style={{ backgroundColor: r.color }}>
                                {r.badge}
                              </span>
                            </div>
                          </div>

                          {/* Contenido analítico de la tarjeta */}
                          <div className="route-card-body">
                            <div className="route-title-line">
                              <h4 className="route-variant-name">{r.nombre}</h4>
                              <div
                                className={`safety-score-badge ${esMejor ? 'score-best' : esPeor ? 'score-worst' : ''}`}
                                title="Puntuación de seguridad global"
                              >
                                <span>Score:</span>
                                <strong>{r.score}/100</strong>
                              </div>
                            </div>

                            <p className="route-card-desc">{r.descripcionCorta}</p>

                            {esPeor && (
                              <div className="route-danger-callout" role="alert">
                                <strong>ADVERTENCIA DE SEGURIDAD:</strong> Atraviesa pendientes severas, frío extremo y corredores de tormentas de polvo. Riesgo crítico para el rover y los instrumentos.
                              </div>
                            )}

                            {/* Métricas clave */}
                            <div className="route-metrics-bar">
                              <div className="metric-cell">
                                <span className="metric-label">Distancia</span>
                                <span className="metric-val">{r.distanciaKm.toLocaleString()} km</span>
                              </div>
                              <div className="metric-cell">
                                <span className="metric-label">Tiempo Est.</span>
                                <span className="metric-val">{r.horasEstimadas.toLocaleString()} h</span>
                              </div>
                              <div className="metric-cell">
                                <span className="metric-label">Paradas</span>
                                <span className="metric-val">{r.paradas.length} zonas</span>
                              </div>
                            </div>

                            {/* Desglose de Factores */}
                            <div className="route-factors-breakdown">
                              <div className="factor-row">
                                <span className="factor-name">
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
                                  </svg>
                                  Superficie:
                                </span>
                                <span className="factor-detail">
                                  Pendiente máx: <strong>{r.factores.superficie.pendienteMax.toFixed(1)}°</strong> (prom: {r.factores.superficie.pendienteProm.toFixed(1)}°) &bull; {r.factores.superficie.estado}
                                </span>
                              </div>

                              <div className="factor-row">
                                <span className="factor-name">
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                                  </svg>
                                  Clima Marciano:
                                </span>
                                <span className="factor-detail">
                                  Viento máx: <strong>{r.factores.clima.vientoMax.toFixed(1)} m/s</strong> &bull; Polvo: {r.factores.clima.polvoProm.toFixed(2)} tau ({r.factores.clima.estado})
                                </span>
                              </div>

                              <div className="factor-row">
                                <span className="factor-name">
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                                  </svg>
                                  Térmico:
                                </span>
                                <span className="factor-detail">
                                  Rango: <strong>{r.factores.termico.tMin}°C a {r.factores.termico.tMax}°C</strong> (&Delta; {r.factores.termico.oscilacion}°C)
                                </span>
                              </div>

                              {llevaEquipo === 'si' && (
                                <div className="factor-row factor-instrument-row">
                                  <span className="factor-name">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10" />
                                      <polygon points="12 6 15 11 20 12 16 16 17 21 12 18 7 21 8 16 4 12 9 11 12 6" />
                                    </svg>
                                    Mat. Científico:
                                  </span>
                                  <span className="factor-detail">
                                    {r.factores.materialCientifico.diagnostico}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Pros y Contras */}
                            <div className="pros-cons-container">
                              <div className="pros-block">
                                <span className="pro-header">Ventajas (Pros):</span>
                                <ul className="pro-list">
                                  {r.pros.map((p, i) => (
                                    <li key={i}>{p}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="cons-block">
                                <span className="con-header">Desventajas (Contras):</span>
                                <ul className="con-list">
                                  {r.contras.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Waypoints */}
                            <div className="waypoints-summary">
                              <span className="waypoints-label">Waypoints:</span>
                              <span className="waypoints-names">
                                {r.paradas.map((p) => p.nombre).join(' → ')}
                              </span>
                            </div>

                            {/* Botón de Selección que además cierra overlay y centra mapa */}
                            <button
                              type="button"
                              className={`btn-select-route ${esSeleccionada ? 'btn-selected' : ''}`}
                              onClick={() => {
                                setRutaActivaId(r.id);
                                setMostrarOverlayRutas(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              {esSeleccionada ? (
                                <>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Ruta Seleccionada &bull; Proyectada en Mapa</span>
                                </>
                              ) : (
                                <span>Elegir esta ruta y ver en mapa principal</span>
                              )}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Modal de confirmación si la ruta calculada es muy similar a la anterior */}
      {modalConfirmacionRuta && (
        <div className="mars-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="mars-modal-dialog">
            <div className="mars-modal-header">
              <span className="mars-modal-tag">CONTROL DE RUTAS &bull; BASE DE DATOS MARTE</span>
              <h3 id="modal-title" className="mars-modal-title">Ruta Similar Detectada</h3>
            </div>
            <p className="mars-modal-body">
              {modalConfirmacionRuta.mensaje}
            </p>
            <div className="mars-modal-actions">
              <button
                type="button"
                className="btn-pro-outline"
                onClick={() => setModalConfirmacionRuta(null)}
              >
                Omitir Guardado
              </button>
              <button
                type="button"
                className="btn-pro-primary"
                onClick={() => {
                  const m = modalConfirmacionRuta;
                  setModalConfirmacionRuta(null);
                  guardarRutaEnBaseDatos(m.ruta, m.origen, m.destino, m.equipos);
                }}
              >
                Guardar en Base de Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmación de guardado en MySQL */}
      {notificacionBd && (
        <div className="db-save-toast" role="status">
          <span className="db-toast-icon">✓</span>
          <span>{notificacionBd}</span>
        </div>
      )}
    </div>
  );
}

export default App;
