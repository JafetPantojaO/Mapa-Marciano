// Datos y constantes para la exploración cartográfica de Marte

export const RADIO_MARTE_KM = 3389.5; // Radio volumétrico medio de Marte

// Tres capas WMTS oficiales de NASA Mars Trek provistas por el usuario
export const CAPAS_MARTE = [
  {
    id: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
    nombre: 'Mars MOLA (Relieve Sombreado a Color)',
    etiquetaCorta: 'MOLA Relieve Color',
    descripcion: 'Mosaico combinado de MOLA (MGS) y HRSC (Mars Express) a 200 m/píxel con sombreado de relieve topográfico en color.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    maxZoom: 7,
    colorTema: '#e07a5f'
  },
  {
    id: 'TES_Thermal_Inertia',
    nombre: 'TES, Inercia Térmica',
    etiquetaCorta: 'TES Inercia Térmica',
    descripcion: 'Mapa global de inercia térmica obtenido por el instrumento TES (Mars Global Surveyor). Permite distinguir entre polvo fino, arena y roca sólida.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Thermal_Inertia/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Thermal_Inertia/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    maxZoom: 6,
    colorTema: '#3d5a80'
  },
  {
    id: 'TES_Dust',
    nombre: 'TES, Polvo Marciano',
    etiquetaCorta: 'TES Polvo',
    descripcion: 'Distribución y abundancia de polvo en la superficie de Marte registrada por el espectrómetro de emisión térmica TES.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    maxZoom: 6,
    colorTema: '#ee6c4d'
  }
];

// Lugares emblemáticos y bases de Marte con coordenadas reales
export const LUGARES_MARTE = [
  {
    id: 'base-central',
    nombre: 'Base Central Marte',
    lat: 0.0,
    lon: 0.0,
    desc: 'Centro de comando en Meridiani Planum'
  },
  {
    id: 'jezero',
    nombre: 'Cráter Jezero',
    lat: 18.38,
    lon: 77.58,
    desc: 'Zona de exploración del rover Perseverance (antiguo delta fluvial)'
  },
  {
    id: 'gale',
    nombre: 'Cráter Gale',
    lat: -4.59,
    lon: 137.44,
    desc: 'Zona de exploración del rover Curiosity (Monte Sharp)'
  },
  {
    id: 'olympus',
    nombre: 'Olympus Mons',
    lat: 18.65,
    lon: -133.80,
    desc: 'El volcán y montaña más alta de todo el Sistema Solar (21 km)'
  },
  {
    id: 'marineris',
    nombre: 'Valles Marineris',
    lat: -13.90,
    lon: -59.20,
    desc: 'Cañón gigantesco marciano de más de 4000 km de longitud'
  },
  {
    id: 'tharsis',
    nombre: 'Tharsis Montes',
    lat: 1.50,
    lon: -112.50,
    desc: 'Gran meseta volcánica en el hemisferio occidental'
  },
  {
    id: 'elysium',
    nombre: 'Elysium Planitia',
    lat: 4.50,
    lon: 135.62,
    desc: 'Llanura volcánica ecuatorial y sitio de aterrizaje de InSight'
  },
  {
    id: 'utopia',
    nombre: 'Utopia Planitia',
    lat: 25.10,
    lon: 109.90,
    desc: 'Gran cuenca de impacto norteña (exploración Zhurong)'
  },
  {
    id: 'gusev',
    nombre: 'Cráter Gusev',
    lat: -14.57,
    lon: 175.47,
    desc: 'Cráter con evidencia de actividad acuosa pasada (rover Spirit)'
  },
  {
    id: 'deuteronilus',
    nombre: 'Deuteronilus Mensae',
    lat: 43.90,
    lon: 23.40,
    desc: 'Región de mesas y valles con extensos glaciares enterrados'
  },
  {
    id: 'puesto-norte',
    nombre: 'Puesto Avanzado Norte',
    lat: 35.00,
    lon: 45.00,
    desc: 'Estación de monitoreo meteorológico de tormentas de polvo'
  },
  {
    id: 'estacion-sur',
    nombre: 'Estación de Investigación Sur',
    lat: -45.00,
    lon: -30.00,
    desc: 'Observatorio criogénico y muestreo de hielo seco'
  }
];

// Opciones de equipo científico para misiones en Marte
export const OPCIONES_EQUIPO_CIENTIFICO = [
  'Espectrómetro Láser LIBS (análisis químico de rocas)',
  'Radar de Penetración Subterránea RIMFAX (detección de hielo)',
  'Taladro de perforación y toma de muestras de suelo',
  'Estación meteorológica y medición de radiación',
  'Cámara multiespectral de alta resolución',
  'Detector de biofirmas y compuestos orgánicos'
];

// Opciones de objetivos de misiones de exploración a Marte
export const OPCIONES_OBJETIVO_MISION = [
  'Muestreo y cartografía de hielo subterráneo',
  'Búsqueda de biofirmas en cuencas lacustres',
  'Reconocimiento geológico de tubos de lava',
  'Instalación y calibración de sensores sísmicos',
  'Mantenimiento de antenas y repetidores de comunicaciones',
  'Estudio de la atmósfera y tormentas de polvo'
];

// Cálculo de distancia en gran círculo sobre la esfera de Marte en kilómetros
export function calcularDistanciaMarciana(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const toRad = (grados) => (grados * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return Math.round(RADIO_MARTE_KM * c);
}

// Formateo de latitud y longitud legible
export function formatearCoordenadas(lat, lon) {
  if (lat === undefined || lon === undefined) return '';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
}

// Cálculo del rumbo inicial (bearing/azimut) en grados (0 - 360)
export function calcularRumbo(lat1, lon1, lat2, lon2) {
  const toRad = (g) => (g * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}
