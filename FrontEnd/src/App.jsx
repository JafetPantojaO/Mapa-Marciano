import { useState } from 'react';
import './App.css';
import nasaLogo from './assets/NASA_logo.webp';
import MarsMap from './components/MarsMap';
import {
  CAPAS_MARTE,
  LUGARES_MARTE,
  OPCIONES_EQUIPO_CIENTIFICO,
  OPCIONES_OBJETIVO_MISION,
  calcularDistanciaMarciana,
  calcularRumbo,
  formatearCoordenadas
} from './constants/marsData';

function App() {
  // Sesion de astronauta autenticado (en localStorage / memoria)
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

  // Apartado de Origen y Destino: seleccion de ubicacion actual y punto de destino
  const [origen, setOrigen] = useState(LUGARES_MARTE[0]); // Base Central Marte
  const [destino, setDestino] = useState(LUGARES_MARTE[1]); // Crater Jezero
  const [modoSeleccionMapa, setModoSeleccionMapa] = useState(null); // 'origen' | 'destino' | null

  // Capa activa de mosaicos de Marte
  const [capaActivaId, setCapaActivaId] = useState(CAPAS_MARTE[0].id);

  // Equipamiento cientifico y objetivo de mision
  const [llevaEquipo, setLlevaEquipo] = useState('no'); // 'si' | 'no'
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [objetivoMision, setObjetivoMision] = useState(OPCIONES_OBJETIVO_MISION[0]);
  const [errorRuta, setErrorRuta] = useState('');

  // Estado de confirmacion de ruta activa
  const [misionRegistrada, setMisionRegistrada] = useState(null);

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

  // Manejador para seleccionar origen desde selector o presets
  const handleCambioOrigenSelect = (e) => {
    const lugarEncontrado = LUGARES_MARTE.find((l) => l.nombre === e.target.value);
    if (lugarEncontrado) {
      setOrigen(lugarEncontrado);
      setMisionRegistrada(null);
    }
  };

  // Manejador para seleccionar destino desde selector o presets
  const handleCambioDestinoSelect = (e) => {
    const lugarEncontrado = LUGARES_MARTE.find((l) => l.nombre === e.target.value);
    if (lugarEncontrado) {
      setDestino(lugarEncontrado);
      setMisionRegistrada(null);
    }
  };

  // Invertir origen y destino
  const handleInvertirRuta = () => {
    const tempOrigen = origen;
    setOrigen(destino);
    setDestino(tempOrigen);
    setMisionRegistrada(null);
  };

  // Distancia calculada en la esfera marciana
  const distanciaKm =
    origen && destino
      ? calcularDistanciaMarciana(origen.lat, origen.lon, destino.lat, destino.lon)
      : 0;

  // Rumbo / Azimut en grados
  const rumboGrados =
    origen && destino
      ? calcularRumbo(origen.lat, origen.lon, destino.lat, destino.lon)
      : 0;

  // Enviar solicitud de ruta
  const handleEnviarRuta = (e) => {
    e.preventDefault();
    setErrorRuta('');

    if (!origen || !destino) {
      setErrorRuta('Debe seleccionar tanto el punto de origen como el de destino.');
      return;
    }

    if (origen.nombre === destino.nombre) {
      setErrorRuta('El punto de origen y el de destino deben ser diferentes.');
      return;
    }

    if (llevaEquipo === 'si' && equiposSeleccionados.length === 0) {
      setErrorRuta('Seleccione al menos un instrumento o equipo cientifico de la lista.');
      return;
    }

    const nuevaMision = {
      astronauta: usuarioAutenticado ? usuarioAutenticado.id : astronautId,
      origen: origen.nombre,
      origenCoords: formatearCoordenadas(origen.lat, origen.lon),
      destino: destino.nombre,
      destinoCoords: formatearCoordenadas(destino.lat, destino.lon),
      distanciaKm,
      rumboGrados,
      llevaEquipo: llevaEquipo === 'si',
      equipos: llevaEquipo === 'si' ? equiposSeleccionados : [],
      objetivo: objetivoMision
    };

    setMisionRegistrada(nuevaMision);
  };

  // Abrir solicitud en otra pestana del navegador
  const handleAbrirEnOtraPestana = () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=solicitud-ruta`;
    window.open(url, '_blank');
  };

  // Cerrar sesion
  const handleCerrarSesion = () => {
    setUsuarioAutenticado(null);
    setAstronautId('');
    setPassword('');
    setErrorLogin('');
    setMisionRegistrada(null);
    try {
      localStorage.removeItem('astronauta_id');
    } catch {
      // ignore
    }
  };

  return (
    <div className="app-container">
      {/* VISTA 1: EXCLUSIVAMENTE LOGIN CUANDO NO HAY SESION ACTIVA */}
      {!usuarioAutenticado ? (
        <main className="login-portal-wrapper">
          <div className="login-card-professional">
            <div className="login-brand-header">
              <div className="login-logo-ring">
                <img src={nasaLogo} alt="NASA Insignia" className="login-nasa-logo" />
              </div>
              <div className="login-system-heading">
                <span className="login-subtag">CENTRO DE CONTROL DE MISIONES</span>
                <h1 className="login-title">Control Marciano</h1>
                <p className="login-description">
                  Terminal de acceso a cartografia y planificacion de trayectorias en superficie.
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
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

              <button type="submit" className="btn-primary-action">
                <span>Acceder a la Mision</span>
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
        /* VISTA 2: APARTADO DE MISION ACTIVO EXCLUSIVAMENTE TRAS INICIAR SESION */
        <main className="main-mission-container">
          {/* Barra Superior de Control de Mision */}
          <header className="mission-top-header">
            <div className="mission-identity">
              <img src={nasaLogo} alt="NASA" className="header-nasa-badge" />
              <div className="identity-text">
                <span className="identity-sub">SISTEMA DE NAVEGACION MARCIANA</span>
                <h1 className="identity-title">Operaciones de Superficie</h1>
              </div>
            </div>

            <div className="mission-header-controls">
              <div className="system-status-indicator" title="Conexion establecida con telemetria de Marte">
                <span className="status-ping-dot" aria-hidden="true" />
                <span className="status-label">Telemetria en Linea</span>
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
                className="btn-header-secondary"
                onClick={handleAbrirEnOtraPestana}
                title="Abrir la consola de navegacion en otra ventana del navegador"
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
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>Nueva Ventana</span>
              </button>

              <button
                type="button"
                className="btn-header-logout"
                onClick={handleCerrarSesion}
                title="Cerrar sesion del operador y volver al portal de acceso"
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
                <span>Cerrar Sesion</span>
              </button>
            </div>
          </header>

          {/* Banner de confirmacion de mision registrada */}
          {misionRegistrada && (
            <section className="mission-success-banner" role="region" aria-label="Confirmacion de Mision">
              <div className="banner-icon-box">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="banner-details">
                <h4 className="banner-heading">Ruta registrada y fijada en cartografia</h4>
                <p className="banner-text">
                  Trayectoria desde <strong>{misionRegistrada.origen}</strong> hasta{' '}
                  <strong>{misionRegistrada.destino}</strong> ({misionRegistrada.distanciaKm.toLocaleString()} km a rumbo {misionRegistrada.rumboGrados}°).
                  {misionRegistrada.llevaEquipo
                    ? ` Equipamiento: ${misionRegistrada.equipos.join(', ')}.`
                    : ' Sin carga instrumental asignada.'}{' '}
                  Mision: <em>{misionRegistrada.objetivo}</em>.
                </p>
              </div>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setMisionRegistrada(null)}
                aria-label="Cerrar notificacion de ruta"
              >
                Cerrar
              </button>
            </section>
          )}

          {/* Cuadricula Operativa: Cartografia + Planificacion de Trayectoria */}
          <div className="mission-grid-layout">
            {/* Columna Izquierda: Cartografia de Marte con capas WMTS */}
            <section className="map-column" aria-label="Cartografia de Superficie">
              <MarsMap
                origen={origen}
                destino={destino}
                onSelectOrigen={(nuevoOrigen) => {
                  setOrigen(nuevoOrigen);
                  setMisionRegistrada(null);
                }}
                onSelectDestino={(nuevoDestino) => {
                  setDestino(nuevoDestino);
                  setMisionRegistrada(null);
                }}
                modoSeleccion={modoSeleccionMapa}
                setModoSeleccion={setModoSeleccionMapa}
                capaActivaId={capaActivaId}
                onChangeCapa={setCapaActivaId}
              />
            </section>

            {/* Columna Derecha: Consola de Configuracion de Mision */}
            <section className="form-column" aria-label="Planificacion de Ruta">
              <div className="route-card">
                <div className="route-header">
                  <div className="route-badge">MODULO DE NAVEGACION</div>
                  <h2 className="route-title">Planificacion de Trayectoria</h2>
                  <p className="route-subtitle">
                    Defina punto de origen y llegada para trazar y calcular parametros de desplazamiento.
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

                <form onSubmit={handleEnviarRuta} className="route-form">
                  {/* SELECCION ORIGEN Y DESTINO */}
                  <div className="origin-destination-section">
                    {/* Tarjeta de Origen */}
                    <div
                      className={`point-selector-card ${
                        modoSeleccionMapa === 'origen' ? 'selecting-active' : ''
                      }`}
                    >
                      <div className="point-card-header">
                        <div className="point-tag origen-tag">
                          <span className="dot dot-origen" aria-hidden="true" />
                          <span>PUNTO DE ORIGEN</span>
                        </div>
                        <span className="point-sublabel">Ubicacion de partida</span>
                      </div>

                      <div className="point-select-row">
                        <select
                          className="form-select-pro"
                          value={
                            LUGARES_MARTE.some((l) => l.nombre === origen?.nombre)
                              ? origen.nombre
                              : 'custom'
                          }
                          onChange={handleCambioOrigenSelect}
                          aria-label="Seleccionar punto de origen"
                        >
                          {LUGARES_MARTE.map((lugar) => (
                            <option key={lugar.id} value={lugar.nombre}>
                              {lugar.nombre} ({formatearCoordenadas(lugar.lat, lugar.lon)})
                            </option>
                          ))}
                          {!LUGARES_MARTE.some((l) => l.nombre === origen?.nombre) && (
                            <option value="custom">
                              [Punto Fijado] {origen ? origen.nombre : 'Ubicacion manual'}
                            </option>
                          )}
                        </select>
                      </div>

                      <div className="point-coords-bar">
                        <span className="coords-text">
                          Coords:{' '}
                          <strong className="coords-code">
                            {origen ? formatearCoordenadas(origen.lat, origen.lon) : 'Sin fijar'}
                          </strong>
                        </span>
                        <button
                          type="button"
                          className={`btn-pick-map ${
                            modoSeleccionMapa === 'origen' ? 'active' : ''
                          }`}
                          onClick={() =>
                            setModoSeleccionMapa(modoSeleccionMapa === 'origen' ? null : 'origen')
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="13"
                            height="13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{modoSeleccionMapa === 'origen' ? 'Fijando...' : 'Fijar en Mapa'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Boton de Intercambiar Origen y Destino */}
                    <div className="swap-route-container">
                      <button
                        type="button"
                        className="btn-swap-route"
                        onClick={handleInvertirRuta}
                        title="Intercambiar puntos de origen y destino"
                        aria-label="Invertir puntos de origen y destino"
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
                          <polyline points="7 10 12 15 17 10" />
                          <polyline points="17 14 12 9 7 14" />
                        </svg>
                        <span>Invertir Trayectoria</span>
                      </button>
                    </div>

                    {/* Tarjeta de Destino */}
                    <div
                      className={`point-selector-card ${
                        modoSeleccionMapa === 'destino' ? 'selecting-active' : ''
                      }`}
                    >
                      <div className="point-card-header">
                        <div className="point-tag destino-tag">
                          <span className="dot dot-destino" aria-hidden="true" />
                          <span>PUNTO DE DESTINO</span>
                        </div>
                        <span className="point-sublabel">Objetivo de llegada</span>
                      </div>

                      <div className="point-select-row">
                        <select
                          className="form-select-pro"
                          value={
                            LUGARES_MARTE.some((l) => l.nombre === destino?.nombre)
                              ? destino.nombre
                              : 'custom'
                          }
                          onChange={handleCambioDestinoSelect}
                          aria-label="Seleccionar punto de destino"
                        >
                          {LUGARES_MARTE.map((lugar) => (
                            <option key={lugar.id} value={lugar.nombre}>
                              {lugar.nombre} ({formatearCoordenadas(lugar.lat, lugar.lon)})
                            </option>
                          ))}
                          {!LUGARES_MARTE.some((l) => l.nombre === destino?.nombre) && (
                            <option value="custom">
                              [Punto Fijado] {destino ? destino.nombre : 'Ubicacion manual'}
                            </option>
                          )}
                        </select>
                      </div>

                      <div className="point-coords-bar">
                        <span className="coords-text">
                          Coords:{' '}
                          <strong className="coords-code">
                            {destino ? formatearCoordenadas(destino.lat, destino.lon) : 'Sin fijar'}
                          </strong>
                        </span>
                        <button
                          type="button"
                          className={`btn-pick-map ${
                            modoSeleccionMapa === 'destino' ? 'active' : ''
                          }`}
                          onClick={() =>
                            setModoSeleccionMapa(modoSeleccionMapa === 'destino' ? null : 'destino')
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="13"
                            height="13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                          <span>{modoSeleccionMapa === 'destino' ? 'Fijando...' : 'Fijar en Mapa'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TELEMETRIA EN TIEMPO REAL */}
                  <div className="route-telemetry-panel" aria-label="Parametros de navegacion calculados">
                    <div className="telemetry-item">
                      <span className="telemetry-label">Distancia Marciana</span>
                      <span className="telemetry-value tabular-num">
                        {distanciaKm.toLocaleString()} <span className="telemetry-unit">km</span>
                      </span>
                    </div>
                    <div className="telemetry-divider" aria-hidden="true" />
                    <div className="telemetry-item">
                      <span className="telemetry-label">Rumbo (Azimut)</span>
                      <span className="telemetry-value tabular-num">
                        {rumboGrados}<span className="telemetry-unit">°</span>
                      </span>
                    </div>
                    <div className="telemetry-divider" aria-hidden="true" />
                    <div className="telemetry-item">
                      <span className="telemetry-label">Tiempo Estimado</span>
                      <span className="telemetry-value tabular-num">
                        {distanciaKm > 0
                          ? `${Math.max(1, Math.round(distanciaKm / 0.15))}`
                          : '0'} <span className="telemetry-unit">h aprox.</span>
                      </span>
                    </div>
                  </div>

                  {/* INSTRUMENTACION Y EQUIPO CIENTIFICO */}
                  <div className="equipment-card-group">
                    <span className="form-legend-title">¿Lleva algun equipo cientifico a bordo?</span>
                    <div className="radio-selection-row" role="radiogroup">
                      <label className={`radio-pill ${llevaEquipo === 'si' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="llevaEquipo"
                          value="si"
                          checked={llevaEquipo === 'si'}
                          onChange={() => setLlevaEquipo('si')}
                        />
                        <span>Si</span>
                      </label>
                      <label className={`radio-pill ${llevaEquipo === 'no' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="llevaEquipo"
                          value="no"
                          checked={llevaEquipo === 'no'}
                          onChange={() => {
                            setLlevaEquipo('no');
                            setEquiposSeleccionados([]);
                          }}
                        />
                        <span>No</span>
                      </label>
                    </div>

                    {llevaEquipo === 'si' && (
                      <div className="checkbox-instruments-list">
                        <span className="checkbox-list-title">Especifique el instrumental cientifico:</span>
                        {OPCIONES_EQUIPO_CIENTIFICO.map((eq) => {
                          const estaMarcado = equiposSeleccionados.includes(eq);
                          return (
                            <label
                              key={eq}
                              className={`checkbox-instrument-item ${estaMarcado ? 'checked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={estaMarcado}
                                onChange={() => handleToggleEquipo(eq)}
                              />
                              <span className="checkbox-custom-box" aria-hidden="true">
                                {estaMarcado && (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="12"
                                    height="12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </span>
                              <span className="instrument-name">{eq}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* OBJETIVO DE LA MISION */}
                  <div className="mission-goal-group">
                    <span className="form-legend-title">Objetivo principal de la mision marciana</span>
                    <div className="mission-goals-list" role="radiogroup">
                      {OPCIONES_OBJETIVO_MISION.map((mision) => {
                        const seleccionada = objetivoMision === mision;
                        return (
                          <label
                            key={mision}
                            className={`mission-goal-item ${seleccionada ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="objetivoMision"
                              value={mision}
                              checked={seleccionada}
                              onChange={() => setObjetivoMision(mision)}
                            />
                            <span className="radio-custom-ring" aria-hidden="true">
                              {seleccionada && <span className="radio-custom-dot" />}
                            </span>
                            <span className="goal-label">{mision}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary-action btn-submit-route">
                    <span>Confirmar y Registrar Mision</span>
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
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </form>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
