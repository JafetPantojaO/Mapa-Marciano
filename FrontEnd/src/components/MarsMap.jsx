import { useEffect, useRef, useState } from 'react';
import {
  CAPAS_MARTE,
  LUGARES_MARTE,
  calcularDistanciaMarciana,
  formatearCoordenadas
} from '../constants/marsData';

export default function MarsMap({
  origen,
  destino,
  onSelectOrigen,
  onSelectDestino,
  modoSeleccion,
  setModoSeleccion,
  capaActivaId,
  onChangeCapa
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerOrigenRef = useRef(null);
  const markerDestinoRef = useRef(null);
  const polylineRef = useRef(null);

  const [mapaListo, setMapaListo] = useState(false);
  const [coordenadasCursor, setCoordenadasCursor] = useState(null);

  const capaActiva = CAPAS_MARTE.find((c) => c.id === capaActivaId) || CAPAS_MARTE[0];

  // 1. Cargar Leaflet dinámicamente si no está presente en window
  useEffect(() => {
    let montado = true;

    const inicializar = () => {
      if (!montado) return;
      if (window.L) {
        setMapaListo(true);
        return;
      }

      // Si no existe, cargar script y estilos de Leaflet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (montado) setMapaListo(true);
      };
      document.head.appendChild(script);
    };

    inicializar();

    return () => {
      montado = false;
    };
  }, []);

  // 2. Crear instancia del mapa de Marte usando CRS EPSG:4326 (Equirectangular)
  useEffect(() => {
    if (!mapaListo || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    // Configuración del mapa planetario Equirectangular
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 7,
      worldCopyJump: false,
      attributionControl: false
    });

    // Control de atribución personalizado para NASA Mars Trek
    L.control
      .attribution({
        position: 'bottomright',
        prefix: 'NASA / JPL-Caltech / USGS / Mars Trek'
      })
      .addTo(map);

    // Seguimiento del cursor sobre la superficie marciana
    map.on('mousemove', (e) => {
      const lat = Math.max(-90, Math.min(90, e.latlng.lat));
      const lon = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180;
      setCoordenadasCursor({ lat, lon });
    });

    map.on('mouseout', () => {
      setCoordenadasCursor(null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapaListo]);

  // 3. Actualizar la capa de mosaicos WMTS de NASA Trek al cambiar capaActiva
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    // Definición de capa con soporte para fallback a .jpg si el tile .png no responde
    const MarsTileLayer = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement('img');
        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', (err) => {
          // Intentar extensión jpg si falló png
          if (tile.src.includes('.png')) {
            tile.src = tile.src.replace('.png', '.jpg');
          } else {
            this._tileOnError(done, tile, err);
          }
        });

        tile.alt = 'Mosaico NASA Marte';
        tile.setAttribute('role', 'presentation');
        tile.src = this.getTileUrl(coords);
        return tile;
      }
    });

    const tileLayer = new MarsTileLayer(capaActiva.tileUrl, {
      minZoom: 0,
      maxZoom: capaActiva.maxZoom || 7,
      noWrap: true,
      bounds: [
        [-90, -180],
        [90, 180]
      ],
      tms: false
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [capaActiva, mapaListo]);

  // 4. Manejador de clics en el mapa para seleccionar origen o destino
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e) => {
      const lat = Math.max(-90, Math.min(90, Number(e.latlng.lat.toFixed(3))));
      const lon = Number((((((e.latlng.lng + 180) % 360) + 360) % 360) - 180).toFixed(3));

      // Buscar si el punto coincide con algún sitio emblemático cercano
      const lugarCercano = LUGARES_MARTE.find(
        (l) => Math.hypot(l.lat - lat, l.lon - lon) < 3.5
      );

      const nuevoPunto = {
        nombre: lugarCercano ? lugarCercano.nombre : `Coordenadas [${formatearCoordenadas(lat, lon)}]`,
        lat,
        lon
      };

      if (modoSeleccion === 'origen') {
        onSelectOrigen(nuevoPunto);
        // Si destino aún no está seleccionado o el usuario quiere flujo guiado
        setModoSeleccion('destino');
      } else if (modoSeleccion === 'destino') {
        onSelectDestino(nuevoPunto);
        setModoSeleccion(null);
      } else {
        // Si no hay modo activo, asignar a destino si origen ya está, o a origen
        if (!origen) {
          onSelectOrigen(nuevoPunto);
          setModoSeleccion('destino');
        } else {
          onSelectDestino(nuevoPunto);
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [modoSeleccion, onSelectOrigen, onSelectDestino, origen, setModoSeleccion]);

  // 5. Marcadores de Origen, Destino y Línea de Trayectoria
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Crear icono SVG para Origen (Verde con antena de rover)
    const crearIconoOrigen = () =>
      L.divIcon({
        className: 'custom-mars-marker marker-origen',
        html: `
          <div class="marker-pin pin-origen">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="marker-label">ORIGEN</div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42]
      });

    // Crear icono SVG para Destino (Rojo con mira/objetivo)
    const crearIconoDestino = () =>
      L.divIcon({
        className: 'custom-mars-marker marker-destino',
        html: `
          <div class="marker-pin pin-destino">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
              <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
            </svg>
          </div>
          <div class="marker-label">DESTINO</div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42]
      });

    // Limpiar marcadores anteriores
    if (markerOrigenRef.current) {
      map.removeLayer(markerOrigenRef.current);
      markerOrigenRef.current = null;
    }
    if (markerDestinoRef.current) {
      map.removeLayer(markerDestinoRef.current);
      markerDestinoRef.current = null;
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Colocar Marcador de Origen
    if (origen && origen.lat !== undefined && origen.lon !== undefined) {
      const marker = L.marker([origen.lat, origen.lon], {
        icon: crearIconoOrigen(),
        draggable: true,
        title: `Origen: ${origen.nombre}`
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12.5px; color: #0f172a; line-height: 1.45;">
          <div style="font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; margin-bottom: 2px;">Punto de Origen</div>
          <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${origen.nombre}</div>
          <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #475569; margin-top: 3px;">${formatearCoordenadas(origen.lat, origen.lon)}</div>
        </div>
      `);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onSelectOrigen({
          nombre: `Punto [${formatearCoordenadas(pos.lat, pos.lng)}]`,
          lat: Number(pos.lat.toFixed(3)),
          lon: Number(pos.lng.toFixed(3))
        });
      });

      marker.addTo(map);
      markerOrigenRef.current = marker;
    }

    // Colocar Marcador de Destino
    if (destino && destino.lat !== undefined && destino.lon !== undefined) {
      const marker = L.marker([destino.lat, destino.lon], {
        icon: crearIconoDestino(),
        draggable: true,
        title: `Destino: ${destino.nombre}`
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12.5px; color: #0f172a; line-height: 1.45;">
          <div style="font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; margin-bottom: 2px;">Punto de Destino</div>
          <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${destino.nombre}</div>
          <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #475569; margin-top: 3px;">${formatearCoordenadas(destino.lat, destino.lon)}</div>
        </div>
      `);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onSelectDestino({
          nombre: `Punto [${formatearCoordenadas(pos.lat, pos.lng)}]`,
          lat: Number(pos.lat.toFixed(3)),
          lon: Number(pos.lng.toFixed(3))
        });
      });

      marker.addTo(map);
      markerDestinoRef.current = marker;
    }

    // Trazar línea de trayectoria entre Origen y Destino
    if (
      origen &&
      destino &&
      origen.lat !== undefined &&
      origen.lon !== undefined &&
      destino.lat !== undefined &&
      destino.lon !== undefined
    ) {
      const latlngs = [
        [origen.lat, origen.lon],
        [destino.lat, destino.lon]
      ];

      const polyline = L.polyline(latlngs, {
        color: '#facc15',
        weight: 3,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      const distancia = calcularDistanciaMarciana(
        origen.lat,
        origen.lon,
        destino.lat,
        destino.lon
      );

      polyline.bindTooltip(`Ruta: ${distancia.toLocaleString()} km`, {
        permanent: false,
        sticky: true,
        className: 'route-tooltip'
      });

      polylineRef.current = polyline;
    }
  }, [origen, destino, onSelectOrigen, onSelectDestino]);

  // Centrar el mapa para ver ambos puntos
  const handleAjustarVista = () => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    if (origen && destino) {
      const bounds = window.L.latLngBounds(
        [origen.lat, origen.lon],
        [destino.lat, destino.lon]
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
    } else if (origen) {
      map.setView([origen.lat, origen.lon], 3);
    } else if (destino) {
      map.setView([destino.lat, destino.lon], 3);
    } else {
      map.setView([0, 0], 1);
    }
  };

  return (
    <div className="mars-map-wrapper">
      {/* Barra superior del Mapa: Selector de Capas de Marte */}
      <div className="mars-map-header">
        <div className="map-title-group">
          <span className="mars-badge">NASA TREK WMTS</span>
          <h3 className="mars-map-title">Cartografía de Marte</h3>
        </div>

        {/* Botones para alternar entre las 3 capas solicitadas */}
        <div className="layers-button-group" role="tablist" aria-label="Capas de Marte">
          {CAPAS_MARTE.map((capa) => {
            const activa = capa.id === capaActivaId;
            return (
              <button
                key={capa.id}
                type="button"
                className={`layer-btn ${activa ? 'active' : ''}`}
                onClick={() => onChangeCapa(capa.id)}
                title={capa.descripcion}
              >
                <span
                  className="layer-indicator-dot"
                  style={{ background: capa.colorTema }}
                />
                {capa.etiquetaCorta}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="map-canvas-container">
        <div
          ref={mapContainerRef}
          className={`leaflet-mars-container ${modoSeleccion ? 'selection-mode-active' : ''}`}
        />

        {/* Fallback visual cuando Leaflet se está cargando */}
        {!mapaListo && (
          <div className="map-loading-overlay">
            <div className="mars-spinner" />
            <p>Conectando con servidores de mosaicos de Marte...</p>
          </div>
        )}

        {/* Indicador de modo de selección activo */}
        {modoSeleccion && (
          <div className="selection-prompt-banner" role="status" aria-live="polite">
            <span className="prompt-pulse" aria-hidden="true" />
            <span className="prompt-text">
              {modoSeleccion === 'origen'
                ? 'Fijar Origen: Haga clic en la superficie marciana para establecer el punto de partida'
                : 'Fijar Destino: Haga clic en la superficie marciana para establecer el punto de llegada'}
            </span>
            <button
              type="button"
              className="prompt-cancel-btn"
              onClick={() => setModoSeleccion(null)}
              aria-label="Cancelar fijación en mapa"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Telemetría de coordenadas bajo el cursor en tiempo real */}
        <div className="cursor-telemetry-badge" aria-live="off">
          {coordenadasCursor ? (
            <span>
              Lat: {coordenadasCursor.lat.toFixed(2)}° | Lon:{' '}
              {coordenadasCursor.lon.toFixed(2)}°
            </span>
          ) : (
            <span>Coordenadas de cursor en espera</span>
          )}
        </div>

        {/* Botón flotante para reenfocar la vista */}
        <button
          type="button"
          className="map-recenter-btn"
          onClick={handleAjustarVista}
          title="Centrar y ajustar vista a la ruta"
          aria-label="Centrar y ajustar vista a la ruta"
        >
          <svg
            className="recenter-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 9v6a9 9 0 0 1-9 9 9 9 0 0 1-9-9V9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Ajustar Vista</span>
        </button>
      </div>

      {/* Pie del mapa con información de la capa activa y enlace WMTS */}
      <div className="mars-map-footer">
        <div className="layer-info-text">
          <strong>Capa activa:</strong> {capaActiva.nombre} &bull;{' '}
          <span>{capaActiva.descripcion}</span>
        </div>
        <a
          href={capaActiva.wmtsCapabilities}
          target="_blank"
          rel="noopener noreferrer"
          className="wmts-link"
          title="Ver especificación WMTS Capabilities XML de NASA"
        >
          Ver XML WMTS
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6h-2v6H5V5z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
