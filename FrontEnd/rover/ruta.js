import { calcularRuta } from "./ruta.js";

// Constantes que puedes ajustar después
const SEGUNDOS_POR_CELDA_LIBRE = 10;
const SEGUNDOS_POR_CELDA_ARENA = 25;

let contadorRutas = 1;

// Cuenta cuántas rocas hay en las 8 celdas alrededor de una celda
function rocasCerca(mapa, x, y) {
  let total = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const fila = mapa[y + dy];
      if (fila && fila[x + dx] === 1) total++;
    }
  }
  return total;
}

// Arma el objeto completo de la tabla "Ruta"
export function generarRuta(mapa, origen, destino) {
  const coordenadas = calcularRuta(mapa, origen, destino);

  if (!coordenadas) {
    return null; // no hay ruta posible
  }

  let duracion = 0;
  let celdasArena = 0;
  let rocasCercanas = 0;

  // Empezamos en 1 porque la celda 0 es donde ya está el rover
  for (let i = 1; i < coordenadas.length; i++) {
    const { x, y } = coordenadas[i];
    if (mapa[y][x] === 2) {
      duracion += SEGUNDOS_POR_CELDA_ARENA;
      celdasArena++;
    } else {
      duracion += SEGUNDOS_POR_CELDA_LIBRE;
    }
    rocasCercanas += rocasCerca(mapa, x, y);
  }

  const pasos = coordenadas.length - 1;

  // Peligro de 0 a 100 (más arena y más rocas cerca = más peligro)
  const peligroBruto = pasos > 0 ? (celdasArena * 2 + rocasCercanas) / pasos : 0;
  const peligro = Math.min(100, Math.round(peligroBruto * 20));

  return {
    rutaId: contadorRutas++,
    origen: origen,
    destino: destino,
    coordenadas: coordenadas,
    distanciaTotal: pasos,   // en celdas
    duracion: duracion,      // en segundos
    peligro: peligro         // 0 a 100
  };
}
