/* Small shared presentational pieces. */

import { useEffect, useState } from "react";
import { getMetricExplanation, getMetricModalData } from "../lib/statDetails.js";

export function StatCard({ label, value, sub, tone, onClick, explanation }) {
  const infoText = explanation || getMetricExplanation(label);

  return (
    <div
      className="stat clickable"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="label">
        <span className="label-text">{label}</span>
        <span
          className="stat-info-btn"
          aria-label={`Explanation for ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          i
          <span className="stat-tooltip" role="tooltip">
            {infoText}
          </span>
        </span>
      </div>
      <div className="value">{value}</div>
      {sub != null && <div className={`sub${tone ? ` ${tone}` : ""}`}>{sub}</div>}
      <div className="stat-hint">Click for details →</div>
    </div>
  );
}

export function Stats({ cards, children }) {
  const [activeCard, setActiveCard] = useState(null);

  if (children) {
    return <section className="stats">{children}</section>;
  }

  const cardList = Array.isArray(cards) ? cards : [];
  const modalData = activeCard ? getMetricModalData(activeCard) : null;

  return (
    <>
      <section className="stats">
        {cardList.map((c) => (
          <StatCard
            key={c.label}
            {...c}
            onClick={() => setActiveCard(c)}
          />
        ))}
      </section>

      {activeCard && modalData && (
        <Modal
          wide
          title={modalData.title}
          onClose={() => setActiveCard(null)}
          footer={
            <button className="btn-solid" onClick={() => setActiveCard(null)}>
              Close
            </button>
          }
        >
          <div className="stat-modal-content">
            {/* Key Metric Chips */}
            <div className="stat-modal-kpi-grid">
              {modalData.kpis.map((k, i) => (
                <div key={i} className="stat-modal-kpi-card">
                  <div className="kpi-name">{k.name}</div>
                  <div className="kpi-val">{k.value}</div>
                </div>
              ))}
            </div>

            {/* Breakdown Table */}
            <div className="stat-modal-section">
              <h4>{modalData.breakdownTitle}</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {modalData.headers.map((h, i) => (
                        <th
                          key={h}
                          className={i > 0 && i < modalData.headers.length - 1 ? "num" : ""}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={cIdx > 0 && cIdx < row.length - 1 ? "num" : ""}
                            style={cIdx === 0 ? { fontWeight: 600 } : undefined}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Panel({ title, sub, actions, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && <h3>{title}</h3>}
            {sub && <p className="panel-sub">{sub}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "mute", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/** Magnitude bar beside a number inside a table cell. */
export function CellBar({ value, max, color = "var(--series-1)", children }) {
  const w = max > 0 ? Math.max(1, (value / max) * 100) : 0;
  return (
    <div className="cellbar">
      <span>{children}</span>
      <span className="track">
        <span className="fill" style={{ width: `${w}%`, background: color }} />
      </span>
    </div>
  );
}

/** Progress meter with an optional target marker. */
export function Meter({ label, value, display, target, tone }) {
  const pctVal = Math.max(0, Math.min(1, value || 0));
  const color =
    tone === "good" ? "var(--good)"
    : tone === "bad" ? "var(--critical)"
    : tone === "warn" ? "var(--warning)"
    : "var(--series-1)";

  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span className="v">{display}</span>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${pctVal * 100}%`, background: color }} />
        {target != null && (
          <div className="target" style={{ left: `${Math.min(1, target) * 100}%` }} />
        )}
      </div>
      {target != null && (
        <div className="note">
          Target {(target * 100).toFixed(0)}%
          {value >= target ? " · met" : ` · ${((target - value) * 100).toFixed(1)}pp short`}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 820 } : undefined} role="dialog" aria-modal="true">
        <header>
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Loading({ children = "Loading…" }) {
  return (
    <div className="state">
      <div className="spinner" />
      <p>{children}</p>
    </div>
  );
}

export function ErrorState({ title, children }) {
  return (
    <div className="state error">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** Field wrapper used by the customer and settings forms. */
export function Field({ label, children }) {
  return (
    <label className="field" style={{ marginBottom: 0 }}>
      <span style={{
        display: "block", fontSize: 12.5, fontWeight: 600,
        color: "var(--text-dim)", marginBottom: 6,
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}
