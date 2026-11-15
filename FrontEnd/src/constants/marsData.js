// Datos y constantes para la exploración cartográfica de Marte
import RoverRuta from '../../rover/rover_ruta.js';

export const RADIO_MARTE_KM = 3389.5; // Radio volumétrico medio de Marte

// Cuatro capas oficiales: Mapa Principal NASA Mars Trek (Viking MDIM 2.1) y 3 Mapas Secundarios (Relieve, Polvo y Térmico)
export const CAPAS_MARTE = [
  {
    id: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    tipo: 'wmts',
    esPrincipal: true,
    nombre: 'Mapa Principal: Viking MDIM 2.1 Color Mosaic (NASA Mars Trek)',
    etiquetaCorta: 'Viking MDIM 2.1',
    descripcion: 'Mosaico global colorizado Viking MDIM 2.1 oficial de NASA Trek a 232 m/píxel.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    fallbackExt: 'png',
    minZoom: 1,
    maxZoom: 6,
    colorTema: '#f59e0b'
  },
  {
    id: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
    tipo: 'wmts',
    esSecundario: true,
    nombre: 'Mapa Secundario: MOLA Relieve Topográfico',
    etiquetaCorta: 'Relieve',
    descripcion: 'Mosaico combinado de MOLA (MGS) y HRSC (Mars Express) con sombreado topográfico de relieve en color y cotas de altimetría.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    minZoom: 1,
    maxZoom: 6,
    colorTema: '#e07a5f'
  },
  {
    id: 'TES_Dust',
    tipo: 'wmts',
    esSecundario: true,
    nombre: 'Mapa Secundario: TES Polvo Marciano',
    etiquetaCorta: 'Polvo',
    descripcion: 'Distribución y opacidad atmosférica de polvo en la superficie de Marte registrada por el espectrómetro de emisión térmica TES.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    minZoom: 1,
    maxZoom: 5,
    colorTema: '#ee6c4d'
  },
  {
    id: 'TES_Thermal_Inertia',
    tipo: 'wmts',
    esSecundario: true,
    nombre: 'Mapa Secundario: TES Inercia Térmica',
    etiquetaCorta: 'Térmico',
    descripcion: 'Inercia térmica obtenida por el instrumento TES (Mars Global Surveyor) para distinguir variaciones térmicas de grano, roca y regolito.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Thermal_Inertia/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Thermal_Inertia/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    minZoom: 1,
    maxZoom: 5,
    colorTema: '#3d5a80'
  }
];

// Los 25 puntos oficiales de la red de navegación del Rover con datos ambientales reales
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
