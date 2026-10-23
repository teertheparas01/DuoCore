# AidFlow / Annapurna (Civic Logistics)

> **Every donation. The right destination. Before time runs out.**

AidFlow (Annapurna) is a real-time micro-logistics and dispatch coordination platform designed to redistribute perishable cooked meals, infant formula, raw ration kits, and essential relief aid. It replaces static dashboards with a live operational mesh that actively reasons across multi-dimensional rider capacity, receiver demand feasibility, shelf-life deadlines, and dynamic delivery exceptions.

---

## Key Capabilities

- **Capacity-Aware Multi-Rider Splitting**: Splits oversized donation batches across multiple volunteer riders while accounting for weight (kg), volume (litres), item count, and fragile handling limits.
- **Explainable Feasibility & Compatibility**: Enforces storage requirements (Ambient, Refrigerated, Cold Hub) and receiver capabilities (e.g., clean water, infant feeding tools) before allocation.
- **OTP & Proof of Delivery Lifecycle**: Cryptographic 6-digit one-time passcodes and photo proofs recorded at both donor pickup and shelter delivery.
- **Rider-to-Rider Cargo Transfer**: Seamlessly reassigns in-transit cargo between riders during vehicle breakdowns or route blocks.
- **Dynamic Destination Recovery**: Automatically reroutes active cargo to nearby secondary shelters if the primary destination unexpectedly closes or reaches full capacity.
- **Simulation Time Machine**: Accelerated simulation clock to test judge scenarios, unresponsive rider detection (threshold alerts), and perishable cargo shelf-life expiry.
- **Real-Time Event Stream**: Server-Sent Events (SSE) broadcasting live dispatch, routing, and operational incident telemetry.
- **macOS Liquid-Glass Interface**: High-fidelity frontend with live map telemetry across Pune's Shivaji Nagar corridor (JM Road, FC Road, Sangam Ghat).

---

## Monorepo Architecture

```
DuoCore/
├── apps/
│   ├── api/             # Node.js / TypeScript operational service & REST/SSE endpoints
│   └── web/             # Vite + React 19 macOS liquid-glass dashboard with Shivaji Nagar map
├── packages/
│   └── domain/          # Pure domain logic: allocation engine, routing, shelf-life, state models
├── docker-compose.yml   # Multi-container orchestration (PostgreSQL + AidFlow API)
├── Dockerfile           # Production container build
├── package.json         # Root pnpm monorepo workspace
└── pnpm-workspace.yaml  # Workspace definitions
```

---

## Quickstart

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x / 12.x

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Test Suites
```bash
# Domain tests: Allocation engine, compatibility, route feasibility, shelf life
pnpm --filter @aidflow/domain test

# API tests: Full operational lifecycle, OTPs, cargo transfers, recovery
pnpm --filter @aidflow/api test
```

### 3. Start Backend API Server
```bash
pnpm --filter @aidflow/api dev
# Running on http://localhost:3000
# Real-time SSE on http://localhost:3000/events
```

### 4. Start Web Frontend
```bash
pnpm --filter annapurn-web dev
# Accessible at http://127.0.0.1:5173
```

---

## Running with Docker Compose

To run PostgreSQL alongside the backend API:

```bash
docker compose up --build
```

---

## Judge Demonstration Scenario (180-Meal Allocation)

To instantly trigger the hackathon benchmark scenario:
1. Click **"Seed Grid"** in the top navigation bar (or execute `POST /simulation/seed`).
2. This creates:
   - **180 cooked meals** at FC Road Community Kitchen (75 min safe shelf life).
   - **3 Receiving Shelters**: Rain Basera (50 meals), Sangam Ghat (70 meals), COEP Shelter (60 meals).
   - **3 Volunteer Riders** with individual capacity limits (40, 60, and 40 meals).
3. The deterministic allocation engine automatically allocates **140 meals** across riders and preserves the **40-meal unallocated remainder** with explainable feasibility logs.
4. Fast-forward the clock by clicking **"+15m"** to observe live updates, driver arrival estimates, and exception handling.
