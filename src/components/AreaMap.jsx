import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { rm, rmCompact, num, pct } from "../lib/format.js";

/* Geographic & operational coordinates for the 11 Malaysian States + Federal Territories */
const STATE_COORDS = {
  Perlis: {
    x: 100, y: 50, lat: 6.4449, lng: 100.2048,
    type: "State", region: "northern", capital: "Kangar", zone: "ZN-PLS-01"
  },
  Kedah: {
    x: 130, y: 88, lat: 6.1184, lng: 100.3685,
    type: "State", region: "northern", capital: "Alor Setar", zone: "ZN-KDH-01"
  },
  "Pulau Pinang": {
    x: 65, y: 135, lat: 5.4141, lng: 100.3288,
    type: "State", region: "northern", capital: "Georgetown", zone: "ZN-PNG-01"
  },
  Perak: {
    x: 150, y: 175, lat: 4.5975, lng: 101.0901,
    type: "State", region: "northern", capital: "Ipoh", zone: "ZN-PRK-01"
  },
  Kelantan: {
    x: 270, y: 105, lat: 6.1254, lng: 102.2381,
    type: "State", region: "eastcoast", capital: "Kota Bharu", zone: "ZN-KTN-01"
  },
  Terengganu: {
    x: 365, y: 155, lat: 5.3117, lng: 103.1324,
    type: "State", region: "eastcoast", capital: "Kuala Terengganu", zone: "ZN-TRG-01"
  },
  Pahang: {
    x: 325, y: 245, lat: 3.8077, lng: 103.3260,
    type: "State", region: "eastcoast", capital: "Kuantan", zone: "ZN-PHG-01"
  },
  Selangor: {
    x: 135, y: 290, lat: 3.0738, lng: 101.5183,
    type: "State", region: "central", capital: "Shah Alam", zone: "ZN-SEL-01"
  },
  "W.P. Kuala Lumpur": {
    x: 235, y: 285, lat: 3.1390, lng: 101.6869,
    type: "Federal Territory", region: "central", capital: "Kuala Lumpur", zone: "ZN-WPKL-01"
  },
  "Negeri Sembilan": {
    x: 250, y: 335, lat: 2.7258, lng: 101.9424,
    type: "State", region: "southern", capital: "Seremban", zone: "ZN-NSN-01"
  },
  Melaka: {
    x: 275, y: 375, lat: 2.1896, lng: 102.2501,
    type: "State", region: "southern", capital: "Bandar Melaka", zone: "ZN-MLK-01"
  },
  Johor: {
    x: 380, y: 400, lat: 1.4927, lng: 103.7414,
    type: "State", region: "southern", capital: "Johor Bahru", zone: "ZN-JHR-01"
  },
};

/* SVG outline contour for Peninsular Malaysia */
const PENINSULAR_PATH =
  "M 90 40 L 150 32 L 210 52 L 285 92 L 340 135 L 400 185 L 430 250 L 445 320 L 435 380 L 415 425 L 375 420 L 300 395 L 245 365 L 180 320 L 155 270 L 135 210 L 95 155 L 75 105 L 85 55 Z";

export default function AreaMap({ rows, totalArrears }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("real"); // real | vector
  const [tileStyle, setTileStyle] = useState("dark"); // dark | light | osm
  const [metric, setMetric] = useState("arrears"); // arrears | vacancy | coverage
  const [regionFilter, setRegionFilter] = useState("all"); // all | central | northern | eastcoast | southern
  const [activeArea, setActiveArea] = useState(null);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayerRef = useRef(null);

  // Combine rows with state coordinates and territorial metadata
  const mapData = useMemo(() => {
    if (!rows) return [];
    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    const maxVac = Math.max(...rows.map((r) => r.vacantPremises), 1);

    return rows.map((r) => {
      const geo = STATE_COORDS[r.area] || { x: 200, y: 200, lat: 3.14, lng: 101.69, region: "central", type: "State" };
      const valRatio = r.value / maxVal;
      const vacRatio = r.vacantPremises / maxVac;

      return {
        ...r,
        ...geo,
        valRatio,
        vacRatio,
      };
    });
  }, [rows]);

  const filteredData = useMemo(() => {
    if (regionFilter === "all") return mapData;
    return mapData.filter((item) => item.region === regionFilter);
  }, [mapData, regionFilter]);

  // Marker style generator
  const getMarkerStyle = (item) => {
    if (metric === "arrears") {
      const r = Math.max(12, Math.min(26, 10 + item.valRatio * 18));
      const color =
        item.valRatio > 0.65
          ? "#ef4444"
          : item.valRatio > 0.35
          ? "#f59e0b"
          : "#3b82f6";
      return { r, color, valText: rmCompact(item.value) };
    } else if (metric === "vacancy") {
      const vacancyRate = item.accounts ? item.vacantPremises / item.accounts : 0;
      const r = Math.max(12, Math.min(24, 10 + item.vacRatio * 16));
      const color =
        vacancyRate > 0.06 ? "#dc2626" : vacancyRate > 0.03 ? "#f59e0b" : "#10b981";
      return { r, color, valText: `${num(item.vacantPremises)} vac` };
    } else {
      const r = 16;
      const color =
        item.treatmentCoverage >= 0.85
          ? "#10b981"
          : item.treatmentCoverage >= 0.72
          ? "#3b82f6"
          : "#f59e0b";
      return { r, color, valText: pct(item.treatmentCoverage, 0) };
    }
  };

  // Real Open-Source Leaflet GIS Map initialization
  useEffect(() => {
    if (viewMode !== "real" || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [4.2105, 101.9758], // Peninsular Malaysia center
        zoom: 7,
        minZoom: 5,
        maxZoom: 12,
        zoomControl: true,
      });

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Update Basemap Tile Layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      tileStyle === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : tileStyle === "light"
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Clear existing Leaflet markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Render interactive Leaflet circle markers
    filteredData.forEach((item) => {
      const { r, color } = getMarkerStyle(item);
      const isHovered = activeArea === item.area;

      const circle = L.circleMarker([item.lat, item.lng], {
        radius: isHovered ? r + 4 : r,
        color: color,
        fillColor: color,
        fillOpacity: isHovered ? 0.9 : 0.72,
        weight: isHovered ? 3 : 2,
      }).addTo(map);

      const popupContent = `
        <div style="font-family: var(--font-sans, system-ui, sans-serif); min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">${item.area}</strong>
            <span style="font-size: 10px; background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              ${item.type}
            </span>
          </div>
          <div style="font-size: 11.5px; color: #64748b; margin-bottom: 8px;">
            Capital: <strong>${item.capital}</strong> · Zone ${item.zone}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; color: #64748b;">Arrears Value:</span>
              <strong style="font-size: 12.5px; color: ${color};">RM ${item.value.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; color: #64748b;">Accounts:</span>
              <strong style="font-size: 12px; color: #1e293b;">${num(item.accounts)} accts (${pct(item.share)})</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 11px; color: #64748b;">Vacant Premises:</span>
              <strong style="font-size: 12px; color: #1e293b;">${num(item.vacantPremises)}</strong>
            </div>
          </div>
          <button
            onclick="window.location.href='/customers?area=${encodeURIComponent(item.area)}'"
            style="width: 100%; background: #2563eb; color: #ffffff; border: none; padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;"
          >
            Inspect ${item.area} Customers &rarr;
          </button>
        </div>
      `;

      circle.bindPopup(popupContent);

      circle.on("mouseover", () => setActiveArea(item.area));
      circle.on("mouseout", () => setActiveArea(null));

      markersRef.current.push(circle);
    });

    // Invalidate map size so tiles load cleanly inside container
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [viewMode, tileStyle, filteredData, metric, activeArea]);

  const selectedItem = activeArea ? mapData.find((d) => d.area === activeArea) : null;

  return (
    <div className="map-container-shell">
      {/* Map Header Toolbar */}
      <div className="map-toolbar">
        <div className="map-tabs">
          <span className="map-toolbar-label">Map Mode:</span>
          <button
            className={`map-tab${viewMode === "real" ? " active" : ""}`}
            onClick={() => setViewMode("real")}
          >
            🗺️ Real GIS Map (OpenStreetMap / CARTO)
          </button>
          <button
            className={`map-tab${viewMode === "vector" ? " active" : ""}`}
            onClick={() => setViewMode("vector")}
          >
            📐 Clean Contour Map
          </button>
        </div>

        {viewMode === "real" && (
          <div className="map-tabs">
            <span className="map-toolbar-label">Basemap Style:</span>
            <button
              className={`map-tab${tileStyle === "dark" ? " active" : ""}`}
              onClick={() => setTileStyle("dark")}
            >
              🌙 Dark Map
            </button>
            <button
              className={`map-tab${tileStyle === "light" ? " active" : ""}`}
              onClick={() => setTileStyle("light")}
            >
              ☀️ Voyager Light
            </button>
            <button
              className={`map-tab${tileStyle === "osm" ? " active" : ""}`}
              onClick={() => setTileStyle("osm")}
            >
              🌐 OSM Standard
            </button>
          </div>
        )}

        <div className="map-tabs">
          <span className="map-toolbar-label">View Metric:</span>
          <button
            className={`map-tab${metric === "arrears" ? " active" : ""}`}
            onClick={() => setMetric("arrears")}
          >
            Arrears Concentration
          </button>
          <button
            className={`map-tab${metric === "vacancy" ? " active" : ""}`}
            onClick={() => setMetric("vacancy")}
          >
            Vacancy Signals
          </button>
          <button
            className={`map-tab${metric === "coverage" ? " active" : ""}`}
            onClick={() => setMetric("coverage")}
          >
            Treatment Coverage
          </button>
        </div>

        <div className="map-tabs">
          <span className="map-toolbar-label">Region:</span>
          <button
            className={`map-tab${regionFilter === "all" ? " active" : ""}`}
            onClick={() => setRegionFilter("all")}
          >
            All 12 Territories
          </button>
          <button
            className={`map-tab${regionFilter === "central" ? " active" : ""}`}
            onClick={() => setRegionFilter("central")}
          >
            Central &amp; KL (2)
          </button>
          <button
            className={`map-tab${regionFilter === "northern" ? " active" : ""}`}
            onClick={() => setRegionFilter("northern")}
          >
            Northern (4)
          </button>
          <button
            className={`map-tab${regionFilter === "eastcoast" ? " active" : ""}`}
            onClick={() => setRegionFilter("eastcoast")}
          >
            East Coast (3)
          </button>
          <button
            className={`map-tab${regionFilter === "southern" ? " active" : ""}`}
            onClick={() => setRegionFilter("southern")}
          >
            Southern (3)
          </button>
        </div>
      </div>

      {/* Split Map & Territorial Leaderboard View */}
      <div className="map-split-container">
        {/* Left Side: Map Pane */}
        <div className="map-canvas-pane" style={{ position: "relative", minHeight: 480 }}>
          {viewMode === "real" ? (
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: 480,
                borderRadius: "var(--radius)",
                overflow: "hidden",
                zIndex: 1,
              }}
            />
          ) : (
            <svg
              viewBox="0 0 520 450"
              className="map-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Map Grid Guidelines */}
              <g className="map-grid" opacity="0.12">
                <line x1="0" y1="112" x2="520" y2="112" stroke="currentColor" strokeDasharray="4 4" />
                <line x1="0" y1="225" x2="520" y2="225" stroke="currentColor" strokeDasharray="4 4" />
                <line x1="0" y1="337" x2="520" y2="337" stroke="currentColor" strokeDasharray="4 4" />
                <line x1="130" y1="0" x2="130" y2="450" stroke="currentColor" strokeDasharray="4 4" />
                <line x1="260" y1="0" x2="260" y2="450" stroke="currentColor" strokeDasharray="4 4" />
                <line x1="390" y1="0" x2="390" y2="450" stroke="currentColor" strokeDasharray="4 4" />
              </g>

              {/* Regional Landmass Contour */}
              <g className="map-landmass">
                <path d={PENINSULAR_PATH} className="map-land-shape" />

                {/* Regional boundary dividers */}
                <path
                  d="M 170 145 Q 220 180 320 160"
                  fill="none"
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
                <path
                  d="M 180 270 Q 230 260 330 290"
                  fill="none"
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
                <path
                  d="M 230 355 Q 280 360 360 375"
                  fill="none"
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />

                <text x="35" y="28" className="map-region-text">11 MALAYSIAN STATES &amp; FEDERAL TERRITORIES</text>
                <text x="360" y="320" className="map-water-text">SOUTH CHINA SEA</text>
                <text x="40" y="350" className="map-water-text">STRAITS OF MALACCA</text>
              </g>

              {/* Markers for 11 Malaysian States + Federal Territories */}
              {filteredData.map((item) => {
                const { r, color, valText } = getMarkerStyle(item);
                const isHovered = activeArea === item.area;

                return (
                  <g
                    key={item.area}
                    transform={`translate(${item.x}, ${item.y})`}
                    className={`map-marker-group${isHovered ? " is-active" : ""}`}
                    onMouseEnter={() => setActiveArea(item.area)}
                    onMouseLeave={() => setActiveArea(null)}
                    onClick={() => navigate(`/customers?area=${encodeURIComponent(item.area)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Outer Pulsing Ring */}
                    {item.valRatio > 0.4 && (
                      <circle
                        r={r + 7}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        className="map-pulse-ring"
                      />
                    )}

                    {/* Marker Bubble */}
                    <circle
                      r={isHovered ? r + 3 : r}
                      fill={color}
                      fillOpacity={isHovered ? 0.95 : 0.84}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.8}
                      className="map-bubble"
                    />

                    {/* Marker Center Dot */}
                    <circle r="3" fill="#ffffff" />

                    {/* State Name Label with background offset for zero overlap */}
                    <text
                      y={r + 13}
                      textAnchor="middle"
                      className="map-marker-label"
                    >
                      {item.area}
                    </text>
                    <text
                      y={r + 24}
                      textAnchor="middle"
                      className="map-marker-subval"
                      fill={color}
                    >
                      {valText}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Floating Detail Card Tooltip */}
          {selectedItem && (
            <div className="map-floating-card" style={{ zIndex: 1000, position: "absolute", bottom: 16, left: 16, right: 16, pointerEvents: "auto" }}>
              <div className="map-card-head">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>{selectedItem.area}</h4>
                    <span className={`badge ${selectedItem.type === "Federal Territory" ? "info" : "mute"}`} style={{ fontSize: 10 }}>
                      {selectedItem.type}
                    </span>
                  </div>
                  <span className="dim" style={{ fontSize: 11.5 }}>
                    Capital: {selectedItem.capital} · Zone {selectedItem.zone || selectedItem.igisZoneId}
                  </span>
                </div>
                <button
                  className="btn-solid"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  onClick={() => navigate(`/customers?area=${encodeURIComponent(selectedItem.area)}`)}
                >
                  Inspect Accounts &rarr;
                </button>
              </div>

              <div className="map-card-stats">
                <div className="map-card-stat-box">
                  <span className="lbl">Total Arrears</span>
                  <span className="val">{rm(selectedItem.value)}</span>
                  <span className="sub">{pct(selectedItem.share)} of nationwide book</span>
                </div>
                <div className="map-card-stat-box">
                  <span className="lbl">Accounts</span>
                  <span className="val">{num(selectedItem.accounts)}</span>
                  <span className="sub">Avg {Math.round(selectedItem.avgDays)} days overdue</span>
                </div>
                <div className="map-card-stat-box">
                  <span className="lbl">Vacant Signals</span>
                  <span className="val" style={{ color: selectedItem.vacantPremises > 15 ? "var(--critical)" : "inherit" }}>
                    {num(selectedItem.vacantPremises)}
                  </span>
                  <span className="sub">
                    {pct(selectedItem.accounts ? selectedItem.vacantPremises / selectedItem.accounts : 0)} vacancy rate
                  </span>
                </div>
                <div className="map-card-stat-box">
                  <span className="lbl">Coverage</span>
                  <span className="val" style={{ color: "var(--brand)" }}>
                    {pct(selectedItem.treatmentCoverage, 0)}
                  </span>
                  <span className="sub">{num(selectedItem.sewerageConnections)} connections</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Territory Leaderboard */}
        <div className="map-leaderboard-pane">
          <div className="map-leaderboard-head">
            <strong>Territory Arrears League Table</strong>
            <span className="dim" style={{ fontSize: 11.5 }}>11 States + Federal Territories</span>
          </div>

          <div className="map-leaderboard-list">
            {mapData.map((t, idx) => {
              const isSelected = activeArea === t.area;
              const isFilteredIn = regionFilter === "all" || t.region === regionFilter;

              return (
                <div
                  key={t.area}
                  className={`map-leaderboard-row${isSelected ? " active" : ""}${!isFilteredIn ? " dimmed" : ""}`}
                  onMouseEnter={() => setActiveArea(t.area)}
                  onMouseLeave={() => setActiveArea(null)}
                  onClick={() => navigate(`/customers?area=${encodeURIComponent(t.area)}`)}
                >
                  <div className="map-lb-rank">#{idx + 1}</div>
                  <div className="map-lb-info">
                    <div className="map-lb-name-row">
                      <span className="map-lb-name">{t.area}</span>
                      <span className={`badge ${t.type === "Federal Territory" ? "info" : "mute"}`} style={{ fontSize: 9.5, padding: "1px 5px" }}>
                        {t.type === "Federal Territory" ? "FT" : "State"}
                      </span>
                    </div>
                    <div className="map-lb-bar-track">
                      <div
                        className="map-lb-bar-fill"
                        style={{ width: `${Math.max(4, t.valRatio * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="map-lb-values">
                    <div className="map-lb-val num">{rmCompact(t.value)}</div>
                    <div className="map-lb-sub dim">{pct(t.share)} · {num(t.accounts)} accts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Footer Legend */}
      <div className="map-footer-bar">
        <div className="map-legend-items">
          <span className="dim" style={{ fontSize: 12 }}>Marker Scale:</span>
          <span className="legend-chip"><span className="dot red" /> High Concentration (&gt;RM 200k)</span>
          <span className="legend-chip"><span className="dot amber" /> Moderate (&gt;RM 100k)</span>
          <span className="legend-chip"><span className="dot blue" /> Normal (&lt;RM 100k)</span>
        </div>
        <span className="dim" style={{ fontSize: 12 }}>
          Click any state on the map or leaderboard to filter customer records.
        </span>
      </div>
    </div>
  );
}
