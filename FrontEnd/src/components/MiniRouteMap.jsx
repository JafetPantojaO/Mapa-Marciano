import { useEffect, useRef, useState } from 'react';

/**
 * MiniRouteMap - Renderiza un mapa compacto de Leaflet con la visualización
 * gráfica de una ruta específica sobre la superficie de Marte.
 * Incluye carga diferida (IntersectionObserver) para garantizar alta fluidez y 60 FPS
 * incluso al renderizar decenas de rutas encontradas por el algoritmo de Backtracking.
 */
export default function MiniRouteMap({ route, isSelected }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Observador de intersección para inicializar Leaflet solo cuando la tarjeta sea visible
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const L = window.L;
    if (!L || !containerRef.current || !route || !route.coordenadasLeaflet?.length) return;

    // Destruir mapa anterior si existe
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Instanciar mapa ligero Leaflet sin controles intrusivos
    const map = L.map(containerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 6,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false
    });

    // Capa base de relieve MOLA de NASA Trek
    const trekLayer = L.tileLayer(
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0//default/default028mm/{z}/{y}/{x}.jpg',
      {
        minZoom: 0,
        maxZoom: 6,
        noWrap: true,
        opacity: 0.95
      }
    );
    trekLayer.addTo(map);

    const latlngs = route.coordenadasLeaflet;

    // Trazar línea de trayectoria con el color temático de la ruta
    const polyline = L.polyline(latlngs, {
      color: route.color || '#10b981',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Marcadores circulares para paradas intermedias
    latlngs.forEach(([lat, lon], idx) => {
      const isStart = idx === 0;
      const isEnd = idx === latlngs.length - 1;
      const radius = isStart || isEnd ? 6 : 4;
      const fillColor = isStart ? '#10b981' : isEnd ? '#ef4444' : '#ffffff';

      const circle = L.circleMarker([lat, lon], {
        radius,
        color: '#0f172a',
        weight: 2,
        fillColor,
        fillOpacity: 1
      }).addTo(map);

      const nombreParada = route.paradas?.[idx]?.nombre || `Punto ${idx + 1}`;
      circle.bindTooltip(
        `<strong>${nombreParada}</strong>${isStart ? ' (Origen)' : isEnd ? ' (Destino)' : ''}`,
        { direction: 'top', offset: [0, -4] }
      );
    });

    // Ajustar encuadre exacto con margen
    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.3));
      }
    } catch {
      map.setView([0, 0], 1);
    }

    mapRef.current = map;

    // Invalida tamaño si el contenedor cambió dimensiones
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isVisible, route]);

  return (
    <div className={`mini-map-container ${isSelected ? 'selected' : ''}`}>
      <div ref={containerRef} className="mini-map-canvas" />
      <div className="mini-map-badge" style={{ borderColor: route.color }}>
        <span className="mini-map-dot" style={{ backgroundColor: route.color }} />
        <span>{route.distanciaKm.toLocaleString()} km</span>
      </div>
    </div>
  );
}
