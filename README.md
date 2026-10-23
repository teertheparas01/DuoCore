# अन्नपूर्ण (AidFlow) — DuoCore

> **Every donation. The right destination. Before time runs out.**

अन्नपूर्ण is a real-time civic logistics coordination platform that matches perishable food and relief aid using capacity-aware dispatch, safe-consumption window enforcement, inventory tracking, and dynamic rerouting across **Pune's Shivaji Nagar and Mutha River corridor**.

---

## 🏗️ Architecture

The repository is structured as a full-stack monorepo:

```
DuoCore/
├── apps/
│   ├── api/             # Backend REST API Service (Node.js + Express + TypeScript)
│   │   ├── src/         # API routes, persistent JSON store, and controllers
│   │   └── data/        # Persistent data store (db.json)
│   └── web/             # Frontend Client (React 19 + TypeScript + Vite)
│       └── src/         # macOS liquid-glass UI & Pune Shivaji Nagar SVG map
├── Vibe A Thon/         # Product brief & engineering operating guidelines
├── package.json         # Root monorepo scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Start the Backend API (Port 4000)
```powershell
cd apps/api
npm install
npm run dev
```
* API Server: `http://127.0.0.1:4000`
* Health Check: `http://127.0.0.1:4000/api/health`

### 2. Start the Frontend Client (Port 5173)
```powershell
cd apps/web
npm install
npm run dev
```
* Web Application: `http://127.0.0.1:5173`

---

## 📡 Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status & Pune sector metadata |
| `GET` | `/api/donations` | List all perishable food donation batches |
| `POST` | `/api/donations` | Publish a new donation batch with cooking time & thermal state |
| `POST` | `/api/donations/:id/split` | Split a donation into two traceable sub-batches |
| `GET` | `/api/requests` | List shelter and relief camp demand requests |
| `POST` | `/api/requests` | Create a verified demand request |
| `PATCH` | `/api/requests/:id` | Update request status (`Unfulfilled`, `In Transit`, `Fulfilled`) |
| `GET` | `/api/riders` | List active volunteer carriers with live capacity meters |
| `PATCH` | `/api/riders/:id` | Update rider location or carrier capacity |
| `GET` | `/api/dispatch` | List algorithmic match pairings and active runs |
| `POST` | `/api/dispatch/auto-match` | Execute 1-click auto-matching across all active batches |
| `PATCH` | `/api/dispatch/:id` | Approve and dispatch assignment |
| `GET` | `/api/interventions` | Critical bottlenecks, expiry deadlines, and road delays |
| `POST` | `/api/interventions/:id/resolve` | Execute rerouting to cold hub or split assignment |
| `GET` | `/api/network/telemetry` | Shivaji Nagar sector telemetry and bridge flow metrics |
| `GET` | `/api/network/activity` | Tamper-evident activity audit log |

---

## 👥 Supported Roles & Interfaces

1. **Donor (Supply Side):** Batch publishing, thermal state tracking, and sub-batch splitting.
2. **Volunteer Delivery Partner:** Live routing along JM/FC Roads, cargo capacity limiters, and proof-of-delivery.
3. **Receiver (Demand Side):** Rain Basera intake logging, dietary requirement checks, and storage capability matrix.
4. **Coordinator (Operations):** Network command center, dispatch matrix, and urgent bottleneck interventions.

---

## 🎨 Visual Design System

* **Theme:** Apple macOS Liquid-Glass (frosted translucency, specular highlights, traffic-light window chrome)
* **Palette:** Butter Yellow (`#F5C542`), Deep Midnight Navy (`#081728`), Radiant Sky Blue (`#38BDF8`), and Warm Cream (`#FFF8E7`)
* **Typography:** *Plus Jakarta Sans* (Weights 700–900) & *Noto Sans Devanagari*
* **Mapping:** Vector SVG engine modeling Pune's Shivaji Nagar, Mutha River, Sangam Bridge, Dengle Bridge, and Metro corridor.
