import { useState } from 'react';
import './App.css';
import nasaLogo from './assets/NASA_logo.webp';

// Opciones de equipo científico para misiones en Marte
const OPCIONES_EQUIPO_CIENTIFICO = [
  'Espectrómetro Láser LIBS (análisis químico de rocas)',
  'Radar de Penetración Subterránea RIMFAX (detección de hielo)',
  'Taladro de perforación y toma de muestras de suelo',
  'Estación meteorológica y medición de radiación',
  'Cámara multiespectral de alta resolución',
  'Detector de biofirmas y compuestos orgánicos'
];

// Opciones de objetivos de misiones de exploración a Marte
const OPCIONES_OBJETIVO_MISION = [
  'Muestreo y cartografía de hielo subterráneo',
  'Búsqueda de biofirmas en cuencas lacustres',
  'Reconocimiento geológico de tubos de lava',
  'Instalación y calibración de sensores sísmicos',
  'Mantenimiento de antenas y repetidores de comunicaciones',
  'Estudio de la atmósfera y tormentas de polvo'
];

function App() {
  // Sesión de astronauta autenticado (100% en memoria/localStorage, sin backend)
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
      setErrorLogin('Ingrese su ID de astronauta.');
      return;
    }
    if (!passLimpio) {
      setErrorLogin('Ingrese su contraseña.');
      return;
    }

    // Guardar sesión cliente-side sin backend
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

  // Enviar solicitud de ruta
  const handleEnviarRuta = (e) => {
    e.preventDefault();
    setErrorRuta('');

    if (origen.trim() === destino.trim()) {
      setErrorRuta('El origen y el destino deben ser diferentes.');
      return;
    }

    if (llevaEquipo === 'si' && equiposSeleccionados.length === 0) {
      setErrorRuta('Seleccione al menos un equipo científico de la lista.');
      return;
    }

    const nuevaSolicitud = {
      astronauta: usuarioAutenticado ? usuarioAutenticado.id : astronautId,
      origen,
      destino,
      llevaEquipo: llevaEquipo === 'si',
      equipos: llevaEquipo === 'si' ? equiposSeleccionados : [],
      objetivo: objetivoMision
    };

    setSolicitudRegistrada(nuevaSolicitud);
    setPestanaActiva('resumen');
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
    setSolicitudRegistrada(null);
    try {
      localStorage.removeItem('astronauta_id');
    } catch {
      // ignore
    }
    setPestanaActiva('login');
  };

  return (
    <div className="app-container">
      {/* Logo de la NASA centrado en medio arriba */}
      <div className="nasa-logo-container">
        <img src={nasaLogo} alt="NASA Logo" className="nasa-logo" />
      </div>

      {/* Pestañas de navegación */}
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
          Solicitud de Ruta
        </button>

        {solicitudRegistrada && (
          <button
            type="button"
            className={`tab-button ${pestanaActiva === 'resumen' ? 'active' : ''}`}
            onClick={() => setPestanaActiva('resumen')}
          >
            Resumen
          </button>
        )}

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

      {/* PESTAÑA 1: LOGIN ESTRUCTURA REFERENCIA.jpeg */}
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

              {/* Fila Remember me / Forgot Password */}
              <div className="login-options-row">
                <label className="remember-label">
                  
                </label>
              </div>
            </div>

            {/* Línea divisoria y botón LOGIN */}
            <div className="login-divider"></div>
            <button type="submit" className="login-submit-btn">
              LOGIN
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: SOLICITUD DE RUTA */}
      {pestanaActiva === 'solicitud' && usuarioAutenticado && (
        <div className="route-card">
          <div className="route-header">
            <h2>Solicitud de Ruta</h2>
            <p>Astronauta ID: {usuarioAutenticado.id}</p>
          </div>

          {errorRuta && <div className="error-message">{errorRuta}</div>}

          <form onSubmit={handleEnviarRuta}>
            <div className="form-group-basic">
              <label className="form-label-basic" htmlFor="origen-input">
                Origen
              </label>
              <select
                id="origen-input"
                className="form-select-basic"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
              >
                <option value="Base Central Marte">Base Central Marte</option>
                <option value="Puesto Avanzado Norte">Puesto Avanzado Norte</option>
                <option value="Estación de Investigación Sur">Estación de Investigación Sur</option>
              </select>
            </div>

            <div className="form-group-basic">
              <label className="form-label-basic" htmlFor="destino-input">
                Destino
              </label>
              <select
                id="destino-input"
                className="form-select-basic"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              >
                <option value="Cráter Jezero">Cráter Jezero</option>
                <option value="Olympus Mons">Olympus Mons</option>
                <option value="Valles Marineris">Valles Marineris</option>
                <option value="Tharsis Montes">Tharsis Montes</option>
                <option value="Deuteronilus Mensae">Deuteronilus Mensae</option>
              </select>
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

              {/* Si es Sí: opciones de equipo científico */}
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
              Enviar Solicitud
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 3: RESUMEN BÁSICO DE SOLICITUD */}
      {pestanaActiva === 'resumen' && solicitudRegistrada && (
        <div className="route-card">
          <div className="route-header">
            <h2>Resumen de Solicitud de Ruta</h2>
            <p>Registro exitoso</p>
          </div>

          <div className="summary-box">
            <div className="summary-row">
              <strong>Astronauta:</strong> {solicitudRegistrada.astronauta}
            </div>
            <div className="summary-row">
              <strong>Origen:</strong> {solicitudRegistrada.origen}
            </div>
            <div className="summary-row">
              <strong>Destino:</strong> {solicitudRegistrada.destino}
            </div>
            <div className="summary-row">
              <strong>Objetivo:</strong> {solicitudRegistrada.objetivo}
            </div>
            <div className="summary-row">
              <strong>Equipo científico:</strong>{' '}
              {solicitudRegistrada.llevaEquipo
                ? solicitudRegistrada.equipos.join(', ')
                : 'Ninguno'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-submit-route"
              style={{ background: '#334155', color: '#ffffff' }}
              onClick={() => setPestanaActiva('solicitud')}
            >
              Nueva Solicitud
            </button>
            <button
              type="button"
              className="btn-submit-route"
              style={{ background: '#7f1d1d', color: '#ffffff' }}
              onClick={handleCerrarSesion}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
