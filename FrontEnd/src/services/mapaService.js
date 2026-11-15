// Servicio cliente para consumir la logica de mapa y navegacion desde el BackEnd
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000/api/mapa';

/**
 * Obtiene las capas cartograficas WMTS desde el BackEnd
 */
export async function fetchCapas() {
  try {
    const res = await fetch(`${API_BASE}/capas`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.warn('Usando capas locales por conexion no disponible con BackEnd:', error.message);
    return null;
  }
}

/**
 * Obtiene los 25 puntos y lugares cartografiados desde el BackEnd
 */
export async function fetchLugares() {
  try {
    const res = await fetch(`${API_BASE}/lugares`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.warn('Usando lugares locales por conexion no disponible con BackEnd:', error.message);
    return null;
  }
}

/**
 * Obtiene la configuracion de instrumentos y objetivos de mision desde el BackEnd
 */
export async function fetchMisionesConfig() {
  try {
    const res = await fetch(`${API_BASE}/misiones-config`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn('Usando configuracion local de misiones:', error.message);
    return null;
  }
}

/**
 * Solicita al BackEnd el calculo geodesico de distancia ortodromica y azimut
 */
export async function calcularDistanciaApi(lat1, lon1, lat2, lon2) {
  try {
    const res = await fetch(`${API_BASE}/calcular-distancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat1, lon1, lat2, lon2 })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return null;
  }
}

/**
 * Solicita al BackEnd la ejecucion del algoritmo Dijkstra multicriterio
 */
export async function planificarRutasApi(origenId, destinoId, perfilCarga, tieneEquipo, equiposSeleccionados) {
  try {
    const res = await fetch(`${API_BASE}/planificar-rutas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origenId,
        destinoId,
        perfilCarga,
        tieneEquipo,
        equiposSeleccionados
      })
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Error al contactar BackEnd para planificar rutas:', error.message);
    return null;
  }
}

/**
 * Solicita al BackEnd resolver el punto de la red mas cercano a unas coordenadas
 */
export async function resolverPuntoCercanoApi(punto) {
  try {
    const res = await fetch(`${API_BASE}/resolver-punto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ punto })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.punto;
  } catch (error) {
    return null;
  }
}

/**
 * Solicita al BackEnd el muestreo de datos espectrales reales en las coordenadas del rover
 */
export async function muestrearDatosEspectralesApi(lat, lon, tramoActual = 1, totalTramos = 1, waypointCercano = 'Rover') {
  try {
    const res = await fetch(`${API_BASE}/muestrear-espectral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        tramoActual,
        totalTramos,
        waypointCercano
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Conexión con BackEnd para espectrometría no disponible:', error.message);
    return null;
  }
}
