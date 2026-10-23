import {
  Compass,
  Layers,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Radio,
  Route,
  Search,
  Train,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { mapMarkers } from "../data";
import type { MapMarker } from "../types";

interface SimulatedMapProps {
  blur?: number;
  interactive?: boolean;
  selectedMarkerId?: string;
  onMarkerSelect?: (marker: MapMarker) => void;
}

const markerIcon = {
  donor: Warehouse,
  receiver: Radio,
  rider: Navigation,
  hub: Route,
};

export function SimulatedMap({
  blur = 0,
  interactive = true,
  selectedMarkerId,
  onMarkerSelect,
}: SimulatedMapProps) {
  const [zoom, setZoom] = useState(1);
  const [activeLayer, setActiveLayer] = useState("Live network");

  return (
    <div className="map-frame macos-glass-container">
      <div
        className="map-surface"
        style={{
          filter: `blur(${blur}px) saturate(${120 + Math.round((1 - blur / 14) * 35)}%)`,
          transform: `scale(${zoom})`,
        }}
      >
        <div className="map-wash" />

        {/* SVG Map of Shivaji Nagar, Pune */}
        <svg
          className="map-lines"
          viewBox="0 0 1000 680"
          role="img"
          aria-label="Shivaji Nagar, Pune Civic Logistics Map"
        >
          <defs>
            {/* Water gradient */}
            <linearGradient id="muthaWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E5C9A" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#2E86DE" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1A4A7A" stopOpacity="0.4" />
            </linearGradient>

            {/* Metro line pattern */}
            <pattern id="metroLine" width="12" height="4" patternUnits="userSpaceOnUse">
              <rect width="6" height="4" fill="#A259FF" />
              <rect x="6" width="6" height="4" fill="#6A1B9A" />
            </pattern>
          </defs>

          {/* District Zones */}
          <g className="map-blocks">
            {/* Agri College Campus Area */}
            <rect x="80" y="50" width="220" height="150" rx="20" />
            {/* Shivaji Nagar Station & ST Depot */}
            <rect x="520" y="90" width="230" height="110" rx="18" />
            {/* COEP Technological University */}
            <rect x="440" y="270" width="160" height="110" rx="18" />
            {/* Fergusson College & BMCC Area */}
            <rect x="90" y="340" width="190" height="190" rx="22" />
            {/* JM Road & Sambhaji Park */}
            <rect x="300" y="460" width="160" height="140" rx="18" />
            {/* District Court & Sancheti */}
            <rect x="390" y="220" width="120" height="75" rx="14" />
            {/* Sangam Ghat & Confluence Zone */}
            <rect x="730" y="370" width="200" height="150" rx="22" />
          </g>

          {/* Mutha River (Pune) flowing SW to NE towards Sangam Confluence */}
          <path
            className="map-river"
            d="M 280 690 C 340 560, 390 490, 480 430 C 560 380, 680 340, 800 290 C 890 250, 960 170, 1030 110"
            fill="none"
            stroke="url(#muthaWater)"
            strokeWidth="38"
            strokeLinecap="round"
          />

          {/* Mula River joining from North at Sangam */}
          <path
            d="M 980 -20 C 930 110, 890 200, 800 290"
            fill="none"
            stroke="url(#muthaWater)"
            strokeWidth="30"
            strokeLinecap="round"
          />

          {/* Bridges across Mutha River */}
          {/* Shivaji Bridge */}
          <line x1="365" y1="480" x2="435" y2="525" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
          {/* Dengle Bridge */}
          <line x1="475" y1="395" x2="550" y2="445" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
          {/* Sangam Bridge near COEP */}
          <line x1="615" y1="330" x2="685" y2="385" stroke="#F5C542" strokeWidth="5" strokeLinecap="round" opacity="0.75" />

          {/* Major Roads in Shivaji Nagar */}
          {/* Ganeshkhind Road (NW toward University) */}
          <path className="map-road major" d="M -30 130 C 120 150, 260 190, 390 230 S 520 235, 620 215" />
          
          {/* Jangali Maharaj Road (JM Road) */}
          <path className="map-road major" d="M 330 680 C 350 540, 370 410, 400 300 S 440 220, 520 170" />

          {/* Fergusson College Road (FC Road) */}
          <path className="map-road major" d="M 190 680 C 210 520, 230 380, 270 290 S 330 220, 400 190" />

          {/* Old Mumbai-Pune Highway / Railway Line */}
          <path className="map-road rail" d="M 1030 90 L 750 140 L 530 180 L 370 200 L 70 200" stroke="#E74C3C" strokeDasharray="8 6" strokeWidth="2.5" fill="none" opacity="0.4" />

          {/* Connecting Streets & Chowks */}
          <path className="map-road" d="M 110 460 C 210 470, 310 480, 430 490" />
          <path className="map-road" d="M 140 330 C 240 320, 340 310, 480 320 S 710 325, 850 310" />
          <path className="map-road" d="M 520 170 C 580 180, 700 240, 830 340 S 960 480, 1020 560" />

          {/* Pune Metro Aqua Line Elevated Viaduct */}
          <path
            d="M 270 680 C 350 520, 440 400, 550 330 S 730 270, 920 220"
            fill="none"
            stroke="#9B51E0"
            strokeWidth="3.5"
            strokeDasharray="10 4"
            opacity="0.6"
          />

          {/* Dynamic AidFlow Dispatch Routes */}
          {/* Active Run: FC Road -> Sangam Bridge -> Rain Basera */}
          <path
            className="map-route map-route-live"
            d="M 260 367 L 400 300 L 520 299 L 640 190"
            fill="none"
            stroke="#F5C542"
            strokeWidth="3.5"
            strokeDasharray="9 6"
          />
          {/* Secondary Route: JM Road -> Sangam Camp */}
          <path
            className="map-route map-route-secondary"
            d="M 420 490 L 480 430 L 615 330 L 760 422"
            fill="none"
            stroke="#3A8FD6"
            strokeWidth="3"
            strokeDasharray="7 5"
          />

          {/* Landmark Labels */}
          <g className="map-labels">
            <text x="110" y="115">Agri College Grounds</text>
            <text x="560" y="135">Shivaji Nagar Rly Station</text>
            <text x="460" y="325">COEP Tech Campus</text>
            <text x="120" y="440">Fergusson College Rd</text>
            <text x="320" y="540">JM Road · Sambhaji Park</text>
            <text x="760" y="450">Sangam Confluence</text>
            <text x="480" y="465" className="water-label">Mutha River ~</text>
          </g>
        </svg>

        {/* Dynamic Glowing Pulses */}
        <div className="map-pulse map-pulse-one" style={{ top: "35%", left: "22%" }} />
        <div className="map-pulse map-pulse-two" style={{ bottom: "30%", right: "24%" }} />

        {/* Map Markers */}
        {mapMarkers.map((marker) => {
          const Icon = markerIcon[marker.kind];
          const isSelected = selectedMarkerId === marker.id;

          return (
            <button
              className={`map-marker marker-${marker.tone} ${isSelected ? "is-selected" : ""}`}
              key={marker.id}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              onClick={() => onMarkerSelect?.(marker)}
              aria-label={`${marker.label}: ${marker.meta}`}
            >
              <span className="marker-ring macos-glass-pill">
                <Icon size={15} strokeWidth={2.4} />
              </span>
              <span className="marker-label macos-glass-card">
                <strong>{marker.label}</strong>
                <small>{marker.meta}</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating macOS Liquid Glass Controls */}
      <div className="map-topbar">
        {/* macOS Traffic Lights + Layer Tabs */}
        <div className="macos-traffic-group">
          <span className="traffic-dot dot-red" />
          <span className="traffic-dot dot-yellow" />
          <span className="traffic-dot dot-green" />
        </div>

        <div className="map-layer-tabs macos-segmented-control">
          {["Live network", "Expiry watch", "Capacity"].map((layer) => (
            <button
              className={activeLayer === layer ? "is-active" : ""}
              key={layer}
              onClick={() => setActiveLayer(layer)}
            >
              {layer}
            </button>
          ))}
        </div>

        {interactive && (
          <div className="map-topbar-right">
            <button className="map-search-button macos-glass-button">
              <Search size={14} />
              <span>Search Shivaji Nagar...</span>
              <kbd className="macos-kbd">⌘K</kbd>
            </button>
          </div>
        )}
      </div>

      {/* macOS Floating Controls HUD */}
      {interactive && (
        <div className="map-controls macos-glass-card">
          <button
            onClick={() => setZoom((value) => Math.min(1.22, value + 0.05))}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus size={16} />
          </button>
          <div className="control-divider" />
          <button
            onClick={() => setZoom((value) => Math.max(0.88, value - 0.05))}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus size={16} />
          </button>
          <div className="control-divider" />
          <button onClick={() => setZoom(1)} aria-label="Recenter map" title="Recenter Pune Map">
            <LocateFixed size={16} />
          </button>
        </div>
      )}

      {/* macOS Bottom Status Bar */}
      <div className="map-statusbar macos-glass-bar">
        <div className="map-location-tag">
          <span className="live-dot" />
          <strong>Pune · Shivaji Nagar Grid</strong>
          <span className="grid-subtext">(JM Rd, FC Rd, COEP, Mutha River)</span>
        </div>
        <div className="map-status-items">
          <span>
            <Train size={13} style={{ opacity: 0.7 }} /> Metro Corridor Active
          </span>
          <span>
            <strong>18</strong> active handoffs
          </span>
          <span className="badge-risk">
            <strong>02</strong> high expiry risk
          </span>
          <span className="sync-time">Updated live</span>
        </div>
      </div>
    </div>
  );
}
