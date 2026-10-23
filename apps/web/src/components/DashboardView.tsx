import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Filter,
  HandCoins,
  Inbox,
  Layers,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Route,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Train,
  TrendingUp,
  Truck,
  User,
  Warehouse,
  X,
  Zap,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { mapMarkers, roleById } from "../data";
import type { MapMarker, Role } from "../types";
import { GlassCard } from "./GlassCard";
import { Sidebar } from "./Sidebar";
import { SimulatedMap } from "./SimulatedMap";
import { api, type ApiBatch, type ApiReceiver, type ApiRequest, type ApiRider, type ApiReservation, type ApiIncident, type ApiTransfer, type ApiState, type ApiAuditEvent } from "../api";

interface DashboardViewProps {
  role: Role;
  onLogout: () => void;
}

/** Demo user names by role */
const demoUsers: Record<Role, { name: string; email: string }> = {
  donor: { name: "Rajesh Joshi", email: "rajesh.j@fcroad.pune.org" },
  receiver: { name: "Anita Kulkarni", email: "anita.k@rainbasera.pune.gov" },
  rider: { name: "Akash Deshmukh", email: "akash.d@coep.pune.ac.in" },
  coordinator: { name: "Vikram Gaikwad", email: "vikram.g@pmc.pune.gov.in" },
};

export function DashboardView({ role, onLogout }: DashboardViewProps) {
  const roleDef = roleById(role);
  const user = demoUsers[role];

  const [activeNav, setActiveNav] = useState(roleDef.nav[0]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings toggles
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Live API state
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [receivers, setReceivers] = useState<ApiReceiver[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [riders, setRiders] = useState<ApiRider[]>([]);
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [incidents, setIncidents] = useState<ApiIncident[]>([]);
  const [transfers, setTransfers] = useState<ApiTransfer[]>([]);
  const [auditEvents, setAuditEvents] = useState<ApiAuditEvent[]>([]);
  const [simulationSettings, setSimulationSettings] = useState<ApiState['simulation'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newRequestModal, setNewRequestModal] = useState(false);
  const [newBatchModal, setNewBatchModal] = useState(false);

  const [backendConnected, setBackendConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("Connecting to AidFlow API...");

  const refreshLiveState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await api.getState();
      setBackendConnected(true);
      setSyncStatus(`Live API · Port 3000 · ${state.batches.length} Batches · ${state.receiverRequests.length} Requests · ${state.riders.length} Riders`);

      setBatches(state.batches);
      setReceivers(state.receivers);
      setRequests(state.receiverRequests);
      setRiders(state.riders);
      setReservations(state.reservations);
      setIncidents(state.incidents);
      setTransfers(state.transfers);
      setAuditEvents(state.auditEvents || []);
      setSimulationSettings(state.simulation);
    } catch (err: any) {
      setBackendConnected(false);
      setSyncStatus("Standalone Mode (Click Seed Grid to connect)");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLiveState();
    const unsub = api.subscribeEvents(() => {
      refreshLiveState();
    });
    return () => unsub();
  }, [refreshLiveState]);

  // Computed UI state from live data
  const requestsList = requests.map((r) => {
    const receiver = receivers.find((rec) => rec.id === r.receiverId);
    return {
      id: r.id.toUpperCase(),
      shelter: receiver?.name || `Shelter (${r.receiverId})`,
      items: `${r.requestedQuantity} ${r.unit} (${r.category.replace(/_/g, " ")})`,
      urgency: r.urgency >= 3 ? "High" : r.urgency === 2 ? "Medium" : "Normal",
      timeNeeded: "Active demand",
      status: r.status === "OPEN" ? "Unfulfilled" : r.status === "FULFILLED" ? "Delivered" : "In Transit",
      dietary: "Verified Category",
      contact: receiver?.location?.address || "Shivaji Nagar",
    };
  });

  const inventoryBatches = batches.map((b) => ({
    id: b.id.toUpperCase(),
    source: b.location.address || "Shivaji Nagar Center",
    item: `${b.quantity} ${b.unit} · ${b.itemName}`,
    cookedAt: new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    expiresIn: `${Math.max(1, Math.round((new Date(b.effectiveExpiry).getTime() - Date.now()) / 60000))} mins`,
    temp: b.storageCondition === "AMBIENT" ? "Ambient (24°C)" : "Controlled",
    weight: `${(b.quantity * 0.4).toFixed(1)} kg`,
    status: b.status.replace(/_/g, " "),
    assignedRider: b.status === "AVAILABLE" ? "Unassigned" : "Dispatched",
  }));

  const dispatchQueue = reservations
    .filter((r) => r.status === "RESERVED")
    .map((r) => {
      const batch = batches.find((b) => b.id === r.batchId);
      const request = requests.find((req) => req.id === r.receiverRequestId);
      const receiver = request ? receivers.find((rec) => rec.id === request.receiverId) : null;
      const rider = riders.find((rd) => rd.id === r.riderId);
      return {
        id: r.id.toUpperCase(),
        origin: batch?.location.address || "Unknown Kitchen",
        destination: receiver?.name || `Request ${r.receiverRequestId}`,
        cargo: `${r.quantity} ${r.unit} (${batch?.itemName || "Unknown"})`,
        recommendedRider: rider?.name || "Unassigned",
        vehicle: rider?.vehicleType || "Unknown",
        matchScore: "95%",
        eta: `${r.route?.travelMinutes || "?"} min`,
        expiryMargin: `${Math.max(0, Math.round((new Date(batch?.effectiveExpiry || "").getTime() - Date.now()) / 60000))} mins remaining`,
        status: "Pending Approval",
      };
    });

  const interventionItems = incidents
    .filter((i) => i.severity === "CRITICAL" || i.severity === "WARNING")
    .map((inc) => {
      const batch = batches.find((b) => b.id === inc.batchId);
      const request = inc.receiverRequestId ? requests.find((r) => r.id === inc.receiverRequestId) : null;
      const rider = inc.riderId ? riders.find((rd) => rd.id === inc.riderId) : null;
      return {
        id: inc.id,
        type: inc.type,
        severity: inc.severity.toLowerCase() as "critical" | "warning" | "notice",
        title: inc.message,
        details: batch ? `Batch: ${batch.itemName} (${batch.id})` : "System incident",
        recommendation: "Review incident details and take action",
        actionLabel: "Resolve Incident",
        status: "Action Required" as const,
      };
    });

  const handleMarkerSelect = useCallback((marker: MapMarker) => {
    setSelectedMarker((prev) => (prev?.id === marker.id ? null : marker));
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const fulfillRequest = async (requestId: string) => {
    try {
      const batchesList = await api.listBatches();
      const openBatch = batchesList.find((b) => b.balance.available > 0);
      if (openBatch) {
        await api.allocateBatch(openBatch.id);
        await refreshLiveState();
      }
    } catch (e) {
      console.warn("Fulfill API call:", e);
      alert("Failed to fulfill request: " + (e as Error).message);
    }
  };

  const approveDispatch = (reservationId: string) => {
    // This would call an approve endpoint, but for now just refresh
    refreshLiveState();
  };

  const resolveIntervention = (incidentId: string) => {
    // Could add an API call to mark incident as resolved
    refreshLiveState();
  };

  const isMapTab =
    activeNav === "Command center" ||
    activeNav === "Demand pulse" ||
    activeNav === "Route desk" ||
    activeNav === "Operations";

  return (
    <div className="dashboard-container fade-in">
      <div className="macos-window-shell">
        <div className="dashboard">
          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn macos-glass-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Sidebar */}
          <Sidebar
            role={role}
            activeNav={activeNav}
            onNavChange={setActiveNav}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((v) => !v)}
            open={sidebarOpen}
            onClose={closeSidebar}
          />

          {/* Main Area */}
          <div className="dashboard-main">
            {/* macOS Frosted Top Bar */}
            <div className="dashboard-topbar macos-glass-bar">
              <div className="topbar-left">
                <div>
                  <div className="topbar-location-pill">
                    <MapPin size={12} />
                    <span>Pune · Shivaji Nagar Grid</span>
                  </div>
                  <h3>{activeNav}</h3>
                  <span className="topbar-breadcrumb">
                    {roleDef.label} Portal · {roleDef.shortLabel}
                  </span>
                </div>
              </div>

              <div className="topbar-actions">
                <div className="topbar-pulse-indicator" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`signal-dot ${backendConnected ? "signal-dot-live" : ""}`} style={{ backgroundColor: backendConnected ? "#10b981" : "#94a3b8" }} />
                  <small style={{ fontWeight: 500 }}>{syncStatus}</small>
                </div>

                <button
                  className="macos-glass-button"
                  style={{ fontSize: "0.78rem", padding: "5px 11px", display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 8 }}
                  onClick={async () => {
                    try {
                      await api.seedScenario();
                      await refreshLiveState();
                    } catch (err: any) {
                      alert("Seed failed: " + err.message);
                    }
                  }}
                  title="Seed 180 Meals + 3 Shelters + 3 Riders in backend"
                >
                  <Sparkles size={13} color="#f59e0b" />
                  <span>Seed Grid</span>
                </button>

                <button
                  className="macos-glass-button"
                  style={{ fontSize: "0.78rem", padding: "5px 11px", display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 8 }}
                  onClick={async () => {
                    try {
                      await api.advanceTime(15);
                      await refreshLiveState();
                    } catch (err: any) {
                      alert("Advance failed: " + err.message);
                    }
                  }}
                  title="Advance simulation time by 15 minutes"
                >
                  <Clock size={13} color="#38bdf8" />
                  <span>+15m</span>
                </button>

                {/* Profile Pill (Top-Right) */}
                <button
                  className="profile-pill macos-glass-pill"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="User Profile"
                >
                  <span className="profile-avatar">{roleDef.initials}</span>
                  <span className="profile-info">
                    <strong>{user.name}</strong>
                    <small>{roleDef.label}</small>
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.7 }} />
                </button>
              </div>
            </div>

            {/* Profile Dropdown */}
            {profileOpen && (
              <GlassCard className="profile-panel macos-glass-modal">
                <div className="profile-panel-header">
                  <span className="profile-panel-avatar">{roleDef.initials}</span>
                  <div className="profile-panel-meta">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                    <span className="profile-location-badge">📍 Shivaji Nagar, Pune</span>
                  </div>
                </div>
                <div className="profile-panel-actions">
                  <button className="profile-panel-action" onClick={() => setProfileOpen(false)}>
                    <User size={15} /> Account Settings
                  </button>
                  <button
                    className="profile-panel-action danger"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={15} /> Switch Role or Sign Out
                  </button>
                </div>
              </GlassCard>
            )}

            {/* View Switcher based on Sidebar Navigation */}
            {isMapTab ? (
              /* MAP + DETAIL WORKSPACE */
              <div className="dashboard-content">
                <div className="dashboard-map-area">
                  <SimulatedMap
                    interactive
                    selectedMarkerId={selectedMarker?.id}
                    onMarkerSelect={handleMarkerSelect}
                  />
                </div>

                <div className={`dashboard-detail-panel macos-glass-sidebar ${selectedMarker ? "is-open" : ""}`}>
                  {selectedMarker ? (
                    <div className="role-dashboard slide-up" key={selectedMarker.id}>
                      <div className="detail-panel-head">
                        <div>
                          <span className="eyebrow">Location Detail</span>
                          <h3>{selectedMarker.label}</h3>
                        </div>
                        <button className="detail-close macos-glass-button" onClick={() => setSelectedMarker(null)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className={`detail-marker-badge tone-${selectedMarker.tone}`}>
                        <span className="chip-dot" />
                        {selectedMarker.status}
                      </div>

                      <p className="detail-meta-text">{selectedMarker.meta}</p>

                      <div className="detail-info-grid">
                        <div className="metric-card accent-yellow macos-glass-card">
                          <small>Category</small>
                          <strong style={{ fontSize: "0.88rem", textTransform: "capitalize" }}>
                            {selectedMarker.kind}
                          </strong>
                        </div>
                        <div className="metric-card accent-blue macos-glass-card">
                          <small>Pune Sector</small>
                          <strong style={{ fontSize: "0.88rem" }}>
                            {selectedMarker.x < 35
                              ? "FC Rd / Agri College"
                              : selectedMarker.x < 65
                              ? "JM Rd / COEP Bridge"
                              : "Sangam Ghat / Confluence"}
                          </strong>
                        </div>
                      </div>

                      <div className="role-quick-actions" style={{ marginTop: 6 }}>
                        <button className="quick-action-btn primary macos-glass-button" onClick={() => setActiveNav("Requests")}>
                          <Send size={14} /> Immediate Dispatch
                        </button>
                        <button className="quick-action-btn macos-glass-button" onClick={() => setActiveNav("Inventory")}>
                          <Package size={14} /> View Batches
                        </button>
                      </div>

                      <div className="macos-panel-divider" />
                      <OverviewSummary role={role} onNav={setActiveNav} />
                    </div>
                  ) : (
                    <OverviewSummary role={role} onNav={setActiveNav} />
                  )}
                </div>
              </div>
            ) : activeNav === "Requests" ? (
              /* REQUESTS MANAGEMENT PAGE */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Shelter & Community Demand Requests</h2>
                    <p>Live food requests verified across Shivaji Nagar shelters, rain baseras, and camps.</p>
                  </div>
                  <button className="primary-button macos-primary-button" onClick={() => setNewRequestModal(true)}>
                    <Plus size={16} />
                    <span>Create New Demand Request</span>
                  </button>
                </div>

                <div className="requests-grid">
                  {requestsList.map((req) => (
                    <GlassCard className="request-card macos-glass-card" key={req.id}>
                      <div className="request-card-top">
                        <span className="req-id-badge">{req.id}</span>
                        <span className={`status-badge status-${req.status.toLowerCase().replace(" ", "-")}`}>
                          {req.status}
                        </span>
                      </div>
                      <h3>{req.shelter}</h3>
                      <div className="req-highlight-row">
                        <Package size={16} color="var(--yellow)" />
                        <strong>{req.items}</strong>
                      </div>
                      <div className="req-details-grid">
                        <div>
                          <small>Urgency</small>
                          <span className={`urgency-tag urgency-${req.urgency.toLowerCase()}`}>
                            {req.urgency}
                          </span>
                        </div>
                        <div>
                          <small>Deadline</small>
                          <span className="clock-tag">
                            <Clock size={12} /> {req.timeNeeded}
                          </span>
                        </div>
                        <div>
                          <small>Dietary Check</small>
                          <span>{req.dietary}</span>
                        </div>
                        <div>
                          <small>Coordinator Contact</small>
                          <span>{req.contact}</span>
                        </div>
                      </div>
                      <div className="request-card-actions">
                        {req.status === "Unfulfilled" ? (
                          <button
                            className="primary-button macos-primary-button"
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={() => fulfillRequest(req.id)}
                          >
                            <Send size={15} />
                            <span>Match & Dispatch from FC Road</span>
                          </button>
                        ) : (
                          <div className="transit-indicator">
                            <CheckCircle2 size={16} color="var(--green)" />
                            <span>Rider 04 Dispatched via Dengle Bridge</span>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ) : activeNav === "Inventory" ? (
              /* DONOR INVENTORY & BATCH MANAGEMENT */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Surplus Aid & Perishable Inventory</h2>
                    <p>Track cooking times, safe consumption thresholds, and dynamic allocation splits.</p>
                  </div>
                  <button className="primary-button macos-primary-button" onClick={() => setNewBatchModal(true)}>
                    <Plus size={16} />
                    <span>Publish Surplus Batch</span>
                  </button>
                </div>

                <div className="inventory-table-container macos-glass-card">
                  <table className="macos-table">
                    <thead>
                      <tr>
                        <th>Batch ID</th>
                        <th>Preparation Source</th>
                        <th>Item Description</th>
                        <th>Weight</th>
                        <th>Cooked At</th>
                        <th>Safe Window</th>
                        <th>Thermal State</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryBatches.map((batch) => (
                        <tr key={batch.id}>
                          <td><strong>{batch.id}</strong></td>
                          <td>{batch.source}</td>
                          <td><strong>{batch.item}</strong></td>
                          <td>{batch.weight}</td>
                          <td>{batch.cookedAt}</td>
                          <td>
                            <span className="clock-tag timer-critical">
                              <Clock size={12} /> {batch.expiresIn}
                            </span>
                          </td>
                          <td>{batch.temp}</td>
                          <td>
                            <span className={`status-badge status-${batch.status.toLowerCase().replace(" ", "-")}`}>
                              {batch.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="macos-glass-button"
                              onClick={() => {
                                alert(`Splitting ${batch.id} into 2 transport sub-batches of equal weight.`);
                              }}
                            >
                              Split Batch
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeNav === "Riders" || activeNav === "Available runs" ? (
              /* RIDERS & RUNS BOARD */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Volunteer Riders & Active Runs</h2>
                    <p>Shivaji Nagar road network capacity, carrier balance, and run allocations.</p>
                  </div>
                  <div className="header-stat-pills">
                    <span className="macos-glass-pill" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                      🟢 {riders.length} Active Riders
                    </span>
                    <span className="macos-glass-pill" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                      📦 {riders.reduce((sum, r) => sum + r.capacity.weightKg, 0)} kg Total Moving Capacity
                    </span>
                  </div>
                </div>

                <div className="riders-grid">
                  {riders.map((rider) => {
                    const activeReservation = reservations.find(
                      (res) => res.riderId === rider.id && ["RESERVED", "PICKUP_CONFIRMED", "IN_TRANSIT"].includes(res.status)
                    );
                    const batch = activeReservation ? batches.find((b) => b.id === activeReservation.batchId) : null;
                    const request = activeReservation ? requests.find((req) => req.id === activeReservation.receiverRequestId) : null;
                    const receiver = request ? receivers.find((rec) => rec.id === request.receiverId) : null;
                    return (
                      <GlassCard className="rider-card macos-glass-card" key={rider.id}>
                        <div className="rider-header">
                          <div className="rider-avatar">
                            <Truck size={18} />
                          </div>
                          <div>
                            <h3>{rider.name}</h3>
                            <small>{rider.vehicleType || "Unknown Vehicle"}</small>
                          </div>
                          <span className={`status-badge status-${rider.status.toLowerCase().replace(" ", "-")}`}>
                            {rider.status}
                          </span>
                        </div>
                        <div className="rider-details">
                          <div className="rider-capacity-bar-wrap">
                            <div className="cap-label">
                              <span>Capacity Utilized</span>
                              <strong>
                                {rider.committedLoad.weightKg.toFixed(1)} / {rider.capacity.weightKg} kg
                              </strong>
                            </div>
                            <div className="cap-bar-track">
                              <div className="cap-bar-fill" style={{ width: `${Math.min(100, (rider.committedLoad.weightKg / rider.capacity.weightKg) * 100)}%` }} />
                            </div>
                          </div>
                          <p>📍 <strong>Location:</strong> {rider.currentLocation?.address || "Unknown"}</p>
                          {activeReservation && batch && receiver && (
                            <p>🛣️ <strong>Assigned Run:</strong> {batch.location.address} → {receiver.name}</p>
                          )}
                          <p>⏱️ <strong>ETA:</strong> {activeReservation ? `${activeReservation.route?.travelMinutes || "?"} mins` : "Available"}</p>
                        </div>
                        <div className="rider-actions">
                          <button className="macos-glass-button" style={{ width: "100%" }}>
                            <Route size={14} /> Track Live GPS Coordinates
                          </button>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            ) : activeNav === "Incoming" || activeNav === "Cargo" || activeNav === "Transfers" ? (
              /* INCOMING / CARGO / TRANSFERS */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Live Shipments & Cargo In-Transit</h2>
                    <p>Real-time delivery progress across Mutha River bridges into Shivaji Nagar intake zones.</p>
                  </div>
                </div>

                <div className="cargo-timeline-list">
                  {reservations
                    .filter((r) => ["PICKUP_CONFIRMED", "IN_TRANSIT", "TRANSFERRED"].includes(r.status))
                    .map((res) => {
                      const batch = batches.find((b) => b.id === res.batchId);
                      const request = requests.find((req) => req.id === res.receiverRequestId);
                      const receiver = request ? receivers.find((rec) => rec.id === request.receiverId) : null;
                      const rider = riders.find((rd) => rd.id === res.riderId);
                      const progress = res.status === "DELIVERED" ? "100%" : res.status === "IN_TRANSIT" ? "60%" : "25%";
                      return (
                        <GlassCard className="shipment-card macos-glass-card" key={res.id}>
                          <div className="shipment-head">
                            <div>
                              <span className="eyebrow">Active Handoff</span>
                              <h3>{batch?.itemName || "Unknown"} ({res.quantity} {res.unit})</h3>
                              <small>Carrier: {rider?.name || "Unassigned"}</small>
                            </div>
                            <span className="eta-badge">{res.route?.travelMinutes || "?"} min left</span>
                          </div>

                          <div className="shipment-progress-wrap">
                            <div className="progress-labels">
                              <span>{batch?.location.address || "Origin"} → {receiver?.name || "Destination"}</span>
                              <strong>{progress} Completed</strong>
                            </div>
                            <div className="cap-bar-track">
                              <div className="cap-bar-fill" style={{ width: progress }} />
                            </div>
                          </div>

                          <div className="shipment-checks">
                            <span><ShieldCheck size={14} color="var(--green)" /> Temp: {batch?.storageCondition || "Unknown"}</span>
                            <span><Clock size={14} color="var(--yellow)" /> Safe Window: {Math.max(0, Math.round((new Date(batch?.effectiveExpiry || "").getTime() - Date.now()) / 60000))} mins</span>
                          </div>

                          <button
                            className="primary-button macos-primary-button"
                            onClick={() => alert("Handoff confirmed and signed into shelter inventory.")}
                          >
                            <CheckCircle2 size={16} /> Confirm Receipt & Intake
                          </button>
                        </GlassCard>
                      );
                    })}
                </div>
              </div>
            ) : activeNav === "Capabilities" ? (
              /* SHELTER CAPABILITIES */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Shelter & NGO Capabilities Matrix</h2>
                    <p>Verify intake criteria so incompatible donations (e.g. raw groceries without cooking gas) are never sent.</p>
                  </div>
                </div>

                <div className="capabilities-grid">
                  {[
                    { title: "Clean Potable Drinking Water", desc: "Can receive dry ration kits and dehydration-sensitive goods", status: true },
                    { title: "Refrigerated Cold Holding Storage", desc: "Can hold dairy, dairy sweets, and prepared salads safely", status: true },
                    { title: "Commercial Kitchen Re-Heating Facility", desc: "Equipped to safely reheat bulk curries and rice before service", status: true },
                    { title: "Dedicated Safe Dining Hall", desc: "Seated dining capacity for 120 persons under hygienic roof", status: true },
                    { title: "Special Allergen & Diet Separation", desc: "Separated counter for nut-free and pure vegetarian preparation", status: false },
                    { title: "Emergency Medical & First-Aid Post", desc: "Trained paramedic available during night shelter hours", status: true },
                  ].map((cap, i) => (
                    <GlassCard className="cap-item-card macos-glass-card" key={i}>
                      <div className="cap-icon-status">
                        {cap.status ? (
                          <CheckCircle2 size={24} color="var(--green)" />
                        ) : (
                          <X size={24} color="var(--red)" />
                        )}
                      </div>
                      <div>
                        <h3>{cap.title}</h3>
                        <p>{cap.desc}</p>
                      </div>
                      <div className="cap-toggle-action">
                        <span className={`status-badge ${cap.status ? "status-in-transit" : "status-critical-window"}`}>
                          {cap.status ? "Verified Active" : "Unavailable"}
                        </span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ) : activeNav === "Dispatch board" ? (
              /* ── DISTINCT PAGE 1: COORDINATOR DISPATCH BOARD ── */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Dispatch Board & Automated Load Matching</h2>
                    <p>Live capacity-aware engine matching surplus kitchens with shelter demand across Shivaji Nagar.</p>
                  </div>
                  <div className="header-stat-pills">
                    <button
                      className="primary-button macos-primary-button"
                      onClick={async () => {
                        try {
                          const openBatches = batches.filter(b => b.balance.available > 0);
                          for (const batch of openBatches) {
                            await api.allocateBatch(batch.id);
                          }
                          await refreshLiveState();
                        } catch (e) {
                          alert("Auto-match failed: " + (e as Error).message);
                        }
                      }}
                    >
                      <Zap size={16} />
                      <span>Auto-Match All ({dispatchQueue.length} Pending)</span>
                    </button>
                  </div>
                </div>

                {/* Queue Summary Grid */}
                <div className="coordinator-metrics-grid">
                  <div className="metric-card accent-yellow macos-glass-card">
                    <small>Pending Pairing</small>
                    <strong>{dispatchQueue.length} Batches</strong>
                  </div>
                  <div className="metric-card accent-blue macos-glass-card">
                    <small>Available Riders</small>
                    <strong>{riders.filter(r => r.status === "AVAILABLE").length} Carriers</strong>
                  </div>
                  <div className="metric-card accent-green macos-glass-card">
                    <small>Route Match Rate</small>
                    <strong>98.2%</strong>
                  </div>
                  <div className="metric-card accent-red macos-glass-card">
                    <small>Short-Window Runs</small>
                    <strong>{dispatchQueue.filter(d => d.expiryMargin.includes("URGENT") || parseInt(d.expiryMargin) < 20).length} Priority</strong>
                  </div>
                </div>

                {/* Dispatch Matching Queue Cards */}
                <div className="dispatch-queue-list">
                  <div className="queue-section-title">
                    <Layers size={16} color="var(--blue)" />
                    <h3>Algorithmic Pairings Ready for Dispatch</h3>
                  </div>

                  {dispatchQueue.length === 0 ? (
                    <div className="empty-state macos-glass-card" style={{ padding: 24, textAlign: "center" }}>
                      <Sparkles size={32} color="var(--yellow)" style={{ marginBottom: 8 }} />
                      <p>No pending allocations. Click "Auto-Match All" or create batches/requests.</p>
                    </div>
                  ) : (
                    dispatchQueue.map((item) => (
                      <GlassCard className="dispatch-queue-card macos-glass-card" key={item.id}>
                        <div className="dispatch-card-header">
                          <div className="dispatch-badge-cluster">
                            <span className="req-id-badge">{item.id}</span>
                            <span className="match-score-badge">
                              <Sparkles size={12} /> {item.matchScore} Compatibility
                            </span>
                          </div>
                          <span className={`status-badge status-${item.status === "Pending Approval" ? "ready-for-pickup" : item.status === "Critical Priority" ? "critical-window" : "in-transit"}`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Route Path Flow */}
                        <div className="dispatch-flow-box">
                          <div className="flow-node">
                            <Warehouse size={15} color="var(--yellow)" />
                            <div>
                              <small>Donation Source</small>
                              <strong>{item.origin}</strong>
                            </div>
                          </div>
                          <div className="flow-arrow">
                            <ArrowRight size={16} />
                            <small>{item.eta} transit</small>
                          </div>
                          <div className="flow-node">
                            <MapPin size={15} color="var(--blue)" />
                            <div>
                              <small>Target Shelter</small>
                              <strong>{item.destination}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Cargo and Rider Specs */}
                        <div className="dispatch-specs-row">
                          <span>📦 <strong>Cargo:</strong> {item.cargo}</span>
                          <span>🛵 <strong>Assigned Carrier:</strong> {item.recommendedRider} ({item.vehicle})</span>
                          <span className="clock-tag"><Clock size={13} /> {item.expiryMargin}</span>
                        </div>

                        <div className="dispatch-card-actions">
                          {item.status.includes("Pending") || item.status.includes("Priority") ? (
                            <button
                              className="primary-button macos-primary-button"
                              onClick={() => approveDispatch(item.id)}
                            >
                              <Send size={15} /> Approve & Dispatch Assignment
                            </button>
                          ) : (
                            <div className="transit-indicator">
                              <CheckCircle2 size={16} color="var(--green)" />
                              <span>Run Active & Telemetry Transmitted to Rider</span>
                            </div>
                          )}
                          <button
                            className="macos-glass-button"
                            onClick={() => alert(`Opening manual route override tool for ${item.id}.`)}
                          >
                            <SlidersHorizontal size={14} /> Manual Override
                          </button>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            ) : activeNav === "Interventions" ? (
              /* ── DISTINCT PAGE 2: CRITICAL BOTTLENECKS & INTERVENTIONS ── */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Live Interventions & Bottleneck Management</h2>
                    <p>Real-time exception handling: preventing spoilage, rerouting around bottlenecks, and load rebalancing.</p>
                  </div>
                  <div className="header-stat-pills">
                    <span className="macos-glass-pill" style={{ padding: "6px 14px", fontSize: "0.8rem", color: "var(--red)", border: "1px solid rgba(255, 95, 86, 0.4)" }}>
                      ⚠️ {interventionItems.length} Active Network Exceptions
                    </span>
                  </div>
                </div>

                {/* Critical Interventions Stack */}
                <div className="interventions-desk-stack">
                  {interventionItems.length === 0 ? (
                    <div className="empty-state macos-glass-card" style={{ padding: 24, textAlign: "center" }}>
                      <ShieldCheck size={32} color="var(--green)" style={{ marginBottom: 8 }} />
                      <p>No active interventions. System running smoothly.</p>
                    </div>
                  ) : (
                    interventionItems.map((alertItem) => (
                      <GlassCard
                        className={`intervention-card macos-glass-card border-${alertItem.severity}`}
                        key={alertItem.id}
                      >
                        <div className="intervention-card-header">
                          <div className="alert-title-wrap">
                            <AlertTriangle
                              size={20}
                              color={alertItem.severity === "critical" ? "var(--red)" : alertItem.severity === "warning" ? "var(--yellow)" : "var(--blue)"}
                            />
                            <div>
                              <span className="eyebrow" style={{ color: alertItem.severity === "critical" ? "var(--red)" : "var(--yellow)" }}>
                                {alertItem.type}
                              </span>
                              <h3>{alertItem.title}</h3>
                            </div>
                          </div>
                          <span className={`status-badge status-${alertItem.status.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                            {alertItem.status}
                          </span>
                        </div>

                        <p className="intervention-detail-text">{alertItem.details}</p>

                        <div className="intervention-recommendation-box">
                          <Zap size={15} color="var(--yellow)" />
                          <div>
                            <strong>Algorithmic Recommendation:</strong>
                            <span> {alertItem.recommendation}</span>
                          </div>
                        </div>

                        <div className="intervention-action-bar">
                          {alertItem.status === "Action Required" ? (
                            <button
                              className="primary-button macos-primary-button"
                              onClick={() => resolveIntervention(alertItem.id)}
                            >
                              <ShieldCheck size={16} />
                              <span>{alertItem.actionLabel}</span>
                            </button>
                          ) : (
                            <div className="transit-indicator">
                              <CheckCircle2 size={16} color="var(--green)" />
                              <span>Intervention Executed & Logged to Audit Mesh</span>
                            </div>
                          )}
                          <button
                            className="macos-glass-button"
                            onClick={() => alert(`Contacting volunteer dispatch leads for ${alertItem.id}.`)}
                          >
                            Escalate to Field Lead
                          </button>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>

                {/* Resolved Today Log */}
                <div className="interventions-history macos-glass-card" style={{ marginTop: 24, padding: 18 }}>
                  <div className="history-head">
                    <CheckCircle2 size={16} color="var(--green)" />
                    <h4>Interventions Resolved Today (Shivaji Nagar Sector)</h4>
                  </div>
                  <div className="activity-list" style={{ marginTop: 10 }}>
                    <div className="activity-item macos-glass-card">
                      <span className="activity-dot dot-green" />
                      <div className="activity-content">
                        <p><strong>Batch #84 (45 meals)</strong> successfully diverted to Agricultural College Cold Hub before 15m expiration.</p>
                        <time>48 min ago · Resolved by Vikram Gaikwad</time>
                      </div>
                    </div>
                    <div className="activity-item macos-glass-card">
                      <span className="activity-dot dot-blue" />
                      <div className="activity-content">
                        <p><strong>Rain Basera Intake Congestion:</strong> Overflow of 20 kits safely split to Sangam Ghat Relief Camp.</p>
                        <time>1 hr 20 min ago · Resolved Automatically</time>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeNav === "Network" ? (
              /* ── DISTINCT PAGE 3: SHIVAJI NAGAR NETWORK TELEMETRY & ANALYTICS ── */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Shivaji Nagar Network Telemetry & Infrastructure</h2>
                    <p>Live sector analytics, bridge transit throughput, and cold-chain capacity tracking.</p>
                  </div>
                  <div className="header-stat-pills">
                    <span className="macos-glass-pill" style={{ padding: "6px 14px", fontSize: "0.8rem", color: "var(--green)" }}>
                      ● Network Health: {simulationSettings ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                {/* City Sector KPIs - Live from API */}
                <div className="network-kpi-grid">
                  <div className="metric-card accent-yellow macos-glass-card">
                    <small>Total Aid Moved Today</small>
                    <strong>{reservations.filter(r => r.status === "DELIVERED").reduce((sum, r) => sum + (r.load?.weightKg || 0), 0).toFixed(1)} kg</strong>
                    <span className="kpi-sub">{reservations.filter(r => r.status === "DELIVERED").reduce((sum, r) => sum + r.quantity, 0)} meals delivered</span>
                  </div>
                  <div className="metric-card accent-blue macos-glass-card">
                    <small>Average Transit Time</small>
                    <strong>{reservations.filter(r => r.route?.travelMinutes).length > 0
                      ? (reservations.filter(r => r.route?.travelMinutes).reduce((sum, r) => sum + (r.route?.travelMinutes || 0), 0) / reservations.filter(r => r.route?.travelMinutes).length).toFixed(1)
                      : "N/A"} min</strong>
                    <span className="kpi-sub">{reservations.filter(r => r.route?.travelMinutes).length} active routes</span>
                  </div>
                  <div className="metric-card accent-green macos-glass-card">
                    <small>Zero-Spoilage Index</small>
                    <strong>{batches.length > 0 ? ((batches.filter(b => b.status !== "EXPIRED" && b.status !== "DISCARDED").length / batches.length) * 100).toFixed(1) : 100}%</strong>
                    <span className="kpi-sub">{batches.filter(b => b.status === "EXPIRED" || b.status === "DISCARDED").length} spoiled batches</span>
                  </div>
                  <div className="metric-card accent-red macos-glass-card">
                    <small>Active Route Bottlenecks</small>
                    <strong>{interventionItems.filter(i => i.type.includes("TRAFFIC") || i.type.includes("BOTTLENECK")).length} Zone</strong>
                    <span className="kpi-sub">{interventionItems.filter(i => i.type.includes("TRAFFIC")).map(i => i.title).join(", ") || "None"}</span>
                  </div>
                </div>

                {/* Sector Grid Breakdown - Live from receivers/batches */}
                <h3 style={{ marginTop: 10 }}>Shivaji Nagar Sector Mesh Performance</h3>
                <div className="sector-performance-grid">
                  {[
                    {
                      sector: "Sector 01: FC Road Corridor",
                      donors: `${batches.filter(b => b.location.address?.includes("FC Road") || b.location.address?.includes("Community")).length} Active Kitchens`,
                      riders: `${riders.filter(r => r.currentLocation?.address?.includes("FC Road") || r.currentLocation?.address?.includes("Sangam")).length} Carriers`,
                      speed: "12 min avg",
                      compliance: "100% On-Time",
                      status: "Optimal",
                    },
                    {
                      sector: "Sector 02: JM Road Commercial Strip",
                      donors: `${batches.filter(b => b.location.address?.includes("JM Road") || b.location.address?.includes("Annapurna")).length} Food Centers`,
                      riders: `${riders.filter(r => r.currentLocation?.address?.includes("JM Road") || r.currentLocation?.address?.includes("Sambhaji")).length} Carriers`,
                      speed: "14 min avg",
                      compliance: "96.4% On-Time",
                      status: "Optimal",
                    },
                    {
                      sector: "Sector 03: COEP & Sangam Riverfront",
                      donors: `${receivers.filter(r => r.location.address?.includes("COEP") || r.location.address?.includes("Sangam")).length} Shelters / Camps`,
                      riders: `${riders.filter(r => r.currentLocation?.address?.includes("COEP") || r.currentLocation?.address?.includes("COEP")).length} Carriers`,
                      speed: "16 min avg",
                      compliance: "98.1% On-Time",
                      status: "Moderate Traffic",
                    },
                    {
                      sector: "Sector 04: Agri College & ST Depot",
                      donors: `${batches.filter(b => b.location.address?.includes("Agricultural") || b.location.address?.includes("College")).length} Cold Storage Hubs`,
                      riders: `${riders.filter(r => r.currentLocation?.address?.includes("Agricultural") || r.currentLocation?.address?.includes("College")).length} Carriers`,
                      speed: "10 min avg",
                      compliance: "100% On-Time",
                      status: "Optimal",
                    },
                  ].map((sec, idx) => (
                    <GlassCard className="sector-card macos-glass-card" key={idx}>
                      <div className="sector-card-top">
                        <h4>{sec.sector}</h4>
                        <span className="status-badge status-scheduled">{sec.status}</span>
                      </div>
                      <div className="sector-stats-list">
                        <div><small>Supply Nodes</small><strong>{sec.donors}</strong></div>
                        <div><small>Active Logistics</small><strong>{sec.riders}</strong></div>
                        <div><small>Delivery Speed</small><strong>{sec.speed}</strong></div>
                        <div><small>Safe Arrival</small><strong style={{ color: "var(--green)" }}>{sec.compliance}</strong></div>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Bridges and River Corridor Infrastructure */}
                <h3 style={{ marginTop: 14 }}>Bridge & River Corridor Telemetry</h3>
                <div className="bridges-telemetry-grid">
                  {[
                    { bridge: "Sangam Bridge (COEP Link)", state: "Clear & Fast", travelTime: "4 mins", flow: "Normal Flow (420 veh/hr)" },
                    { bridge: "Dengle Bridge (River Crossing)", state: "Clear", travelTime: "6 mins", flow: "Normal Flow (310 veh/hr)" },
                    { bridge: "Shivaji Bridge (Old City Gate)", state: "Heavy Traffic", travelTime: "11 mins", flow: "Dense (650 veh/hr)" },
                    { bridge: "Mutha River Water Level", state: "Safe / Baseline", travelTime: "1.2m depth", flow: "Flood Gate Open: 0%" },
                  ].map((bridge, i) => (
                    <div className="bridge-item-card macos-glass-card" key={i}>
                      <div className="bridge-top">
                        <strong>{bridge.bridge}</strong>
                        <span className={`status-badge ${bridge.state.includes("Heavy") ? "status-critical-window" : "status-scheduled"}`}>
                          {bridge.state}
                        </span>
                      </div>
                      <div className="bridge-details">
                        <span>⏱️ Transit: <strong>{bridge.travelTime}</strong></span>
                        <span>🌊 Status: {bridge.flow}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ACTIVITY LOG */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Shivaji Nagar Sector Activity & Audit Log</h2>
                    <p>Tamper-evident record of all pickups, verifications, and deliveries.</p>
                  </div>
                </div>
                <div className="activity-full-list macos-glass-card">
                  {auditEvents.length > 0
                    ? auditEvents
                        .slice(0, 50)
                        .map((event) => {
                          const time = new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div className="activity-full-row" key={event.id}>
                              <span className="act-time">{time}</span>
                              <span className="signal-dot signal-dot-warm" />
                              <span className="act-text">
                                <strong>{event.type.replace(/_/g, " ")}:</strong> {JSON.stringify(event.details || {})}
                              </span>
                            </div>
                          );
                        })
                    : [
                        { time: "2 min ago", text: "FC Road Community Kitchen posted 85 warm meals (Bhakri & Dal).", type: "donor" },
                        { time: "7 min ago", text: "Rider 04 (Akash) accepted pickup assignment at JM Road Center.", type: "rider" },
                        { time: "11 min ago", text: "Batch #90 reached 20-minute safety threshold. Coordinator alerted.", type: "system" },
                        { time: "18 min ago", text: "Shivaji Nagar Rain Basera verified receipt of 30 meal kits.", type: "receiver" },
                        { time: "24 min ago", text: "Agri College Cold Hub opened 40 reserve crates for overflow aid.", type: "coordinator" },
                        { time: "35 min ago", text: "Dengle Bridge transit route verified clear of flooding.", type: "system" },
                      ].map((act, i) => (
                        <div className="activity-full-row" key={i}>
                          <span className="act-time">{act.time}</span>
                          <span className="signal-dot signal-dot-warm" />
                          <span className="act-text">{act.text}</span>
                        </div>
                      ))}
                </div>
              </div>
            )}
          </div>

          {/* System Settings Modal (Bottom-Left) */}
          {settingsOpen && (
            <div className="settings-panel macos-glass-modal">
              <GlassCard>
                <div className="settings-head">
                  <h4>System Preferences</h4>
                  <span className="settings-badge">macOS Mode</span>
                </div>
                <div className="settings-toggle-row">
                  <span>Liquid glass vibrancy</span>
                  <button
                    className={`toggle-switch ${darkMode ? "is-on" : ""}`}
                    onClick={() => setDarkMode((v) => !v)}
                    aria-label="Toggle dark mode"
                  />
                </div>
                <div className="settings-toggle-row">
                  <span>Pune dispatch alerts</span>
                  <button
                    className={`toggle-switch ${notifications ? "is-on" : ""}`}
                    onClick={() => setNotifications((v) => !v)}
                    aria-label="Toggle alerts"
                  />
                </div>
                <div className="settings-toggle-row">
                  <span>Live telemetry feed</span>
                  <button
                    className={`toggle-switch ${autoRefresh ? "is-on" : ""}`}
                    onClick={() => setAutoRefresh((v) => !v)}
                    aria-label="Toggle auto refresh"
                  />
                </div>
              </GlassCard>
            </div>
          )}

          {/* Click Backdrop */}
          {(profileOpen || settingsOpen) && (
            <div
              className="macos-backdrop-dim"
              onClick={() => {
                setProfileOpen(false);
                setSettingsOpen(false);
              }}
            />
          )}

          {/* New Request Modal */}
          {newRequestModal && (
            <div className="macos-modal-overlay">
              <GlassCard className="macos-modal-dialog slide-up">
                <div className="dialog-titlebar">
                  <span className="dialog-title">New Demand Request</span>
                  <button className="detail-close macos-glass-button" onClick={() => setNewRequestModal(false)}>
                    <X size={15} />
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const shelterInput = (form.elements[0] as HTMLInputElement).value;
                    const itemsInput = (form.elements[1] as HTMLInputElement).value;
                    const countMatch = itemsInput.match(/\d+/);
                    const qty = countMatch ? parseInt(countMatch[0], 10) : 50;

                    setNewRequestModal(false);

                    try {
                      const receivers = await api.listReceivers();
                      let rec = receivers[0];
                      if (!rec) {
                        rec = await api.createReceiver({
                          name: shelterInput,
                          location: { latitude: 28.62, longitude: 77.21, address: shelterInput },
                        });
                      }
                      await api.createRequest({
                        receiverId: rec.id,
                        itemName: itemsInput,
                        category: "COOKED_FOOD",
                        requestedQuantity: qty,
                        unit: "MEALS",
                        urgency: 3,
                        priority: 2,
                      });
                      await refreshLiveState();
                    } catch (err) {
                      console.warn("Backend request create:", err);
                      alert("Failed to create request: " + (err as Error).message);
                    }
                  }}
                  className="modal-form"
                >
                  <label>Shelter Name / Camp Location</label>
                  <input className="macos-input" defaultValue="Shivaji Nagar Rain Basera (Near ST Depot)" required />
                  <label>Items Needed & Portion Count</label>
                  <input className="macos-input" defaultValue="50 Hot Meal Packets" required />
                  <label>Max Safe Delivery Time</label>
                  <input className="macos-input" defaultValue="Within 30 minutes" required />
                  <button type="submit" className="primary-button macos-primary-button" style={{ marginTop: 12 }}>
                    Publish Request to Network
                  </button>
                </form>
              </GlassCard>
            </div>
          )}

          {/* New Batch Modal */}
          {newBatchModal && (
            <div className="macos-modal-overlay">
              <GlassCard className="macos-modal-dialog slide-up">
                <div className="dialog-titlebar">
                  <span className="dialog-title">Publish Surplus Donation</span>
                  <button className="detail-close macos-glass-button" onClick={() => setNewBatchModal(false)}>
                    <X size={15} />
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const kitchenInput = (form.elements[0] as HTMLInputElement).value;
                    const itemInput = (form.elements[1] as HTMLInputElement).value;
                    const weightInput = (form.elements[2] as HTMLInputElement).value;
                    const countMatch = itemInput.match(/\d+/);
                    const qty = countMatch ? parseInt(countMatch[0], 10) : 60;

                    setNewBatchModal(false);

                    try {
                      await api.createBatch({
                        itemName: itemInput,
                        category: "COOKED_FOOD",
                        quantity: qty,
                        unit: "MEALS",
                        storageCondition: "AMBIENT",
                        location: { latitude: 28.6139, longitude: 77.209, address: kitchenInput },
                      });
                      await refreshLiveState();
                    } catch (err) {
                      console.warn("Backend batch create:", err);
                      alert("Failed to create batch: " + (err as Error).message);
                    }
                  }}
                  className="modal-form"
                >
                  <label>Preparation Source Kitchen</label>
                  <input className="macos-input" defaultValue="FC Road Community Kitchen" required />
                  <label>Food Item & Ingredients</label>
                  <input className="macos-input" defaultValue="60 Fresh Chapati & Rice Bowls" required />
                  <label>Approx Weight (kg)</label>
                  <input className="macos-input" defaultValue="18 kg" required />
                  <button type="submit" className="primary-button macos-primary-button" style={{ marginTop: 12 }}>
                    Publish to Shivaji Nagar Mesh
                  </button>
                </form>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── OVERVIEW SUMMARY HUD (WHEN ON MAP VIEW) ────────────────────────── */
function OverviewSummary({ role, onNav }: { role: Role; onNav: (tab: string) => void }) {
  const roleDef = roleById(role);

  return (
    <div className="role-dashboard">
      <div className="role-dashboard-header">
        <span className="eyebrow">{roleDef.shortLabel}</span>
        <h3>{roleDef.label} Hub</h3>
        <p>{roleDef.description}</p>
      </div>

      <div className="detail-info-grid">
        <div className="metric-card accent-yellow macos-glass-card">
          <small>Active Batches</small>
          <strong>4</strong>
        </div>
        <div className="metric-card accent-blue macos-glass-card">
          <small>In Transit</small>
          <strong>145 meals</strong>
        </div>
        <div className="metric-card accent-green macos-glass-card">
          <small>Delivered Today</small>
          <strong>340</strong>
        </div>
        <div className="metric-card accent-red macos-glass-card">
          <small>Critical Window</small>
          <strong>1</strong>
        </div>
      </div>

      <div className="role-quick-actions">
        <button className="quick-action-btn macos-glass-button" onClick={() => onNav("Requests")}>
          <Inbox size={14} /> Open Requests
        </button>
        <button className="quick-action-btn macos-glass-button" onClick={() => onNav("Inventory")}>
          <Boxes size={14} /> Batch Inventory
        </button>
      </div>

      <div className="activity-header">
        <h4>Shivaji Nagar Live Stream</h4>
        <span className="live-badge">Live</span>
      </div>
      <div className="activity-list">
        <div className="activity-item macos-glass-card">
          <span className="activity-dot dot-yellow" />
          <div className="activity-content">
            <p>FC Road Kitchen published 85 warm meals</p>
            <time>2 min ago</time>
          </div>
        </div>
        <div className="activity-item macos-glass-card">
          <span className="activity-dot dot-green" />
          <div className="activity-content">
            <p>Rider 04 crossed Sangam Bridge towards Rain Basera</p>
            <time>6 min ago</time>
          </div>
        </div>
      </div>
    </div>
  );
}
