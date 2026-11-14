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
  // Sesión de astronauta autenticado (en localStorage / memoria)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(() => {
    try {
      const sesion = localStorage.getItem('astronauta_id');
      return sesion ? { id: sesion } : null;
    } catch {
      return null;
    }
  });

  // Pestaña activa: solo 'login' | 'solicitud' (se eliminó la parte de resumen por solicitud)
  const [pestanaActiva, setPestanaActiva] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sesion = localStorage.getItem('astronauta_id');
      if (params.get('tab') === 'solicitud-ruta' && sesion) {
        return 'solicitud';
      }
    } catch {
      // fallback
    }
    return 'login';
  });

  // Formulario de login
  const [astronautId, setAstronautId] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // Apartado de Origen y Destino: selección de dónde está y a dónde quiere ir
  const [origen, setOrigen] = useState(LUGARES_MARTE[0]); // Base Central Marte
  const [destino, setDestino] = useState(LUGARES_MARTE[1]); // Cráter Jezero
  const [modoSeleccionMapa, setModoSeleccionMapa] = useState(null); // 'origen' | 'destino' | null

  // Capa activa de mosaicos de Marte (de los 3 enlaces provistos)
  const [capaActivaId, setCapaActivaId] = useState(CAPAS_MARTE[0].id);

  // Equipamiento científico y objetivo de misión
  const [llevaEquipo, setLlevaEquipo] = useState('no'); // 'si' | 'no'
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [objetivoMision, setObjetivoMision] = useState(OPCIONES_OBJETIVO_MISION[0]);
  const [errorRuta, setErrorRuta] = useState('');

  // Estado de confirmación de ruta activa (en la misma vista, sin pestaña resumen)
  const [misionRegistrada, setMisionRegistrada] = useState(null);

  // Manejador del Login
  const handleLogin = (e) => {
    e.preventDefault();
    setErrorLogin('');

    const idLimpio = astronautId.trim();
    const passLimpio = password.trim();

    if (!idLimpio) {
      setErrorLogin('Ingrese su ID de astronauta.');
      return;
    }
    if (!passLimpio) {
      setErrorLogin('Ingrese su contraseña.');
      return;
    }

    const sesion = { id: idLimpio };
    setUsuarioAutenticado(sesion);
    try {
      localStorage.setItem('astronauta_id', idLimpio);
    } catch {
      // ignore
    }

    setPestanaActiva('solicitud');
  };

  // Alternar selección de equipos científicos
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

  // Enviar solicitud de ruta (se procesa y muestra en la misma pantalla sin pestaña de resumen)
  const handleEnviarRuta = (e) => {
    e.preventDefault();
    setErrorRuta('');

    if (!origen || !destino) {
      setErrorRuta('Debe seleccionar tanto el punto de origen como el de destino.');
      return;
    }

    if (origen.nombre === destino.nombre) {
      setErrorRuta('El origen y el destino deben ser diferentes.');
      return;
    }

    if (llevaEquipo === 'si' && equiposSeleccionados.length === 0) {
      setErrorRuta('Seleccione al menos un equipo científico de la lista.');
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

  // Abrir solicitud en otra pestaña del navegador
  const handleAbrirEnOtraPestana = () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=solicitud-ruta`;
    window.open(url, '_blank');
  };

  // Cerrar sesión
  const handleCerrarSesion = () => {
    setUsuarioAutenticado(null);
    setAstronautId('');
    setPassword('');
    setMisionRegistrada(null);
    try {
      localStorage.removeItem('astronauta_id');
    } catch {
      // ignore
    }
    setPestanaActiva('login');
  };

  return (
    <div className="app-container">
      {/* Logo de la NASA centrado arriba en medio */}
      <div className="nasa-logo-container">
        <img src={nasaLogo} alt="NASA Logo" className="nasa-logo" />
      </div>

      {/* Pestañas de navegación (Sin pestaña de resumen) */}
      <nav className="nav-tabs" aria-label="Pestañas de Navegación">
        <button
          type="button"
          className={`tab-button ${pestanaActiva === 'login' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`tab-button ${pestanaActiva === 'solicitud' ? 'active' : ''}`}
          onClick={() => {
            if (usuarioAutenticado) {
              setPestanaActiva('solicitud');
            } else {
              setErrorLogin('Debe autenticarse primero con su ID y Contraseña.');
              setPestanaActiva('login');
            }
          }}
          disabled={!usuarioAutenticado}
        >
          Navegación y Solicitud de Ruta
        </button>

        {usuarioAutenticado && (
          <button
            type="button"
            className="tab-button-external"
            onClick={handleAbrirEnOtraPestana}
            title="Abrir en otra pestaña del navegador"
          >
            Abrir en otra pestaña
          </button>
        )}
      </nav>

      {/* PESTAÑA 1: LOGIN */}
      {pestanaActiva === 'login' && (
        <div className="login-card">
          <form onSubmit={handleLogin}>
            <div className="login-card-content">
              {/* Avatar circular con silueta de persona */}
              <div className="avatar-circle">
                <svg className="avatar-silhouette" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              {errorLogin && <div className="error-message">{errorLogin}</div>}

              {/* Input 1: ID de astronauta */}
              <div className="input-group">
                <div className="input-icon-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ID"
                  value={astronautId}
                  onChange={(e) => setAstronautId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              {/* Input 2: Contraseña */}
              <div className="input-group">
                <div className="input-icon-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </div>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="login-options-row">
                <label className="remember-label"></label>
              </div>
            </div>

            {/* Botón inferior LOGIN */}
            <div className="login-divider"></div>
            <button type="submit" className="login-submit-btn">
              LOGIN
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: NAVEGACIÓN Y SOLICITUD DE RUTA CON MAPAS DE MARTE */}
      {pestanaActiva === 'solicitud' && usuarioAutenticado && (
        <div className="main-mission-container">
          {/* Barra superior de información del Astronauta */}
          <header className="mission-user-bar">
            <div className="user-info-chip">
              <span className="user-icon">🧑‍🚀</span>
              <span className="user-id">Astronauta ID: <strong>{usuarioAutenticado.id}</strong></span>
            </div>
            <button
              type="button"
              className="btn-logout"
              onClick={handleCerrarSesion}
              title="Cerrar sesión actual"
            >
              Cerrar Sesión
            </button>
          </header>

          {/* Banner de confirmación cuando se registra la misión (reemplaza a la pestaña de resumen) */}
          {misionRegistrada && (
            <div className="mission-success-banner">
              <div className="banner-icon">✓</div>
              <div className="banner-content">
                <h4>¡Ruta registrada y trazada con éxito!</h4>
                <p>
                  Trayectoria desde <strong>{misionRegistrada.origen}</strong> hasta{' '}
                  <strong>{misionRegistrada.destino}</strong> ({misionRegistrada.distanciaKm.toLocaleString()} km).
                  {misionRegistrada.llevaEquipo
                    ? ` Equipo: ${misionRegistrada.equipos.join(', ')}.`
                    : ' Sin equipo asignado.'}{' '}
                  Misión: <em>{misionRegistrada.objetivo}</em>.
                </p>
              </div>
              <button
                type="button"
                className="banner-dismiss-btn"
                onClick={() => setMisionRegistrada(null)}
              >
                Cerrar aviso
              </button>
            </div>
          )}

          {/* CUADRÍCULA PRINCIPAL: MAPA INTERACTIVO + PANEL DE CONFIGURACIÓN */}
          <div className="mission-grid-layout">
            {/* COLUMNA IZQUIERDA: MAPA INTERACTIVO CON LAS 3 CAPAS NASA */}
            <div className="map-column">
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
            </div>

            {/* COLUMNA DERECHA: FORMULARIO Y APARTADO DE ORIGEN Y DESTINO */}
            <div className="form-column">
              <div className="route-card">
                <div className="route-header">
                  <h2>Planificación de Ruta Marciana</h2>
                  <p>Selecciona dónde estás y a dónde quieres desplazarte</p>
                </div>

                {errorRuta && <div className="error-message">{errorRuta}</div>}

                <form onSubmit={handleEnviarRuta}>
                  {/* ========================================================= */}
                  {/* APARTADO DE ORIGEN Y DESTINO: SELECCIÓN "¿DÓNDE ESTÁ?" Y "¿DÓNDE QUIERE IR?" */}
                  {/* ========================================================= */}
                  <div className="origin-destination-section">
                    {/* TARJETA DE ORIGEN: ¿En dónde estás? */}
                    <div className={`point-selector-card ${modoSeleccionMapa === 'origen' ? 'selecting' : ''}`}>
                      <div className="point-card-header">
                        <div className="point-tag origen-tag">
                          <span className="dot dot-origen"></span>
                          <span>ORIGEN</span>
                        </div>
                        <span className="point-sublabel">¿En dónde estás?</span>
                      </div>

                      <div className="point-select-row">
                        <select
                          className="form-select-basic"
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
                              📍 {origen ? origen.nombre : 'Punto fijado en mapa'}
                            </option>
                          )}
                        </select>
                      </div>

                      <div className="point-coords-bar">
                        <span className="coords-text">
                          Coordenadas: <strong>{origen ? formatearCoordenadas(origen.lat, origen.lon) : 'Sin seleccionar'}</strong>
                        </span>
                        <button
                          type="button"
                          className={`btn-pick-map ${modoSeleccionMapa === 'origen' ? 'active' : ''}`}
                          onClick={() =>
                            setModoSeleccionMapa(modoSeleccionMapa === 'origen' ? null : 'origen')
                          }
                        >
                          {modoSeleccionMapa === 'origen' ? 'Fijando...' : '📍 Fijar en Mapa'}
                        </button>
                      </div>
                    </div>

                    {/* BOTÓN INTERCAMBIAR RUTA ⇄ */}
                    <div className="swap-route-container">
                      <button
                        type="button"
                        className="btn-swap-route"
                        onClick={handleInvertirRuta}
                        title="Intercambiar Origen y Destino"
                      >
                        ⇄ Invertir Puntos
                      </button>
                    </div>

                    {/* TARJETA DE DESTINO: ¿A dónde quieres ir? */}
                    <div className={`point-selector-card ${modoSeleccionMapa === 'destino' ? 'selecting' : ''}`}>
                      <div className="point-card-header">
                        <div className="point-tag destino-tag">
                          <span className="dot dot-destino"></span>
                          <span>DESTINO</span>
                        </div>
                        <span className="point-sublabel">¿A dónde quieres ir?</span>
                      </div>

                      <div className="point-select-row">
                        <select
                          className="form-select-basic"
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
                              🎯 {destino ? destino.nombre : 'Punto fijado en mapa'}
                            </option>
                          )}
                        </select>
                      </div>

                      <div className="point-coords-bar">
                        <span className="coords-text">
                          Coordenadas: <strong>{destino ? formatearCoordenadas(destino.lat, destino.lon) : 'Sin seleccionar'}</strong>
                        </span>
                        <button
                          type="button"
                          className={`btn-pick-map ${modoSeleccionMapa === 'destino' ? 'active' : ''}`}
                          onClick={() =>
                            setModoSeleccionMapa(modoSeleccionMapa === 'destino' ? null : 'destino')
                          }
                        >
                          {modoSeleccionMapa === 'destino' ? 'Fijando...' : '🎯 Fijar en Mapa'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TELEMETRÍA DE LA RUTA EN TIEMPO REAL */}
                  <div className="route-telemetry-panel">
                    <div className="telemetry-item">
                      <span className="telemetry-label">Distancia Marciana</span>
                      <span className="telemetry-value">{distanciaKm.toLocaleString()} km</span>
                    </div>
                    <div className="telemetry-divider"></div>
                    <div className="telemetry-item">
                      <span className="telemetry-label">Rumbo (Azimut)</span>
                      <span className="telemetry-value">{rumboGrados}°</span>
                    </div>
                    <div className="telemetry-divider"></div>
                    <div className="telemetry-item">
                      <span className="telemetry-label">Tiempo Estimado</span>
                      <span className="telemetry-value">
                        {distanciaKm > 0
                          ? `${Math.max(1, Math.round(distanciaKm / 0.15))} h aprox.`
                          : '0 h'}
                      </span>
                    </div>
                  </div>

                  {/* PREGUNTA: ¿Lleva algún equipo científico? */}
                  <div className="equipment-box">
                    <label className="form-label-basic">
                      ¿Lleva algún equipo científico?
                    </label>
                    <div className="radio-row">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="llevaEquipo"
                          value="si"
                          checked={llevaEquipo === 'si'}
                          onChange={() => setLlevaEquipo('si')}
                        />
                        <span>Sí</span>
                      </label>
                      <label className="radio-option">
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
                      <div className="checkbox-list">
                        <span className="form-label-basic" style={{ fontSize: '12px', marginBottom: '2px' }}>
                          Especifique el equipo científico:
                        </span>
                        {OPCIONES_EQUIPO_CIENTIFICO.map((eq) => (
                          <label key={eq} className="checkbox-option">
                            <input
                              type="checkbox"
                              checked={equiposSeleccionados.includes(eq)}
                              onChange={() => handleToggleEquipo(eq)}
                            />
                            <span>{eq}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OBJETIVO DE LA MISIÓN: Opciones de misiones en Marte */}
                  <div className="form-group-basic">
                    <label className="form-label-basic">
                      Objetivo de la misión en Marte
                    </label>
                    <div className="mission-list">
                      {OPCIONES_OBJETIVO_MISION.map((mision) => (
                        <label key={mision} className="mission-radio-item">
                          <input
                            type="radio"
                            name="objetivoMision"
                            value={mision}
                            checked={objetivoMision === mision}
                            onChange={() => setObjetivoMision(mision)}
                          />
                          <span>{mision}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn-submit-route">
                    Confirmar y Registrar Misión
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
