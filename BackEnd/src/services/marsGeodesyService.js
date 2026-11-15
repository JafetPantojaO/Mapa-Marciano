// Servicio de calculos geodesicos y geodesia planetaria para Marte
import { RADIO_MARTE_KM, PUNTOS_MARTE } from '../constants/marsConstants.js';

/**
 * Calcula la distancia ortodromica (gran circulo) en kilometros sobre la esfera marciana
 */
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

/**
 * Formatea coordenadas en grados decimales con indicador hemisferico N/S y E/O
 */
export function formatearCoordenadas(lat, lon) {
  if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) return '';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
}

/**
 * Calcula el rumbo inicial (azimut) en grados sexagesimales (0 - 360)
 */
export function calcularRumbo(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const toRad = (g) => (g * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}

/**
 * Resuelve el punto mas cercano dentro de la red oficial de Marte a partir de coordenadas o nombre
 */
export function resolverPuntoCercano(punto) {
  if (!punto) return PUNTOS_MARTE[0];
  if (typeof punto.id === 'number') {
    const encontrado = PUNTOS_MARTE.find((p) => p.id === punto.id);
    if (encontrado) return encontrado;
  }
  if (punto.nombre) {
    const porNombre = PUNTOS_MARTE.find((p) => p.nombre.toLowerCase() === punto.nombre.toLowerCase());
    if (porNombre) return porNombre;
  }

  const lat = Number(punto.lat);
  const lon = Number(punto.lon);
  if (isNaN(lat) || isNaN(lon)) return PUNTOS_MARTE[0];

  let mejorPunto = PUNTOS_MARTE[0];
  let menorDistancia = Infinity;

  for (const p of PUNTOS_MARTE) {
    const dist = calcularDistanciaMarciana(lat, lon, p.lat, p.lon);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      mejorPunto = p;
    }
  }

  return mejorPunto;
}
