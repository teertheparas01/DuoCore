import {
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
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Train,
  Truck,
  User,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { mapMarkers, roleById } from "../data";
import type { MapMarker, Role } from "../types";
import { GlassCard } from "./GlassCard";
import { Sidebar } from "./Sidebar";
import { SimulatedMap } from "./SimulatedMap";

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

  // Dynamic state for interactive operations
  const [requestsList, setRequestsList] = useState([
    {
      id: "REQ-101",
      shelter: "Shivaji Nagar Rain Basera (Near ST Depot)",
      items: "60 Hot Thali Meals",
      urgency: "High",
      timeNeeded: "Within 25 min",
      status: "Unfulfilled",
      dietary: "Vegetarian / No Onion",
      contact: "Dr. Kulkarni (+91 98220 11234)",
    },
    {
      id: "REQ-102",
      shelter: "Sangam Ghat Relief Camp",
      items: "35 Ration Kits (Flour, Dal, Oil)",
      urgency: "Medium",
      timeNeeded: "Within 2 hours",
      status: "In Transit",
      dietary: "Dry Groceries",
      contact: "Ramesh Shinde (+91 94230 55678)",
    },
    {
      id: "REQ-103",
      shelter: "COEP Night Shelter Ward",
      items: "40 Fresh Bhakri & Pithla Packs",
      urgency: "High",
      timeNeeded: "Within 15 min",
      status: "Unfulfilled",
      dietary: "Fresh Cooked",
      contact: "Prof. Joshi (+91 98900 88219)",
    },
    {
      id: "REQ-104",
      shelter: "Sancheti Chowk Transit Camp",
      items: "25 Clean Water Jerry Cans & Biscuits",
      urgency: "Normal",
      timeNeeded: "Within 3 hours",
      status: "Scheduled",
      dietary: "Packaged Aid",
      contact: "Pooja Salve (+91 97654 32109)",
    },
  ]);

  const [inventoryBatches, setInventoryBatches] = useState([
    {
      id: "BATCH-89",
      source: "FC Road Community Kitchen",
      item: "85 Warm Bhakri & Dal Packets",
      cookedAt: "1:45 PM",
      expiresIn: "32 mins",
      temp: "Hot (64°C)",
      weight: "26 kg",
      status: "Ready for Pickup",
      assignedRider: "Unassigned",
    },
    {
      id: "BATCH-90",
      source: "JM Road Annapurna Center",
      item: "24 Tiffin Meals (Rice & Curry)",
      cookedAt: "1:15 PM",
      expiresIn: "18 mins",
      temp: "Warm (55°C)",
      weight: "14 kg",
      status: "Critical Window",
      assignedRider: "Rider 04 · Akash",
    },
    {
      id: "BATCH-91",
      source: "Gokhale Institute Mess Surplus",
      item: "50 Chapati Packs & Sabzi",
      cookedAt: "2:00 PM",
      expiresIn: "55 mins",
      temp: "Hot (68°C)",
      weight: "18 kg",
      status: "Packing Now",
      assignedRider: "Unassigned",
    },
    {
      id: "BATCH-92",
      source: "Agricultural College Research Canteen",
      item: "30 Fruit & Protein Ration Boxes",
      cookedAt: "12:30 PM",
      expiresIn: "4 hours",
      temp: "Ambient (24°C)",
      weight: "22 kg",
      status: "Stored in Cold Hub",
      assignedRider: "Standby",
    },
  ]);

  const [newRequestModal, setNewRequestModal] = useState(false);
  const [newBatchModal, setNewBatchModal] = useState(false);

  const handleMarkerSelect = useCallback((marker: MapMarker) => {
    setSelectedMarker((prev) => (prev?.id === marker.id ? null : marker));
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const fulfillRequest = (id: string) => {
    setRequestsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "In Transit" } : r))
    );
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
                <div className="topbar-pulse-indicator">
                  <span className="signal-dot signal-dot-live" />
                  <small>Mutha River Corridor Live</small>
                </div>

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
                      🟢 18 Active Riders
                    </span>
                    <span className="macos-glass-pill" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                      📦 220 kg Total Moving Capacity
                    </span>
                  </div>
                </div>

                <div className="riders-grid">
                  {[
                    {
                      id: "RIDER-04",
                      name: "Akash Deshmukh",
                      vehicle: "Hero Electric E-Scooter",
                      carrierCapacity: "22 / 40 kg",
                      location: "Crossing Sangam Bridge (COEP)",
                      run: "FC Road Kitchen → Shivaji Nagar Shelter",
                      eta: "6 mins",
                      status: "In Transit",
                    },
                    {
                      id: "RIDER-07",
                      name: "Rahul Patil",
                      vehicle: "Honda Activa + Rear Insulated Crate",
                      carrierCapacity: "10 / 35 kg",
                      location: "JM Road Sambhaji Park",
                      run: "JM Road Center → Sangam Ghat Camp",
                      eta: "11 mins",
                      status: "In Transit",
                    },
                    {
                      id: "RIDER-11",
                      name: "Priya Shinde",
                      vehicle: "Cycle with Front Cargo Rack",
                      carrierCapacity: "0 / 20 kg",
                      location: "Agricultural College Gate",
                      run: "Standby for Short Radius Dispatch",
                      eta: "Available",
                      status: "Available",
                    },
                    {
                      id: "RIDER-15",
                      name: "Tanmay Kulkarni",
                      vehicle: "Mahindra Bolero Aid Van",
                      carrierCapacity: "45 / 150 kg",
                      location: "Sancheti Chowk Flyover",
                      run: "Agri College Cold Hub → Relief Points",
                      eta: "14 mins",
                      status: "In Transit",
                    },
                  ].map((rider) => (
                    <GlassCard className="rider-card macos-glass-card" key={rider.id}>
                      <div className="rider-header">
                        <div className="rider-avatar">
                          <Truck size={18} />
                        </div>
                        <div>
                          <h3>{rider.name}</h3>
                          <small>{rider.vehicle}</small>
                        </div>
                        <span className={`status-badge status-${rider.status.toLowerCase().replace(" ", "-")}`}>
                          {rider.status}
                        </span>
                      </div>
                      <div className="rider-details">
                        <div className="rider-capacity-bar-wrap">
                          <div className="cap-label">
                            <span>Capacity Utilized</span>
                            <strong>{rider.carrierCapacity}</strong>
                          </div>
                          <div className="cap-bar-track">
                            <div className="cap-bar-fill" style={{ width: "55%" }} />
                          </div>
                        </div>
                        <p>📍 <strong>Location:</strong> {rider.location}</p>
                        <p>🛣️ <strong>Assigned Run:</strong> {rider.run}</p>
                        <p>⏱️ <strong>ETA:</strong> {rider.eta}</p>
                      </div>
                      <div className="rider-actions">
                        <button className="macos-glass-button" style={{ width: "100%" }}>
                          <Route size={14} /> Track Live GPS Coordinates
                        </button>
                      </div>
                    </GlassCard>
                  ))}
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
                  {[
                    {
                      title: "FC Road Warm Bhakri Packets (85 Meals)",
                      carrier: "Rider 04 (Akash Deshmukh)",
                      route: "FC Road → Sangam Bridge → Rain Basera",
                      progress: "75%",
                      eta: "6 min left",
                      tempVerified: "Verified Hot (62°C)",
                      safeDeadline: "32 mins remaining",
                    },
                    {
                      title: "Fresh Tiffin Boxes (24 Packets)",
                      carrier: "Rider 07 (Rahul Patil)",
                      route: "JM Road Center → Dengle Bridge → Sangam Ghat",
                      progress: "45%",
                      eta: "11 min left",
                      tempVerified: "Verified Warm (54°C)",
                      safeDeadline: "18 mins remaining",
                    },
                  ].map((shipment, i) => (
                    <GlassCard className="shipment-card macos-glass-card" key={i}>
                      <div className="shipment-head">
                        <div>
                          <span className="eyebrow">Active Handoff</span>
                          <h3>{shipment.title}</h3>
                          <small>Carrier: {shipment.carrier}</small>
                        </div>
                        <span className="eta-badge">{shipment.eta}</span>
                      </div>

                      <div className="shipment-progress-wrap">
                        <div className="progress-labels">
                          <span>{shipment.route}</span>
                          <strong>{shipment.progress} Completed</strong>
                        </div>
                        <div className="cap-bar-track">
                          <div className="cap-bar-fill" style={{ width: shipment.progress }} />
                        </div>
                      </div>

                      <div className="shipment-checks">
                        <span><ShieldCheck size={14} color="var(--green)" /> {shipment.tempVerified}</span>
                        <span><Clock size={14} color="var(--yellow)" /> Safe Window: {shipment.safeDeadline}</span>
                      </div>

                      <button
                        className="primary-button macos-primary-button"
                        onClick={() => alert("Handoff confirmed and signed into shelter inventory.")}
                      >
                        <CheckCircle2 size={16} /> Confirm Receipt & Intake
                      </button>
                    </GlassCard>
                  ))}
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
            ) : activeNav === "Dispatch board" || activeNav === "Interventions" || activeNav === "Network" ? (
              /* COORDINATOR DISPATCH BOARD / INTERVENTIONS */
              <div className="page-view-container slide-up">
                <div className="page-header">
                  <div>
                    <h2>Coordinator Operations & Automated Dispatch</h2>
                    <p>Algorithm matching surplus cooking batches against shelter deficits across Shivaji Nagar.</p>
                  </div>
                  <button
                    className="primary-button macos-primary-button"
                    onClick={() => alert("Auto-Dispatch engine recalculating fastest routes across Dengle & Sangam Bridges.")}
                  >
                    <RefreshCw size={15} />
                    <span>Run Smart Auto-Dispatch</span>
                  </button>
                </div>

                <div className="coordinator-metrics-grid">
                  <div className="metric-card accent-yellow macos-glass-card">
                    <small>Active Donors</small>
                    <strong>12 Kitchens</strong>
                  </div>
                  <div className="metric-card accent-blue macos-glass-card">
                    <small>Open Shelters</small>
                    <strong>8 Rain Baseras</strong>
                  </div>
                  <div className="metric-card accent-green macos-glass-card">
                    <small>Moving Today</small>
                    <strong>485 kg</strong>
                  </div>
                  <div className="metric-card accent-red macos-glass-card">
                    <small>Critical Expiry Risk</small>
                    <strong>2 Batches</strong>
                  </div>
                </div>

                <div className="interventions-panel macos-glass-card" style={{ marginTop: 20 }}>
                  <div className="interventions-header">
                    <AlertTriangle size={18} color="var(--red)" />
                    <h3>Priority Interventions Required</h3>
                  </div>
                  <div className="interventions-list">
                    <div className="intervention-item">
                      <div>
                        <strong>Batch #90 on JM Road expiring in 18 minutes</strong>
                        <p>Destination shelter near capacity. Auto-rerouting to Agricultural College Cold Hub suggested.</p>
                      </div>
                      <button
                        className="macos-glass-button"
                        style={{ color: "var(--yellow)", borderColor: "var(--yellow)" }}
                        onClick={() => alert("Reroute command transmitted to Rider 04's navigation screen.")}
                      >
                        Confirm Reroute to Cold Hub
                      </button>
                    </div>
                  </div>
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
                  {[
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
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRequestsList((prev) => [
                      {
                        id: `REQ-${Math.floor(Math.random() * 900 + 100)}`,
                        shelter: "Shivaji Nagar Rain Basera",
                        items: "50 Fresh Meals",
                        urgency: "High",
                        timeNeeded: "Within 30 min",
                        status: "Unfulfilled",
                        dietary: "Vegetarian",
                        contact: "Anita Kulkarni (+91 98220 11234)",
                      },
                      ...prev,
                    ]);
                    setNewRequestModal(false);
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
                  onSubmit={(e) => {
                    e.preventDefault();
                    setInventoryBatches((prev) => [
                      {
                        id: `BATCH-${Math.floor(Math.random() * 900 + 100)}`,
                        source: "FC Road Community Kitchen",
                        item: "60 Fresh Chapati & Rice Bowls",
                        cookedAt: "Just Now",
                        expiresIn: "45 mins",
                        temp: "Hot (65°C)",
                        weight: "18 kg",
                        status: "Ready for Pickup",
                        assignedRider: "Unassigned",
                      },
                      ...prev,
                    ]);
                    setNewBatchModal(false);
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
