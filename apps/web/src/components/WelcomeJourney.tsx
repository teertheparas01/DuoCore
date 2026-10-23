import {
  Compass,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Train,
  Truck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { roleById } from "../data";
import type { Role } from "../types";
import { GlassCard } from "./GlassCard";
import { SimulatedMap } from "./SimulatedMap";

interface WelcomeJourneyProps {
  role: Role;
  onComplete: () => void;
}

export function WelcomeJourney({ role, onComplete }: WelcomeJourneyProps) {
  const [blur, setBlur] = useState(6);
  const roleDef = roleById(role);

  return (
    <div className="welcome-wrapper">
      {/* Background Simulated Map of Pune Shivaji Nagar */}
      <div className="welcome-map-bg">
        <SimulatedMap blur={blur} interactive={false} />
      </div>

      {/* Direct Welcome Console (Centered macOS Liquid Glass Window) */}
      <div className="welcome-console-overlay">
        <GlassCard className="welcome-console-card macos-window-dialog slide-up">
          {/* macOS window title bar */}
          <div className="dialog-titlebar">
            <div className="macos-traffic-group">
              <span className="traffic-dot dot-red" />
              <span className="traffic-dot dot-yellow" />
              <span className="traffic-dot dot-green" />
            </div>
            <span className="dialog-title">अन्नपूर्ण · Pune Sector 05 Terminal</span>
            <div className="welcome-tag-pill macos-glass-pill">
              <span className="signal-dot signal-dot-live" />
              <span>Live Mesh</span>
            </div>
          </div>

          {/* Console Header */}
          <div className="welcome-console-head">
            <div className="welcome-hero-icon macos-brand-icon">
              <span style={{ fontSize: "1.6rem", fontFamily: "var(--font-hindi)" }}>अ</span>
            </div>
            <div className="welcome-console-titles">
              <span className="eyebrow">Sector 05 Initialized</span>
              <h2>Welcome to Shivaji Nagar, {roleDef.label}</h2>
              <p className="welcome-subline">{roleDef.detail}</p>
            </div>
          </div>

          {/* Quick Area Metric Strip */}
          <div className="welcome-stats-grid">
            <div className="welcome-stat-pill macos-glass-card">
              <div className="stat-icon-wrap" style={{ color: "var(--yellow)" }}>
                <MapPin size={18} />
              </div>
              <div className="stat-content">
                <strong>FC & JM Roads</strong>
                <small>Active Supply Core</small>
              </div>
            </div>

            <div className="welcome-stat-pill macos-glass-card">
              <div className="stat-icon-wrap" style={{ color: "var(--blue)" }}>
                <Route size={18} />
              </div>
              <div className="stat-content">
                <strong>Mutha River Corridor</strong>
                <small>Sangam Confluence Line</small>
              </div>
            </div>

            <div className="welcome-stat-pill macos-glass-card">
              <div className="stat-icon-wrap" style={{ color: "var(--green)" }}>
                <Truck size={18} />
              </div>
              <div className="stat-content">
                <strong>18 Active Riders</strong>
                <small>Capacity Balanced</small>
              </div>
            </div>
          </div>

          {/* Map Blur Control Slider */}
          <div className="welcome-blur-hud macos-glass-card">
            <div className="blur-hud-label">
              <span>Map Focus</span>
              <small>{blur === 0 ? "Fully unblurred" : `${blur}px blur applied`}</small>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              className="macos-slider"
              aria-label="Adjust map blur"
            />
          </div>

          {/* Action to launch workspace */}
          <div className="welcome-console-actions">
            <button
              className="primary-button macos-primary-button welcome-launch-btn"
              onClick={onComplete}
            >
              <Sparkles size={17} />
              <span>Launch {roleDef.label} Workspace</span>
            </button>
          </div>

          <div className="welcome-console-footer">
            <span>
              <ShieldCheck size={14} color="var(--green)" /> Safe-window tracking active
            </span>
            <span>
              <Train size={14} color="var(--purple)" /> Metro viaduct corridor online
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
