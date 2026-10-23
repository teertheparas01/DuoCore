import { ArrowRight, CircleHelp, LockKeyhole, MapPin, Sparkles, UsersRound } from "lucide-react";
import { roles } from "../data";
import type { Role } from "../types";
import { GlassCard } from "./GlassCard";

interface LoginScreenProps {
  selectedRole: Role;
  onRoleChange: (role: Role) => void;
  onContinue: () => void;
}

export function LoginScreen({ selectedRole, onRoleChange, onContinue }: LoginScreenProps) {
  return (
    <main className="login-page macos-desktop-backdrop">
      {/* Dynamic ambient macOS orbs */}
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />
      <div className="login-orbit login-orbit-three" />

      {/* macOS Window Shell for Login */}
      <div className="login-shell">
        <section className="login-intro">
          <div className="brand-lockup">
            <span className="brand-mark macos-brand-icon">अ</span>
            <div>
              <p className="brand-devanagari">अन्नपूर्ण</p>
              <p className="brand-caption">Civic logistics · Pune Edition</p>
            </div>
          </div>

          <div className="intro-copy">
            <div className="intro-badge macos-glass-pill">
              <MapPin size={13} color="var(--yellow)" />
              <span>Pune Sector: Shivaji Nagar & River Corridor</span>
            </div>
            <h1>Every surplus has a next stop before time runs out.</h1>
            <p>
              Real-time civic logistics linking kitchens, rain baseras, and volunteer riders
              across JM Road, FC Road, and COEP along the Mutha River.
            </p>
          </div>

          <div className="intro-signals macos-glass-card">
            <div className="signal-row">
              <span className="signal-dot signal-dot-live" />
              <span>Shivaji Nagar Live Grid</span>
              <strong>24 routes active</strong>
            </div>
            <div className="signal-row">
              <span className="signal-dot signal-dot-warm" />
              <span>Safe Delivery Window</span>
              <strong>96% completed on time</strong>
            </div>
            <div className="signal-row">
              <span className="signal-dot signal-dot-cold" />
              <span>Cold Chain / Storage</span>
              <strong>Agri College Reserve Ready</strong>
            </div>
          </div>

          <p className="login-quote">
            “The right food, to the right people in Pune, before it turns into waste.”
          </p>
        </section>

        {/* macOS Floating Dialog Card */}
        <GlassCard className="login-card macos-window-dialog">
          {/* macOS window titlebar */}
          <div className="dialog-titlebar">
            <div className="macos-traffic-group">
              <span className="traffic-dot dot-red" />
              <span className="traffic-dot dot-yellow" />
              <span className="traffic-dot dot-green" />
            </div>
            <span className="dialog-title">Select Access Role</span>
            <div className="login-lock">
              <LockKeyhole size={14} strokeWidth={2.2} />
            </div>
          </div>

          <div className="login-card-head">
            <div>
              <p className="eyebrow">Authentication Prototype</p>
              <h2>Choose your console</h2>
            </div>
          </div>

          <p className="login-helper">
            Operating in Pune demo mode. Select an operational perspective to enter the simulated network.
          </p>

          <div className="role-grid" role="radiogroup" aria-label="Choose your role">
            {roles.map((role) => (
              <button
                className={`role-tile macos-glass-tile ${selectedRole === role.id ? "is-selected" : ""}`}
                key={role.id}
                onClick={() => onRoleChange(role.id)}
                role="radio"
                aria-checked={selectedRole === role.id}
              >
                <span className="role-avatar">{role.initials}</span>
                <span className="role-tile-copy">
                  <strong>{role.label}</strong>
                  <small>{role.shortLabel}</small>
                </span>
                <span className="role-check" aria-hidden="true">
                  {selectedRole === role.id ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>

          <button className="primary-button login-continue macos-primary-button" onClick={onContinue}>
            <span>Enter Shivaji Nagar Workspace</span>
            <ArrowRight size={17} />
          </button>

          <div className="login-card-foot">
            <span>
              <Sparkles size={14} color="var(--yellow)" /> Simulated Hackathon Prototype
            </span>
            <button className="icon-button subtle" aria-label="About this demo">
              <CircleHelp size={16} />
            </button>
          </div>
        </GlassCard>

        <div className="login-footnote">
          <UsersRound size={14} /> Pune Municipal Corporation (PMC) & Community Aid Coordination
        </div>
      </div>
    </main>
  );
}
