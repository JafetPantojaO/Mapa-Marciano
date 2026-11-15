import React from 'react';

/**
 * RoverTimelineController - Controles de avance del rover por la ruta marciana
 * Slider de 0 a 100% y botón de reproducción / pausa.
 */
export default function RoverTimelineController({
  progreso,
  setProgreso,
  reproduciendo,
  setReproduciendo,
  distanciaRecorridaKm = 0,
  distanciaTotalKm = 0,
  tramoActual = 1,
  totalTramos = 1,
  velocidad = 1,
  setVelocidad
}) {
  const handleTogglePlay = () => {
    if (progreso >= 100) {
      setProgreso(0);
      setReproduciendo(true);
    } else {
      setReproduciendo(!reproduciendo);
    }
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setProgreso(val);
  };

  const handlePasoAnterior = () => {
    setProgreso((prev) => Math.max(0, Number((prev - 5).toFixed(1))));
  };

  const handlePasoSiguiente = () => {
    setProgreso((prev) => Math.min(100, Number((prev + 5).toFixed(1))));
  };

  return (
    <div className="rover-timeline-controller-card">
      <div className="timeline-top-row">
        <div className="timeline-title-group">
          <span className="controller-badge">CONTROL DE TRAYECTORIA</span>
          <span className="controller-status">
            {reproduciendo ? 'Rover en avance...' : progreso >= 100 ? 'Misión completada' : 'En pausa'}
          </span>
          <span className="controller-tramo-chip">
            Tramo {tramoActual} de {totalTramos}
          </span>
        </div>

        <div className="timeline-distance-readout">
          <strong>{Math.round(distanciaRecorridaKm).toLocaleString()} km</strong>
          <span> / {Math.round(distanciaTotalKm).toLocaleString()} km</span>
          <span className="timeline-percent">({progreso.toFixed(1)}%)</span>
        </div>
      </div>

      {/* Slider de 0 a 100% con interpolación lineal */}
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          step="0.2"
          value={progreso}
          onChange={handleSliderChange}
          className="rover-progress-slider"
          aria-label="Avance del rover en porcentaje de la ruta"
        />
        <div
          className="slider-track-fill"
          style={{ width: `${progreso}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Botones de acción: Reproducir/Pausa, pasos y selector de velocidad */}
      <div className="timeline-actions-row">
        <div className="action-buttons-group">
          <button
            type="button"
            className="btn-step-nav"
            onClick={handlePasoAnterior}
            title="Retroceder 5%"
            aria-label="Retroceder 5%"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>

          <button
            type="button"
            className={`btn-play-pause-toggle ${reproduciendo ? 'is-playing' : ''}`}
            onClick={handleTogglePlay}
            aria-label={reproduciendo ? 'Pausar avance del rover' : 'Reproducir avance del rover'}
          >
            {reproduciendo ? (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>Pausar</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{progreso >= 100 ? 'Reiniciar' : 'Avanzar'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-step-nav"
            onClick={handlePasoSiguiente}
            title="Adelantar 5%"
            aria-label="Adelantar 5%"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
            </svg>
          </button>
        </div>

        <div className="timeline-speed-group">
          <span className="speed-label">Velocidad:</span>
          {[1, 2, 4].map((v) => (
            <button
              key={v}
              type="button"
              className={`btn-speed-pill ${velocidad === v ? 'active' : ''}`}
              onClick={() => setVelocidad && setVelocidad(v)}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
