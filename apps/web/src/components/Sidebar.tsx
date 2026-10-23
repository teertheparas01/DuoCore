import {
  Activity,
  Boxes,
  ClipboardList,
  Cog,
  Globe,
  HandCoins,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageCircle,
  Route,
  Send,
  Shield,
  Truck,
  Warehouse,
} from "lucide-react";
import { roleById } from "../data";
import type { Role } from "../types";

interface SidebarProps {
  role: Role;
  activeNav: string;
  onNavChange: (nav: string) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  open: boolean;
  onClose: () => void;
}

/** Map nav label -> icon. Falls back to LayoutDashboard. */
const navIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  "Command center": LayoutDashboard,
  Inventory: Boxes,
  Requests: ClipboardList,
  Riders: Truck,
  Activity: Activity,
  "Demand pulse": Globe,
  Incoming: Inbox,
  Capabilities: Shield,
  "Route desk": Route,
  "Available runs": MapPin,
  Cargo: Warehouse,
  Transfers: Send,
  Operations: LayoutDashboard,
  "Dispatch board": ListChecks,
  Interventions: MessageCircle,
  Network: Globe,
};

export function Sidebar({
  role,
  activeNav,
  onNavChange,
  settingsOpen,
  onToggleSettings,
  open,
  onClose,
}: SidebarProps) {
  const roleDef = roleById(role);

  return (
    <>
      <div className={`sidebar-overlay ${open ? "is-visible" : ""}`} onClick={onClose} />

      <aside className={`sidebar macos-sidebar ${open ? "is-open" : ""}`}>
        {/* macOS Traffic Lights Window Header */}
        <div className="sidebar-window-header">
          <div className="macos-traffic-group">
            <span className="traffic-dot dot-red" />
            <span className="traffic-dot dot-yellow" />
            <span className="traffic-dot dot-green" />
          </div>
          <span className="sidebar-city-tag">Pune · Sector 05</span>
        </div>

        {/* Brand */}
        <div className="sidebar-brand">
          <span className="brand-mark macos-brand-icon">अ</span>
          <div className="sidebar-brand-text">
            <strong>अन्नपूर्ण</strong>
            <small>Shivaji Nagar Grid</small>
          </div>
        </div>

        {/* Role Badge */}
        <div className="sidebar-role-badge macos-glass-pill">
          <span className="role-avatar">{roleDef.initials}</span>
          <div className="role-badge-text">
            <span className="role-badge-title">{roleDef.label}</span>
            <span className="role-badge-sub">{roleDef.shortLabel}</span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="sidebar-nav-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {roleDef.nav.map((item) => {
            const Icon = navIcons[item] ?? LayoutDashboard;
            const isActive = activeNav === item;
            return (
              <button
                className={`sidebar-nav-item macos-nav-item ${isActive ? "is-active" : ""}`}
                key={item}
                onClick={() => {
                  onNavChange(item);
                  onClose();
                }}
              >
                <Icon size={17} />
                <span>{item}</span>
                {isActive && <span className="active-glow-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* System Settings (Bottom-Left) */}
        <div className="sidebar-bottom">
          <button
            className={`sidebar-settings macos-glass-button ${settingsOpen ? "is-active" : ""}`}
            onClick={onToggleSettings}
          >
            <Cog size={16} />
            <span>Preferences</span>
            <kbd className="macos-kbd">⌘,</kbd>
          </button>
        </div>
      </aside>
    </>
  );
}
