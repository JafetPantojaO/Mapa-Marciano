// Constantes geograficas, ambientales y de cartografia marciana

export const RADIO_MARTE_KM = 3389.5; // Radio volumetrico medio de Marte en kilometros

// Capas oficiales WMTS de NASA Mars Trek
export const CAPAS_MARTE = [
  {
    id: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
    nombre: 'Mars MOLA (Relieve Sombreado a Color)',
    etiquetaCorta: 'MOLA Relieve Color',
    descripcion: 'Mosaico combinado de MOLA (MGS) y HRSC (Mars Express) a 200 m/pixel con sombreado de relieve topografico en color.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    minZoom: 1,
    maxZoom: 6,
    colorTema: '#e07a5f'
  },
  {
    id: 'TES_Thermal_Inertia',
    nombre: 'TES, Inercia Termica',
    etiquetaCorta: 'TES Inercia Termica',
    descripcion: 'Mapa global de inercia termica obtenido por el instrumento TES (Mars Global Surveyor). Permite distinguir entre polvo fino, arena y roca solida.',
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
    descripcion: 'Distribucion y abundancia de polvo en la superficie de Marte registrada por el espectrometro de emision termica TES.',
    wmtsCapabilities: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/WMTSCapabilities.xml',
    tileUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    fallbackExt: 'jpg',
    minZoom: 1,
    maxZoom: 5,
    colorTema: '#ee6c4d'
  }
];

// 25 puntos oficiales de la red Dijkstra con datos ambientales calibrados (MOLA, TES, Viking, Curiosity, Perseverance, InSight)
export const PUNTOS_MARTE = [
  { id: 1, nombre: "Vastitas Borealis", lat: 70, lon: 100, pendiente_grados: 3.2, viento_ms: 12.0, opacidad_polvo: 0.8, temp_min_c: -125, temp_max_c: -60, tipoTerreno: "Llanura polar con criocapas y hielo subterraneo" },
  { id: 2, nombre: "Tantalus Fossae", lat: 50, lon: -100, pendiente_grados: 16.5, viento_ms: 18.5, opacidad_polvo: 1.4, temp_min_c: -85, temp_max_c: -15, tipoTerreno: "Fosas tectonicas con grabens escalonados" },
  { id: 3, nombre: "Tempe Fossae", lat: 40, lon: -70, pendiente_grados: 14.2, viento_ms: 16.0, opacidad_polvo: 1.1, temp_min_c: -80, temp_max_c: -10, tipoTerreno: "Relieve fracturado y escarpes de falla" },
  { id: 4, nombre: "Acidalia Planitia", lat: 49, lon: -22, pendiente_grados: 4.1, viento_ms: 14.5, opacidad_polvo: 1.2, temp_min_c: -90, temp_max_c: -20, tipoTerreno: "Cuenca sedimentaria oscura y llanura llana" },
  { id: 5, nombre: "Utopia Planitia", lat: 47, lon: 118, pendiente_grados: 3.8, viento_ms: 11.2, opacidad_polvo: 0.9, temp_min_c: -95, temp_max_c: -22, tipoTerreno: "Llanura aluvial basaltica con permafrost" },
  { id: 6, nombre: "Amazonis Planitia", lat: 25, lon: -164, pendiente_grados: 2.5, viento_ms: 19.0, opacidad_polvo: 2.2, temp_min_c: -75, temp_max_c: -5, tipoTerreno: "Planicie suave cubierta de polvo eolico fino" },
  { id: 7, nombre: "Tharsis Volcanic Region", lat: 1, lon: -112, pendiente_grados: 22.0, viento_ms: 24.5, opacidad_polvo: 1.8, temp_min_c: -70, temp_max_c: 5, tipoTerreno: "Meseta volcanica escarpada de gran altitud" },
  { id: 8, nombre: "Valles Marineris", lat: -14, lon: -59, pendiente_grados: 24.5, viento_ms: 26.0, opacidad_polvo: 2.1, temp_min_c: -65, temp_max_c: 12, tipoTerreno: "Canon gigantesco con taludes pronunciados de 7 km" },
  { id: 9, nombre: "Claritas Fossae", lat: -30, lon: -104, pendiente_grados: 15.0, viento_ms: 17.0, opacidad_polvo: 1.3, temp_min_c: -75, temp_max_c: -8, tipoTerreno: "Crestas tectonicas y fracturas longitudinales" },
  { id: 10, nombre: "Terra Sirenum", lat: -40, lon: -150, pendiente_grados: 9.5, viento_ms: 15.0, opacidad_polvo: 1.5, temp_min_c: -85, temp_max_c: -18, tipoTerreno: "Tierras altas craterizadas con lechos de cloruros" },
  { id: 11, nombre: "Icaria Fossae", lat: -50, lon: -130, pendiente_grados: 13.0, viento_ms: 16.5, opacidad_polvo: 1.2, temp_min_c: -95, temp_max_c: -25, tipoTerreno: "Canadas tectonicas y crestas erosionadas" },
  { id: 12, nombre: "Aonia Terra", lat: -58, lon: -95, pendiente_grados: 8.0, viento_ms: 21.0, opacidad_polvo: 1.0, temp_min_c: -110, temp_max_c: -45, tipoTerreno: "Tierras altas de impacto y regolito criogenico" },
  { id: 13, nombre: "Arabia Terra", lat: 21, lon: 5, pendiente_grados: 5.5, viento_ms: 13.0, opacidad_polvo: 1.6, temp_min_c: -70, temp_max_c: 2, tipoTerreno: "Meseta densamente erosionada y rica en minerales" },
  { id: 14, nombre: "Margaritifer Terra", lat: -5, lon: -25, pendiente_grados: 8.5, viento_ms: 15.5, opacidad_polvo: 1.4, temp_min_c: -68, temp_max_c: 8, tipoTerreno: "Terreno caotico con paleocanales de inundacion" },
  { id: 15, nombre: "Terra Meridiani", lat: -3, lon: 0, pendiente_grados: 2.2, viento_ms: 9.5, opacidad_polvo: 0.7, temp_min_c: -60, temp_max_c: 18, tipoTerreno: "Planicie llana ecuatorial de hematita esferular" },
  { id: 16, nombre: "Noachis Terra", lat: -45, lon: -5, pendiente_grados: 7.8, viento_ms: 14.0, opacidad_polvo: 1.3, temp_min_c: -90, temp_max_c: -20, tipoTerreno: "Crateres de impacto ancestrales y regolito seco" },
  { id: 17, nombre: "Terra Sabaea", lat: 2, lon: 42, pendiente_grados: 6.2, viento_ms: 12.5, opacidad_polvo: 1.1, temp_min_c: -65, temp_max_c: 14, tipoTerreno: "Franja de tierras altas con dunas basalticas" },
  { id: 18, nombre: "Tyrrhena Terra", lat: -15, lon: 90, pendiente_grados: 11.5, viento_ms: 18.0, opacidad_polvo: 1.7, temp_min_c: -72, temp_max_c: 5, tipoTerreno: "Meseta volcanica antigua con crestas arrugadas" },
  { id: 19, nombre: "Hellas Planitia", lat: -42, lon: 70, pendiente_grados: 10.5, viento_ms: 27.5, opacidad_polvo: 2.7, temp_min_c: -80, temp_max_c: -5, tipoTerreno: "Cuenca de impacto profunda con frecuentes tormentas de polvo" },
  { id: 20, nombre: "Promethei Terra", lat: -64, lon: 100, pendiente_grados: 9.0, viento_ms: 20.0, opacidad_polvo: 0.9, temp_min_c: -120, temp_max_c: -50, tipoTerreno: "Tierras altas subpolares con hielo de CO2 estacional" },
  { id: 21, nombre: "Chronium Planum", lat: -60, lon: -150, pendiente_grados: 5.0, viento_ms: 18.0, opacidad_polvo: 0.8, temp_min_c: -115, temp_max_c: -48, tipoTerreno: "Meseta polar estratificada de baja pendiente" },
  { id: 22, nombre: "Terra Cimmeria", lat: -35, lon: 145, pendiente_grados: 7.0, viento_ms: 13.5, opacidad_polvo: 1.3, temp_min_c: -85, temp_max_c: -15, tipoTerreno: "Tierras altas con corteza magnetica remanente" },
  { id: 23, nombre: "Elysium Planitia", lat: 3, lon: 155, pendiente_grados: 3.0, viento_ms: 10.0, opacidad_polvo: 0.8, temp_min_c: -65, temp_max_c: 15, tipoTerreno: "Llanura basaltica suave, optima para instrumentos sismicos" },
  { id: 24, nombre: "Nepenthes Mensae", lat: 5, lon: 120, pendiente_grados: 12.8, viento_ms: 16.0, opacidad_polvo: 1.4, temp_min_c: -68, temp_max_c: 10, tipoTerreno: "Zona de transicion con colinas testigo y mesas" },
  { id: 25, nombre: "Elysium Volcanic Region", lat: 25, lon: 147, pendiente_grados: 19.0, viento_ms: 22.0, opacidad_polvo: 1.5, temp_min_c: -75, temp_max_c: 0, tipoTerreno: "Domo volcanico pronunciado con tubos de lava" }
];

// Opciones de equipo cientifico para misiones en Marte
export const OPCIONES_EQUIPO_CIENTIFICO = [
  'Espectrometro Laser LIBS (analisis quimico de rocas)',
  'Radar de Penetracion Subterranea RIMFAX (deteccion de hielo)',
  'Taladro de perforacion y toma de muestras de suelo',
  'Estacion meteorologica y medicion de radiacion MEDA',
  'Camara multiespectral Mastcam-Z de alta resolucion',
  'Detector de biofirmas y compuestos organicos SHERLOC'
];

// Opciones de objetivos de misiones de exploracion a Marte
export const OPCIONES_OBJETIVO_MISION = [
  'Muestreo y cartografia de hielo subterraneo',
  'Busqueda de biofirmas en cuencas lacustres y paleocanales',
  'Reconocimiento geologico y acceso a tubos de lava',
  'Instalacion y calibracion de sensores sismicos de superficie',
  'Mantenimiento de antenas y repetidores de comunicaciones',
  'Monitoreo ambiental de vientos y tormentas de polvo global'
];
