// Datos y constantes para la exploración cartográfica de Marte
import RoverRuta from '../../rover/rover_ruta.js';

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
    minZoom: 1,
    maxZoom: 6,
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
    minZoom: 1,
    maxZoom: 5,
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
    minZoom: 1,
    maxZoom: 5,
    colorTema: '#ee6c4d'
  }
];

// Los 25 puntos oficiales de la red Dijkstra del Rover con datos ambientales reales
export const LUGARES_MARTE = RoverRuta && RoverRuta.datos && RoverRuta.datos.puntos
  ? RoverRuta.datos.puntos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      lat: p.lat,
      lon: p.lon,
      pendiente_grados: p.pendiente_grados,
      viento_ms: p.viento_ms,
      opacidad_polvo: p.opacidad_polvo,
      temp_min_c: p.temp_min_c,
      temp_max_c: p.temp_max_c,
      desc: p.tipoTerreno || 'Región geológica marciana'
    }))
  : [
      { id: 1, nombre: "Vastitas Borealis", lat: 70, lon: 100, desc: "Llanura polar norte" },
      { id: 4, nombre: "Acidalia Planitia", lat: 49, lon: -22, desc: "Cuenca sedimentaria norte" },
      { id: 8, nombre: "Valles Marineris", lat: -14, lon: -59, desc: "Cañón gigantesco marciano" },
      { id: 15, nombre: "Terra Meridiani", lat: -3, lon: 0, desc: "Planicie ecuatorial llana" },
      { id: 19, nombre: "Hellas Planitia", lat: -42, lon: 70, desc: "Cuenca de impacto profunda" },
      { id: 23, nombre: "Elysium Planitia", lat: 3, lon: 155, desc: "Llanura basáltica ecuatorial" }
    ];

// Opciones de equipo científico para misiones en Marte
export const OPCIONES_EQUIPO_CIENTIFICO = [
  'Espectrómetro Láser LIBS (análisis químico de rocas)',
  'Radar de Penetración Subterránea RIMFAX (detección de hielo)',
  'Taladro de perforación y toma de muestras de suelo',
  'Estación meteorológica y medición de radiación MEDA',
  'Cámara multiespectral Mastcam-Z de alta resolución',
  'Detector de biofirmas y compuestos orgánicos SHERLOC'
];

// Opciones de objetivos de misiones de exploración a Marte
export const OPCIONES_OBJETIVO_MISION = [
  'Muestreo y cartografía de hielo subterráneo',
  'Búsqueda de biofirmas en cuencas lacustres y paleocanales',
  'Reconocimiento geológico y acceso a tubos de lava',
  'Instalación y calibración de sensores sísmicos de superficie',
  'Mantenimiento de antenas y repetidores de comunicaciones',
  'Monitoreo ambiental de vientos y tormentas de polvo global'
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
  return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
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
