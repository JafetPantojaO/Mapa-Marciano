import { useEffect, useRef, useState } from 'react';
import {
  CAPAS_MARTE,
  LUGARES_MARTE,
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
  onChangeCapa,
  rutaActiva
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerOrigenRef = useRef(null);
  const markerDestinoRef = useRef(null);
  const polylineRef = useRef(null);
  const waypointLayerRef = useRef(null);
  const basePointsLayerRef = useRef(null);

  const [mapaListo, setMapaListo] = useState(false);
  const [coordenadasCursor, setCoordenadasCursor] = useState(null);
  const [zoomActual, setZoomActual] = useState(1);
  const [panelSecundarioAbierto, setPanelSecundarioAbierto] = useState(false);

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

  // 2. Crear instancia del mapa de Marte con límites de zoom in y zoom out
  useEffect(() => {
    if (!mapaListo || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    // Configuración estricta de límites de zoom (minZoom: 1, maxZoom: 5)
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 1,
      minZoom: 1, // Límite de Zoom Out para evitar duplicación vacía
      maxZoom: 5, // Límite de Zoom In para mantener máxima nitidez WMTS
      maxBounds: [
        [-90, -180],
        [90, 180]
      ],
      maxBoundsViscosity: 1.0, // Impide arrastre fuera del planeta
      worldCopyJump: false,
      bounceAtZoomLimits: true,
      attributionControl: false
    });

    L.control
      .attribution({
        position: 'bottomright',
        prefix: 'NASA / JPL Mars Trek &bull; Límites de Zoom: 1x a 5x'
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

    map.on('zoomend', () => {
      setZoomActual(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapaListo]);

  // 3. Actualizar la capa de mapa WMTS de NASA Trek al cambiar capaActiva
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const MarsTileLayer = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement('img');
        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', (err) => {
          if (tile.src.includes('.jpg')) {
            tile.src = tile.src.replace('.jpg', '.png');
          } else if (tile.src.includes('.png')) {
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
      minZoom: 1,
      maxZoom: 5,
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

  // 4. Marcadores de referencia para los 25 puntos marcianos con sus nombres visibles
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (basePointsLayerRef.current) {
      map.removeLayer(basePointsLayerRef.current);
      basePointsLayerRef.current = null;
    }

    const layerGroup = L.layerGroup();

    LUGARES_MARTE.forEach((p) => {
      const isOrigen = origen && origen.id === p.id;
      const isDestino = destino && destino.id === p.id;

      if (!isOrigen && !isDestino) {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 5,
          color: '#ffffff',
          weight: 1.5,
          fillColor: '#ea580c',
          fillOpacity: 0.9
        });

        // Nombre de cada punto visible permanentemente en el mapa
        marker.bindTooltip(
          `<strong>${p.nombre}</strong>`,
          {
            permanent: true,
            direction: 'bottom',
            className: 'mars-point-permanent-label',
            offset: [0, 6]
          }
        );

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (modoSeleccion === 'origen') {
            onSelectOrigen(p);
            setModoSeleccion('destino');
          } else if (modoSeleccion === 'destino') {
            onSelectDestino(p);
            setModoSeleccion(null);
          } else {
            if (!origen) {
              onSelectOrigen(p);
              setModoSeleccion('destino');
            } else {
              onSelectDestino(p);
            }
          }
        });

        marker.addTo(layerGroup);
      }
    });

    layerGroup.addTo(map);
    basePointsLayerRef.current = layerGroup;
  }, [origen, destino, modoSeleccion, onSelectOrigen, onSelectDestino, setModoSeleccion]);

  // 5. Manejador de clics en la superficie del mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e) => {
      const lat = Math.max(-90, Math.min(90, Number(e.latlng.lat.toFixed(2))));
      const lon = Number((((((e.latlng.lng + 180) % 360) + 360) % 360) - 180).toFixed(2));

      // Buscar si el clic está muy cerca de algún punto oficial de la red
      const lugarCercano = LUGARES_MARTE.find(
        (l) => Math.hypot(l.lat - lat, l.lon - lon) < 4.5
      );

      const nuevoPunto = lugarCercano
        ? lugarCercano
        : {
            id: `custom-${lat}-${lon}`,
            nombre: `Punto [${formatearCoordenadas(lat, lon)}]`,
            lat,
            lon,
            desc: 'Coordenadas libres en superficie'
          };

      if (modoSeleccion === 'origen') {
        onSelectOrigen(nuevoPunto);
        setModoSeleccion('destino');
      } else if (modoSeleccion === 'destino') {
        onSelectDestino(nuevoPunto);
        setModoSeleccion(null);
      } else {
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

  // 6. Marcadores destacados de Origen y Destino, y trazado de ruta activa
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const crearIconoOrigen = () =>
      L.divIcon({
        className: 'custom-mars-marker marker-origen',
        html: `
          <div class="marker-pin pin-origen">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="marker-label">ORIGEN</div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 40],
        popupAnchor: [0, -40]
      });

    const crearIconoDestino = () =>
      L.divIcon({
        className: 'custom-mars-marker marker-destino',
        html: `
          <div class="marker-pin pin-destino">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
              <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
            </svg>
          </div>
          <div class="marker-label">DESTINO</div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 40],
        popupAnchor: [0, -40]
      });

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
    if (waypointLayerRef.current) {
      map.removeLayer(waypointLayerRef.current);
      waypointLayerRef.current = null;
    }

    // Colocar Origen
    if (origen && origen.lat !== undefined && origen.lon !== undefined) {
      const marker = L.marker([origen.lat, origen.lon], {
        icon: crearIconoOrigen(),
        draggable: true,
        title: `Origen: ${origen.nombre}`
      });

      marker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.4; color: #0f172a;">
          <strong style="color: #10b981; text-transform: uppercase;">Punto de Origen</strong><br>
          <span style="font-weight: 600;">${origen.nombre}</span><br>
          <span style="color: #64748b; font-family: monospace;">${formatearCoordenadas(origen.lat, origen.lon)}</span>
        </div>
      `);

      marker.bindTooltip(
        `<strong>${origen.nombre}</strong>`,
        {
          permanent: true,
          direction: 'bottom',
          className: 'mars-point-permanent-label mars-point-origin-label',
          offset: [0, 16]
        }
      );

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onSelectOrigen({
          id: `custom-${pos.lat.toFixed(2)}-${pos.lng.toFixed(2)}`,
          nombre: `Punto [${formatearCoordenadas(pos.lat, pos.lng)}]`,
          lat: Number(pos.lat.toFixed(2)),
          lon: Number(pos.lng.toFixed(2))
        });
      });

      marker.addTo(map);
      markerOrigenRef.current = marker;
    }

    // Colocar Destino
    if (destino && destino.lat !== undefined && destino.lon !== undefined) {
      const marker = L.marker([destino.lat, destino.lon], {
        icon: crearIconoDestino(),
        draggable: true,
        title: `Destino: ${destino.nombre}`
      });

      marker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.4; color: #0f172a;">
          <strong style="color: #ef4444; text-transform: uppercase;">Punto de Destino</strong><br>
          <span style="font-weight: 600;">${destino.nombre}</span><br>
          <span style="color: #64748b; font-family: monospace;">${formatearCoordenadas(destino.lat, destino.lon)}</span>
        </div>
      `);

      marker.bindTooltip(
        `<strong>${destino.nombre}</strong>`,
        {
          permanent: true,
          direction: 'bottom',
          className: 'mars-point-permanent-label mars-point-destination-label',
          offset: [0, 16]
        }
      );

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onSelectDestino({
          id: `custom-${pos.lat.toFixed(2)}-${pos.lng.toFixed(2)}`,
          nombre: `Punto [${formatearCoordenadas(pos.lat, pos.lng)}]`,
          lat: Number(pos.lat.toFixed(2)),
          lon: Number(pos.lng.toFixed(2))
        });
      });

      marker.addTo(map);
      markerDestinoRef.current = marker;
    }

    // Trazar Ruta Activa seleccionada
    if (rutaActiva && rutaActiva.coordenadasLeaflet && rutaActiva.coordenadasLeaflet.length) {
      const latlngs = rutaActiva.coordenadasLeaflet;
      const polyline = L.polyline(latlngs, {
        color: rutaActiva.color || '#10b981',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      polyline.bindTooltip(
        `<strong>${rutaActiva.nombre}</strong><br>Distancia: ${rutaActiva.distanciaKm.toLocaleString()} km`,
        { sticky: true }
      );
      polylineRef.current = polyline;

      // Puntos de paso intermedios (waypoints)
      const wpGroup = L.layerGroup();
      latlngs.forEach(([lat, lon], idx) => {
        if (idx !== 0 && idx !== latlngs.length - 1) {
          const wpMarker = L.circleMarker([lat, lon], {
            radius: 5,
            color: '#0f172a',
            weight: 2,
            fillColor: rutaActiva.color || '#10b981',
            fillOpacity: 1
          });
          const nombreParada = rutaActiva.paradas?.[idx]?.nombre || `Punto ${idx + 1}`;
          wpMarker.bindTooltip(`Parada ${idx}: ${nombreParada}`, { direction: 'top' });
          wpMarker.addTo(wpGroup);
        }
      });
      wpGroup.addTo(map);
      waypointLayerRef.current = wpGroup;
    } else if (origen && destino) {
      // Línea auxiliar punteada si aún no hay ruta calculada
      const polyline = L.polyline(
        [
          [origen.lat, origen.lon],
          [destino.lat, destino.lon]
        ],
        {
          color: '#facc15',
          weight: 2.5,
          opacity: 0.8,
          dashArray: '6, 8'
        }
      ).addTo(map);
      polylineRef.current = polyline;
    }
  }, [origen, destino, rutaActiva, onSelectOrigen, onSelectDestino]);

  // Centrar y ajustar vista
  const handleAjustarVista = () => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    if (rutaActiva && rutaActiva.coordenadasLeaflet?.length) {
      const bounds = window.L.latLngBounds(rutaActiva.coordenadasLeaflet);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
    } else if (origen && destino) {
      const bounds = window.L.latLngBounds(
        [origen.lat, origen.lon],
        [destino.lat, destino.lon]
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
    } else if (origen) {
      map.setView([origen.lat, origen.lon], 2);
    } else {
      map.setView([0, 0], 1);
    }
  };

  return (
    <div className="mars-map-wrapper full-width-hero">
      {/* Barra superior del Mapa: Selector de Capas de Marte y límites */}
      <div className="mars-map-header">
        <div className="map-title-group">
          <span className="mars-badge">CARTOGRAFÍA GLOBAL DE MARTE</span>
          <h3 className="mars-map-title">Exploración y Ruta del Rover</h3>
          <span className="zoom-limit-indicator">
            Zoom: {zoomActual}x (Límite: 1x - 5x)
          </span>
        </div>

        {/* Acciones de fijación rápida sobre el mapa */}
        <div className="map-quick-actions">
          <button
            type="button"
            className={`btn-action-pin btn-pin-origen ${modoSeleccion === 'origen' ? 'active' : ''}`}
            onClick={() => setModoSeleccion(modoSeleccion === 'origen' ? null : 'origen')}
            title="Haga clic aquí y luego en el mapa para fijar el origen"
          >
            <span className="dot dot-origen" />
            <span>{modoSeleccion === 'origen' ? 'Fijando Origen...' : '1. Fijar Origen'}</span>
          </button>

          <button
            type="button"
            className={`btn-action-pin btn-pin-destino ${modoSeleccion === 'destino' ? 'active' : ''}`}
            onClick={() => setModoSeleccion(modoSeleccion === 'destino' ? null : 'destino')}
            title="Haga clic aquí y luego en el mapa para fijar el destino"
          >
            <span className="dot dot-destino" />
            <span>{modoSeleccion === 'destino' ? 'Fijando Destino...' : '2. Fijar Destino'}</span>
          </button>

          {/* Botón Mapa Principal NASA Mars Trek (Viking MDIM 2.1) */}
          <button
            type="button"
            className={`layer-btn btn-principal-map ${capaActivaId === 'Mars_Viking_MDIM21_ClrMosaic_global_232m' ? 'active' : ''}`}
            onClick={() => {
              onChangeCapa('Mars_Viking_MDIM21_ClrMosaic_global_232m');
              setPanelSecundarioAbierto(false);
            }}
            title="Mapa Principal NASA Trek Viking MDIM 2.1 (232m Color Mosaic)"
          >
            <span className="layer-indicator-dot" style={{ background: '#f59e0b' }} />
            <span>Mapa Principal Viking MDIM 2.1</span>
          </button>

          {/* Botón para deslizar los 3 Mapas Secundarios (Relieve, Polvo y Térmico) */}
          <button
            type="button"
            className={`layer-btn btn-toggle-secondary ${panelSecundarioAbierto || capaActiva.esSecundario ? 'active' : ''}`}
            onClick={() => setPanelSecundarioAbierto(!panelSecundarioAbierto)}
            title="Desplegar pestaña deslizante con los 3 mapas secundarios (Relieve, Polvo y Térmico)"
            aria-expanded={panelSecundarioAbierto}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>Mapas Secundarios</span>
            {capaActiva.esSecundario ? (
              <span className="active-tag-chip" style={{ background: capaActiva.colorTema }}>
                {capaActiva.etiquetaCorta}
              </span>
            ) : (
              <span className="badge-count-pill">3</span>
            )}
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="map-canvas-container hero-canvas">
        <div
          ref={mapContainerRef}
          className={`leaflet-mars-container ${modoSeleccion ? 'selection-mode-active' : ''}`}
        />

        {!mapaListo && (
          <div className="map-loading-overlay">
            <div className="mars-spinner" />
            <p>Conectando con servidores cartográficos de Marte (USGS / NASA)...</p>
          </div>
        )}

        {/* Pestaña deslizante para los 3 Mapas Secundarios: Relieve, Polvo y Térmico */}
        <aside
          className={`sliding-secondary-panel ${panelSecundarioAbierto ? 'is-open' : ''}`}
          aria-label="Pestaña deslizante de mapas secundarios de Marte"
        >
          <div className="panel-slide-header">
            <div className="panel-header-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <h4>Mapas Secundarios</h4>
            </div>
            <button
              type="button"
              className="btn-close-slide-panel"
              onClick={() => setPanelSecundarioAbierto(false)}
              title="Cerrar pestaña deslizante"
              aria-label="Cerrar pestaña deslizante"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p className="panel-slide-info">
            Haga clic para alternar entre los <strong>3 mapas secundarios temáticos</strong> sobre la superficie de Marte:
          </p>

          <div className="secondary-maps-cards-list">
            {/* Los 3 mapas secundarios temáticos provistos */}
            {CAPAS_MARTE.filter((c) => c.esSecundario).map((capa) => {
              const esActiva = capaActivaId === capa.id;
              return (
                <div
                  key={capa.id}
                  className={`secondary-map-card ${esActiva ? 'is-selected' : ''}`}
                  onClick={() => onChangeCapa(capa.id)}
                >
                  <div className="map-card-head">
                    <span className="map-card-badge" style={{ backgroundColor: capa.colorTema }}>
                      {capa.etiquetaCorta}
                    </span>
                    {esActiva && <span className="map-active-badge">Activo</span>}
                  </div>
                  <h5 className="map-card-name">{capa.nombre}</h5>
                  <p className="map-card-desc">{capa.descripcion}</p>
                  <button
                    type="button"
                    className={`btn-choose-secondary ${esActiva ? 'btn-current' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeCapa(capa.id);
                      setPanelSecundarioAbierto(false);
                    }}
                  >
                    {esActiva ? 'Visualizándose en Mapa' : `Desplegar ${capa.etiquetaCorta}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Opción rápida para volver al mapa principal NASA Trek Viking MDIM 2.1 */}
          <div className="panel-slide-footer">
            <button
              type="button"
              className={`btn-return-principal ${capaActivaId === 'Mars_Viking_MDIM21_ClrMosaic_global_232m' ? 'is-principal-active' : ''}`}
              onClick={() => {
                onChangeCapa('Mars_Viking_MDIM21_ClrMosaic_global_232m');
                setPanelSecundarioAbierto(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>Volver al Mapa Principal Viking MDIM 2.1</span>
            </button>
          </div>
        </aside>

        {/* Banner de instrucción para selección interactiva */}
        {modoSeleccion && (
          <div className="selection-prompt-banner" role="status" aria-live="polite">
            <span className="prompt-pulse" aria-hidden="true" />
            <span className="prompt-text">
              {modoSeleccion === 'origen'
                ? 'Modo Fijar Origen: Haga clic en cualquier punto de la superficie marciana para colocar el punto de partida.'
                : 'Modo Fijar Destino: Haga clic en cualquier punto de la superficie marciana para colocar el punto de llegada.'}
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

        {/* Pestañas flotantes de Origen y Destino movidas a la esquina inferior derecha */}
        <div className="map-floating-status corner-bottom-right" aria-label="Puntos de origen y destino">
          <div className="floating-point-chip chip-origen">
            <div className="chip-left-indicator">
              <span className="dot dot-origen" />
              <span className="chip-role">Origen:</span>
            </div>
            <div className="chip-right-details">
              <strong>{origen ? origen.nombre : 'Sin fijar'}</strong>
              {origen && (
                <span className="chip-coords">{formatearCoordenadas(origen.lat, origen.lon)}</span>
              )}
            </div>
          </div>

          <div className="floating-point-chip chip-destino">
            <div className="chip-left-indicator">
              <span className="dot dot-destino" />
              <span className="chip-role">Destino:</span>
            </div>
            <div className="chip-right-details">
              <strong>{destino ? destino.nombre : 'Sin fijar'}</strong>
              {destino && (
                <span className="chip-coords">{formatearCoordenadas(destino.lat, destino.lon)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Telemetría de coordenadas bajo el cursor en tiempo real (esquina inferior izquierda) */}
        <div className="cursor-telemetry-badge corner-bottom-left" aria-live="off">
          {coordenadasCursor ? (
            <span>
              Lat: {coordenadasCursor.lat.toFixed(2)}° | Lon: {coordenadasCursor.lon.toFixed(2)}°
            </span>
          ) : (
            <span>Posicione el cursor sobre Marte</span>
          )}
        </div>

        {/* Botón flotante para reenfocar la vista (esquina superior derecha) */}
        <button
          type="button"
          className="map-recenter-btn corner-top-right"
          onClick={handleAjustarVista}
          title="Centrar y ajustar vista a los puntos"
          aria-label="Centrar y ajustar vista a los puntos"
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

      {/* Pie del mapa con información de capa y controles de zoom */}
      <div className="mars-map-footer">
        <div className="layer-info-text">
          <strong>Capa activa:</strong> {capaActiva.nombre} &bull; <span>{capaActiva.descripcion}</span>
        </div>
        <div className="footer-right-indicators">
          <span className="zoom-rule-badge">Zoom min: 1 | Zoom max: 5</span>
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
    </div>
  );
}
