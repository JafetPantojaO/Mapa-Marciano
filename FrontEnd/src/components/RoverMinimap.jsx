import { useEffect, useRef } from 'react';
import { CAPAS_MARTE, formatearCoordenadas } from '../constants/marsData';

const ZOOM_FIJO = 4; // Zoom fijo mayor que el del mapa principal (1 a 5)

export default function RoverMinimap({
  rutaActiva,
  posicionRover,
  onBoundsChange,
  capaActivaId
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRecorridaRef = useRef(null);
  const polylinePendienteRef = useRef(null);
  const roverMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Determinar capa a usar en el minimapa (sincronizada con la capa activa o MOLA)
  const capa = CAPAS_MARTE.find((c) => c.id === capaActivaId) || CAPAS_MARTE[0];

  // 1. Inicializar la instancia del minimapa de Leaflet
  useEffect(() => {
    const L = window.L;
    if (!L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [posicionRover?.lat || 0, posicionRover?.lon || 0],
      zoom: ZOOM_FIJO,
      minZoom: ZOOM_FIJO,
      maxZoom: ZOOM_FIJO,
      zoomControl: false,
      attributionControl: false,
      dragging: false, // Siempre centrado en el rover
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false
    });

    const tileUrl = capa.tileUrl || 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      minZoom: 1,
      maxZoom: 6,
      noWrap: true
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Notificar límites iniciales del minimapa
    map.whenReady(() => {
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange([
          [b.getSouth(), b.getWest()],
          [b.getNorth(), b.getEast()]
        ]);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Actualizar capa si cambia
  useEffect(() => {
    if (!mapRef.current || !window.L || !capa) return;
    const L = window.L;
    const map = mapRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = capa.tileUrl;
    const tileLayer = L.tileLayer(tileUrl, {
      minZoom: 1,
      maxZoom: 6,
      noWrap: true
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [capa]);

  // 3. Actualizar posición del rover, centrado, líneas recorrida/pendiente y límites
  useEffect(() => {
    if (!mapRef.current || !window.L || !posicionRover) return;
    const L = window.L;
    const map = mapRef.current;
    const { lat, lon, rutaRecorrida, rutaPendiente } = posicionRover;

    if (lat === undefined || lon === undefined) return;

    // Siempre centrado en la posición actual del rover con zoom fijo
    map.setView([lat, lon], ZOOM_FIJO, { animate: false });

    // Notificar límites visibles del minimapa para que el mapa principal dibuje el recuadro punteado
    if (onBoundsChange) {
      const b = map.getBounds();
      onBoundsChange([
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getEast()]
      ]);
    }

    // Ruta recorrida (línea sólida)
    if (polylineRecorridaRef.current) {
      map.removeLayer(polylineRecorridaRef.current);
      polylineRecorridaRef.current = null;
    }
    if (rutaRecorrida && rutaRecorrida.length >= 2) {
      polylineRecorridaRef.current = L.polyline(rutaRecorrida, {
        color: rutaActiva?.color || '#10b981', // Color temático de la ruta para tramo recorrido
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Ruta pendiente (línea punteada)
    if (polylinePendienteRef.current) {
      map.removeLayer(polylinePendienteRef.current);
      polylinePendienteRef.current = null;
    }
    if (rutaPendiente && rutaPendiente.length >= 2) {
      polylinePendienteRef.current = L.polyline(rutaPendiente, {
        color: '#f59e0b', // Ámbar punteado para tramo pendiente
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(map);
    }

    // Marcador visual del Rover
    if (roverMarkerRef.current) {
      map.removeLayer(roverMarkerRef.current);
      roverMarkerRef.current = null;
    }

    const roverIcon = L.divIcon({
      className: 'minimap-rover-marker',
      html: `
        <div class="rover-pulse-ring"></div>
        <div class="rover-core-dot">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="#ffffff">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#ffffff" stroke-width="2"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    roverMarkerRef.current = L.marker([lat, lon], {
      icon: roverIcon,
      zIndexOffset: 1000
    }).addTo(map);
  }, [posicionRover, onBoundsChange, rutaActiva?.color]);

  return (
    <div className="rover-minimap-card">
      <div className="minimap-header">
        <div className="minimap-title-block">
          <div className="minimap-badge">
            <span className="dot-live-ping" />
            <span>MINIMAPA EN VIVO</span>
          </div>
          <h4 className="minimap-title">Seguimiento Rover (Zoom {ZOOM_FIJO}x)</h4>
        </div>
        <div className="minimap-legend">
          <span className="legend-item">
            <span className="line-sample line-solid" />
            <span>Recorrido</span>
          </span>
          <span className="legend-item">
            <span className="line-sample line-dashed" />
            <span>Pendiente</span>
          </span>
        </div>
      </div>

      <div className="minimap-viewport-wrapper">
        <div ref={containerRef} className="minimap-canvas" />
        <div className="minimap-reticle-overlay" aria-hidden="true">
          <div className="reticle-corner tl" />
          <div className="reticle-corner tr" />
          <div className="reticle-corner bl" />
          <div className="reticle-corner br" />
          <div className="reticle-center-crosshair" />
        </div>
      </div>

      <div className="minimap-footer-telemetry">
        <span className="coord-label">Posición Rover:</span>
        <strong className="coord-values">
          {posicionRover ? formatearCoordenadas(posicionRover.lat, posicionRover.lon) : '0° N, 0° E'}
        </strong>
      </div>
    </div>
  );
}
