# AidFlow API

Operational backend for the AidFlow micro-logistics platform.

## Architecture

- **Domain Core (`@aidflow/domain`)**: Strict domain models, deterministic capacity-aware allocation engine, rule-based shelf-life calculator, Haversine routing, compatibility evaluator, and simulation settings.
- **Application Service (`AidflowApplication`)**: State orchestration, multi-rider assignment splitting, OTP lifecycle (pickup/delivery proof), cargo transfer between riders, automated destination recovery, time advancement, incident recording, and audit trails.
- **Storage Layer (`storage.ts`)**: In-Memory store for rapid local simulation, and PostgreSQL store (`PostgresStateStore`) with JSONB state table for production persistence.
- **Real-Time Stream (`GET /events`)**: Server-Sent Events (SSE) broadcasting every application event (batch created, allocation completed, pickup confirmed, transit update, cargo transferred, destination recovered, incident recorded).

---

## Quick Start

### 1. Run with local Node
```bash
# Typecheck
npx tsc -p packages/domain/tsconfig.json
npx tsc -p apps/api/tsconfig.json --noEmit

# Run tests
npx tsx --test packages/domain/src/allocation.test.ts
npx tsx --test apps/api/src/api.test.ts

# Start server
npx tsx apps/api/src/main.ts
```

### 2. Run with Docker Compose
```bash
docker compose up --build
```

---

## API Endpoints Reference

### Health & SSE
- `GET /health` — Health check
- `GET /events` — Real-time Server-Sent Events (SSE) feed

### State & Simulation
- `GET /state` — Complete system state snapshot
- `GET /simulation` — Current simulation clock & config
- `PATCH /simulation` — Update simulation settings
- `POST /simulation/advance` — Fast-forward clock by minutes `{ "minutes": 15 }`
- `POST /simulation/set-time` — Set clock to ISO timestamp `{ "time": "..." }`
- `POST /simulation/process` — Process overdue deadlines, unresponsive riders, wastage
- `POST /simulation/seed` — Seed demo judge scenario (180 meals, 3 shelters, 3 riders)
- `POST /simulation/reset` — Reset to empty initial state

### Batches (Donations)
- `GET /batches` — List donation batches
- `GET /batches/:id` — Get batch details
- `POST /batches` — Create batch
- `PUT /batches/:id` — Update batch metadata
- `POST /batches/:id/add-quantity` — Add quantity `{ "quantity": 50 }`
- `POST /batches/:id/split` — Split batch into sub-batches `{ "quantities": [30, 20] }`
- `POST /batches/:id/allocation-preview` — Run deterministic allocation dry-run
- `POST /batches/:id/allocate` — Commit allocation plan into live rider reservations

### Receivers & Demands
- `GET /receivers` — List shelters and receiver organizations
- `GET /receivers/:id` — Get receiver
- `POST /receivers` — Register receiver
- `PATCH /receivers/:id/status` — Open or Close receiver (triggers destination recovery if closing)
- `GET /requests` — List demand requests
- `POST /requests` — Create demand request
- `PUT /requests/:id` — Update demand request

### Volunteer Riders
- `GET /riders` — List riders with capacity & committed loads
- `GET /riders/:id` — Get rider
- `POST /riders` — Register rider
- `PATCH /riders/:id/status` — Update rider status (`AVAILABLE`, `UNAVAILABLE`)
- `PUT /riders/:id/location` — Update GPS position and trigger transit updates

### Reservations & Logistics Lifecycle
- `GET /reservations` — List assignments
- `GET /reservations/:id` — Get assignment
- `POST /reservations/:id/accept` — Rider accepts assignment
- `POST /reservations/:id/reject` — Rider rejects assignment (releases quantity)
- `POST /reservations/:id/pickup` — Confirm pickup `{ "otp": "123456", "photoProof": "..." }`
- `POST /reservations/:id/in-transit` — Mark en-route with live location
- `PUT /reservations/:id/location` — Stream location breadcrumbs
- `POST /reservations/:id/deliver` — Confirm delivery with receiver OTP `{ "otp": "654321", "photoProof": "..." }`
- `POST /reservations/:id/transfer` — Transfer cargo to another rider `{ "toRiderId": "rider-29", "note": "..." }`
- `POST /reservations/:id/recover` — Manually trigger destination recovery

### Operational Monitoring
- `GET /incidents` — List incidents (Rider Unresponsive, Wastage, Destination Recovery, etc.)
- `GET /notifications` — List in-app/SMS notifications (`?recipientId=...`)
- `PATCH /notifications/:id/read` — Mark notification read
- `GET /audit` — Immutable audit log of all system mutations
- `GET /shelf-life-rules` — Configurable rule-based shelf-life lookup
- `PUT /shelf-life-rules` — Update shelf-life matrix
