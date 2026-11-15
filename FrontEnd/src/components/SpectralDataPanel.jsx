import React from 'react';

/**
 * SpectralDataPanel - Panel de Datos Espectrales y Geofísicos del Rover
 * 
 * Cumple con la regla crítica de ORIGEN DE LOS DATOS:
 * - Prohibido inventar o simular valores: cada valor proviene del muestreo real de la capa.
 * - Si un valor no está disponible, muestra "sin dato".
 * - Si es cálculo derivado o modelo estimado, se marca visualmente como 'estimado' y se indica la fórmula.
 */
export default function SpectralDataPanel({ datos, cargando }) {
  if (!datos) {
    return (
      <div className="spectral-data-card spectral-data-empty">
        <div className="spectral-card-header">
          <span className="spectral-badge">PANEL ESPECTRAL</span>
          <h4 className="spectral-title">Datos Espectrales</h4>
        </div>
        <p className="spectral-empty-text">
          Inicie el avance del rover o desplace el control de progreso para muestrear las capas espectrales reales en superficie.
        </p>
      </div>
    );
  }

  const { tramoHeader, waypointCercano, variables = [], mineralDominante } = datos;

  return (
    <div className="spectral-data-card">
      {/* Encabezado: "Datos espectrales · tramo X de N" y nombre del waypoint más cercano */}
      <div className="spectral-card-header">
        <div className="spectral-title-block">
          <div className="spectral-badge-row">
            <span className="spectral-badge">TELEMETRÍA ESPECTRAL EN VIVO</span>
            {cargando && <span className="spectral-loading-indicator">Muestreando capas...</span>}
          </div>
          <h4 className="spectral-title">{tramoHeader || 'Datos espectrales'}</h4>
          <span className="spectral-waypoint-sub">
            Waypoint más cercano: <strong>{waypointCercano || 'Sin fijar'}</strong>
          </span>
        </div>
      </div>

      {/* Variables espectrales a mostrar: [Óptico, Térmico y Polvo] */}
      <div className="spectral-variables-list">
        {variables.map((v) => {
          const esSinDato = v.valor === null || v.valorDisplay === 'sin dato';
          const esEstimado = Boolean(v.esEstimado);

          return (
            <div key={v.id} className="spectral-variable-row">
              <div className="variable-meta-line">
                <div className="variable-label-group">
                  <span className="variable-dot" data-var={v.id} />
                  <span className="variable-label">{v.etiqueta}</span>
                  {esEstimado ? (
                    <span className="badge-tag-estimado" title="Modelo geofísico estimado">
                      estimado
                    </span>
                  ) : (
                    <span className="badge-tag-real" title="Muestreo satelital directo de capa WMTS">
                      muestreo real
                    </span>
                  )}
                </div>

                <div className="variable-val-group">
                  <strong className={`variable-value ${esSinDato ? 'val-sin-dato' : ''}`}>
                    {v.valorDisplay || 'sin dato'}
                  </strong>
                </div>
              </div>

              {/* Barra horizontal de intensidad */}
              <div className="spectral-bar-track" aria-hidden="true">
                <div
                  className={`spectral-bar-fill fill-${v.id} ${esSinDato ? 'fill-empty' : ''}`}
                  style={{ width: `${esSinDato ? 0 : Math.max(3, v.porcentajeBarra || 0)}%` }}
                />
              </div>

              {/* Sub-cálculo derivado con fórmula explícita si aplica (p. ej. temperatura superficial) */}
              {v.temperaturaDerivada && (
                <div className="derived-calc-box">
                  <div className="derived-meta">
                    <span className="derived-title">Temperatura superficial estimada:</span>
                    <strong className="derived-val">{v.temperaturaDerivada.valorDisplay}</strong>
                    {v.temperaturaDerivada.esEstimado && (
                      <span className="badge-tag-estimado">estimado</span>
                    )}
                  </div>
                  {v.temperaturaDerivada.formula && (
                    <div className="derived-formula" title="Fórmula matemática usada">
                      <code>{v.temperaturaDerivada.formula}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Debajo: Mineral dominante y etiqueta de nivel semántico (verde / ámbar / rojo) */}
      {mineralDominante && (
        <div className="dominant-mineral-box">
          <div className="mineral-head">
            <span className="mineral-sec-label">MINERAL DOMINANTE DETECTADO</span>
            <span
              className={`mineral-level-badge level-${mineralDominante.nivelColor || 'ambar'}`}
              title={`Nivel de concentración / respuesta espectral: ${mineralDominante.nivel}`}
            >
              Nivel: <strong>{mineralDominante.nivel?.toUpperCase()}</strong>
            </span>
          </div>

          <div className="mineral-name-line">
            <h5 className="mineral-name">{mineralDominante.nombre}</h5>
            {mineralDominante.formulaMineral && (
              <span className="mineral-chem-formula">{mineralDominante.formulaMineral}</span>
            )}
          </div>

          {mineralDominante.descripcion && (
            <p className="mineral-desc">{mineralDominante.descripcion}</p>
          )}
        </div>
      )}

      {/* Nota de integridad y procedencia de datos */}
      <div className="spectral-footer-note">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>
          Datos muestreados píxel a píxel en capas oficiales de NASA Mars Trek (MOLA / TES MGS). Sin interpolación sintética.
        </span>
      </div>
    </div>
  );
}
