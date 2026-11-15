import { useState, useEffect } from 'react';
import './App.css';
import nasaLogo from './assets/NASA_logo.webp';
import MarsMap from './components/MarsMap';
import MiniRouteMap from './components/MiniRouteMap';
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
  fetchCapas,
  fetchLugares
} from './services/mapaService';

function App() {
  // Sesion de astronauta autenticado
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(() => {
    try {
      const sesion = localStorage.getItem('astronauta_id');
      return sesion ? { id: sesion } : null;
    } catch {
      return null;
    }
  });

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

  // Manejador del Login
  const handleLogin = (e) => {
    e.preventDefault();
    setErrorLogin('');

    const idLimpio = astronautId.trim();
    const passLimpio = password.trim();

    if (!idLimpio) {
      setErrorLogin('Ingrese su identificador oficial de astronauta.');
      return;
    }
    if (!passLimpio) {
      setErrorLogin('Ingrese su clave de acceso de seguridad.');
      return;
    }

    const sesion = { id: idLimpio };
    setUsuarioAutenticado(sesion);
    try {
      localStorage.setItem('astronauta_id', idLimpio);
    } catch {
      // ignore
    }
  };

  // Alternar seleccion de equipos cientificos
  const handleToggleEquipo = (equipo) => {
    if (equiposSeleccionados.includes(equipo)) {
      setEquiposSeleccionados(equiposSeleccionados.filter((item) => item !== equipo));
    } else {
      setEquiposSeleccionados([...equiposSeleccionados, equipo]);
    }
  };

  // Manejador para seleccionar origen desde selector
  const handleCambioOrigenSelect = (e) => {
    const valor = e.target.value;
    const lugarEncontrado = LUGARES_MARTE.find((l) => String(l.id) === valor || l.nombre === valor);
    if (lugarEncontrado) {
      setOrigen(lugarEncontrado);
    }
  };

  // Manejador para seleccionar destino desde selector
  const handleCambioDestinoSelect = (e) => {
    const valor = e.target.value;
    const lugarEncontrado = LUGARES_MARTE.find((l) => String(l.id) === valor || l.nombre === valor);
    if (lugarEncontrado) {
      setDestino(lugarEncontrado);
    }
  };

  // Invertir origen y destino
  const handleInvertirRuta = () => {
    const tempOrigen = origen;
    setOrigen(destino);
    setDestino(tempOrigen);
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
    }
  };



  // Cerrar sesion
  const handleCerrarSesion = () => {
    setUsuarioAutenticado(null);
    setAstronautId('');
    setPassword('');
    setErrorLogin('');
    setResultadoRutas(null);
    setRutaActivaId(null);
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
                  Astronauta: <strong>{usuarioAutenticado.id}</strong>
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

          {/* SECCIÓN 1: EL USUARIO SOLO VERÁ EL MAPA (PROMINENTE, ANCHO COMPLETO CON LÍMITES DE ZOOM) */}
          <section className="map-hero-section" aria-label="Mapa Global de Superficie Marciana">
            <MarsMap
              origen={origen}
              destino={destino}
              onSelectOrigen={(nuevoOrigen) => {
                setOrigen(nuevoOrigen);
              }}
              onSelectDestino={(nuevoDestino) => {
                setDestino(nuevoDestino);
              }}
              modoSeleccion={modoSeleccionMapa}
              setModoSeleccion={setModoSeleccionMapa}
              capaActivaId={capaActivaId}
              onChangeCapa={setCapaActivaId}
              rutaActiva={rutaActiva}
            />
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

                  {/* Perfil de carga del Rover y Objetivo de Misión */}
                  <div className="param-block">
                    <div className="param-block-header">
                      <span className="param-title">Perfil de Carga del Rover</span>
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
                          <strong>Instrumentos Delicados</strong>
                          <small>Límite: pend. 10°, viento 20 m/s, polvo 2.0 tau, temp. -20° a 30°C</small>
                        </div>
                      </label>

                      <label className={`profile-card-option ${perfilCarga === 'normal' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="perfilCarga"
                          value="normal"
                          checked={perfilCarga === 'normal'}
                          onChange={() => setPerfilCarga('normal')}
                        />
                        <div className="profile-card-content">
                          <strong>Carga Normal</strong>
                          <small>Límite: pend. 20°, vientos moderados, suspensión estándar</small>
                        </div>
                      </label>

                      <label className={`profile-card-option ${perfilCarga === 'ninguna' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="perfilCarga"
                          value="ninguna"
                          checked={perfilCarga === 'ninguna'}
                          onChange={() => setPerfilCarga('ninguna')}
                        />
                        <div className="profile-card-content">
                          <strong>Sin Carga Especial</strong>
                          <small>Máxima tolerancia a pendientes de hasta 25° y vientos de 30 m/s</small>
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
                    <span>Calcular y Evaluar Rutas del Rover</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* SECCIÓN 3: LISTA DE RUTAS CON PEQUEÑOS MAPAS Y EVALUACIÓN DE FACTORES (PROS Y CONTRAS) */}
          {resultadoRutas && resultadoRutas.rutas && (
            <section className="routes-comparison-section" aria-label="Lista de Rutas Evaluadas">
              <div className="comparison-header">
                <div>
                  <span className="comparison-badge">ANÁLISIS MULTICRITERIO DE NAVEGACIÓN</span>
                  <h3 className="comparison-title">
                    Lista de Rutas Disponibles para el Rover
                  </h3>
                  <p className="comparison-subtitle">
                    Cada ruta considera los factores de <strong>Superficie</strong> (pendiente y relieve), <strong>Tiempo Atmosférico</strong> (viento y opacidad de polvo), <strong>Térmico</strong> (rango térmico diurno/nocturno) y <strong>Material Científico</strong> a bordo con sus respectivos pros y contras.
                  </p>
                </div>
                {rutaActiva && (
                  <div className="active-route-pill">
                    <span>Ruta Proyectada en Mapa:</span>
                    <strong style={{ color: rutaActiva.color }}>{rutaActiva.nombre}</strong>
                  </div>
                )}
              </div>

              {/* Grid de pequeños mapas con la ruta dibujada y pros/contras */}
              <div className="routes-cards-grid">
                {resultadoRutas.rutas.map((r) => {
                  const esSeleccionada = rutaActivaId === r.id;
                  return (
                    <article
                      key={r.id}
                      className={`route-card-item ${esSeleccionada ? 'is-selected' : ''}`}
                    >
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
                          <div className="safety-score-badge" title="Puntuación de seguridad global">
                            <span>Score:</span>
                            <strong>{r.score}/100</strong>
                          </div>
                        </div>

                        <p className="route-card-desc">{r.descripcionCorta}</p>

                        {/* Métricas clave */}
                        <div className="route-metrics-bar">
                          <div className="metric-cell">
                            <span className="metric-label">Distancia</span>
                            <span className="metric-val">{r.distanciaKm.toLocaleString()} km</span>
                          </div>
                          <div className="metric-cell">
                            <span className="metric-label">Tiempo Est.</span>
                            <span className="metric-val">{r.horasEstimadas} h</span>
                          </div>
                          <div className="metric-cell">
                            <span className="metric-label">Paradas</span>
                            <span className="metric-val">{r.paradas.length} zonas</span>
                          </div>
                        </div>

                        {/* Desglose de Factores: Superficie, Clima, Térmico, Material Científico */}
                        <div className="route-factors-breakdown">
                          {/* Superficie */}
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

                          {/* Tiempo Atmosférico */}
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

                          {/* Térmico */}
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

                          {/* Material Científico */}
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
                            {r.paradas.map((p) => p.nombre).join(' &rarr; ')}
                          </span>
                        </div>

                        {/* Botón de Selección */}
                        <button
                          type="button"
                          className={`btn-select-route ${esSeleccionada ? 'btn-selected' : ''}`}
                          onClick={() => setRutaActivaId(r.id)}
                        >
                          {esSeleccionada ? (
                            <>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Ruta Seleccionada para la Misión</span>
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
            </section>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
