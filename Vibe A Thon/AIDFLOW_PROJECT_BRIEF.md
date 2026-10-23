# AidFlow — Product & Engineering Brief

**Status:** Planning snapshot; implementation has not started.
**Team:** Two developers.
**Working mode:** Backend first. UI library will be chosen later.
**Demo constraint:** Simulated hackathon prototype; judging begins before 2:30 PM.

## 1. Product

**Name:** AidFlow  
**Tagline:** Every donation. The right destination. Before time runs out.

AidFlow is a real-time coordination, dispatch, inventory, and safety-enforcement platform for redistributing perishable food, medical supplies, and essential aid.

It must be an operational system, not a static dashboard or disconnected screens. Important interactions must perform meaningful operations, update application state, and display the result.

The system optimizes for successfully delivered, usable aid rather than the number of reservations or assignments created.

## 2. Core problem

The system must handle:

- Donations larger than one rider's carrying capacity.
- Donation quantities larger than one receiver's demand.
- Unresponsive or stalled rider reservations.
- Decreasing safe-delivery time during coordination delays.
- A receiver becoming full or closing while aid is in transit.
- Recovery to another suitable destination when possible.
- Aid that requires receiver capabilities such as clean water or cooking facilities.
- Decisions involving time, capacity, demand, reliability, compatibility, and feasibility together.

## 3. Primary roles

### Donor

- Create donation batches.
- Provide aid category, quantity, unit, creation time, and safe-delivery deadline or expiry information.
- View batch status, remaining time, allocation, rider, pickup, and delivery information.
- See unclaimed, delayed, partially allocated, and infeasible quantities.

### Volunteer rider

- Have an explicit transport capacity and operational status.
- View, accept, or reject assignments.
- Confirm pickup.
- Mark a delivery in transit.
- Confirm delivery.
- Be simulated as unresponsive.
- Participate in reassignment or destination recovery when applicable.

### Receiver

Examples include shelters, NGOs, relief camps, and other receiving locations.

- Define demand by aid category and quantity.
- Define receiving capacity and operational capabilities.
- Update demand during active deliveries.
- Become fulfilled or close.
- Accept or reject incoming aid.
- View incoming assignments and expected arrival information.

### Coordinator / NGO operator

- Observe active operations.
- Identify stalled reservations and urgent deliveries.
- Inspect allocation decisions and operational exceptions.
- Initiate or approve recovery when automatic recovery is not feasible.

## 4. Aid categories in scope

At minimum:

- Cooked food
- Medical supplies
- Raw ration kits
- Essential relief kits

Safety and compatibility assumptions must differ by category. Medical rules must remain explicit and configurable; the prototype must not present itself as a certified medical safety system.

## 5. Required capabilities

### Donation management

Each donation batch needs:

- Unique identifier
- Donor
- Aid category
- Quantity and unit
- Creation time
- Safe-delivery deadline or applicable expiry time
- Current status
- Allocation information
- Pickup and delivery information
- Handling or destination requirements where applicable
- Clear remaining-time indicator for time-sensitive aid

### Capacity-aware splitting

The allocation engine must:

- Split a donation across multiple riders and destinations when feasible.
- Respect rider capacity and existing commitments.
- Respect receiver demand and receiving capacity.
- Respect remaining delivery time and destination compatibility.
- Represent partial allocations explicitly.
- Keep any unallocated remainder visible with a reason.
- Never over-allocate, silently discard quantity, or create duplicate allocations.

### Reservation lifecycle

Baseline lifecycle:

```text
AVAILABLE → RESERVED → PICKUP CONFIRMED → IN TRANSIT → DELIVERED
```

Additional states may include:

```text
CANCELLED, EXPIRED, RELEASED, NEEDS INTERVENTION
```

A reservation must have a configurable response or confirmation deadline. On timeout before pickup, the system must detect the timeout, release uncollected quantity, reevaluate feasibility, search for another rider, reassign when possible, and escalate when no feasible assignment exists.

The demo must trigger timeout or advance simulated time immediately; judges must not wait in real time.

Cargo already physically collected must never be reassigned as if it were still at the donor.

### Dynamic destination recovery

Required demo flow:

1. Rider collects a batch.
2. Rider begins travelling to a receiver.
3. Receiver demand becomes zero or the receiver closes.
4. System detects that the original destination is no longer suitable.
5. System checks alternatives for demand, compatibility, capacity, and delivery-time feasibility.
6. System recommends or performs reassignment according to the chosen workflow.
7. Assignment and expected delivery information are updated.
8. If no feasible alternative exists, the state becomes `NEEDS INTERVENTION`.

### Compatibility and safety

Requirements and receiver capabilities must be structured data.

The feasibility engine must reject or flag incompatible allocations and explain why, for example:

> Allocation blocked: destination has no confirmed cooking facilities.

Missing essential capability information must be treated conservatively and flagged for review instead of being assumed compatible.

## 6. Dispatch engine

The dispatch engine is the central backend component. It must be deterministic, independently testable, and separate from UI components.

It evaluates:

- Available donation quantity
- Rider remaining capacity
- Existing rider commitments
- Receiver remaining demand and capacity
- Travel-time feasibility
- Remaining safe-delivery window
- Destination compatibility
- Partial allocation and unallocated remainder
- Reservation status and rider reliability signals
- Recovery options when an assignment becomes infeasible

The source of truth is successful, usable aid delivery—not assignment count.

## 7. Current demo approach

The first version is simulated:

- Fixed demo users and seeded data.
- Real login flow shape, but no production identity provider yet.
- Simulated locations and routes initially.
- Simulated clock for expiry and reservation timeout.
- Explicit controls for failure scenarios.
- Real backend state transitions rather than visual-only effects.

Expected simulation controls include:

- Advance simulated time.
- Trigger rider timeout or unresponsiveness.
- Close or fulfil receiver demand.
- Trigger destination recovery.
- Trigger reassignment or coordinator intervention.

## 8. Shelf-life approach

Machine learning is removed from the MVP.

The first version uses configurable rule-based prediction based on available information such as:

- Aid category
- Creation or preparation time
- Storage or handling condition when supplied
- Current simulated time

The rule-based result should be treated as an operational estimate, not certified food-safety advice.

Possible future research sources:

- USDA FoodKeeper data may help create initial storage-guidance rules, but it is guidance data rather than a ready-made training dataset.
- USDA Predictive Microbiology Information Portal / ComBase-related resources may be considered later if a credible training or modelling path is needed.

Neither source is a current MVP dependency.

## 9. Proposed stack — pending approval

The current recommendation is a modular TypeScript monorepo:

- **Package management:** pnpm workspaces.
- **Backend:** NestJS with TypeScript.
- **Database:** PostgreSQL.
- **Data access and migrations:** Prisma.
- **Real-time updates:** Socket.IO.
- **Frontend later:** Next.js and React with TypeScript.
- **Testing:** Unit and integration tests for the domain engine, API, reservations, inventory, and recovery flows.

Suggested reusable boundaries:

```text
apps/
  api/          Backend application
  web/          Frontend application, later

packages/
  domain/       Pure dispatch, allocation, lifecycle, and compatibility logic
  contracts/    Shared API types and validation
  simulation/   Simulated clock, scenarios, and failure controls
```

Use a modular monolith rather than microservices for the hackathon. External services such as real routing or production authentication should be replaceable behind adapters.

## 10. Planned backend-first order

1. Confirm stack and repository setup.
2. Define domain entities and status transitions.
3. Create database schema and seed demo data.
4. Implement donation, receiver demand, rider, and inventory operations.
5. Implement the deterministic dispatch and batch-splitting engine.
6. Implement reservations, simulated time, timeout, release, and reassignment.
7. Implement compatibility checks and destination recovery.
8. Add real-time events and simulation controls.
9. Add API and scenario tests for judge workflows.
10. Build the role-based frontend after backend behavior is verified.

## 11. Decisions still open

- Final UI library.
- Exact backend and frontend package versions.
- Exact simulated authentication flow.
- Exact route and distance calculation rules.
- Exact time-feasibility and allocation scoring rules from the remaining product brief.
- Whether real map integration is needed for the judged demo.
- The remaining portion of the dispatch-feasibility section from the product brief.

## 12. Current repository observation

At the time this brief was created, the project directory contained `AGENT_OPERATING_GUIDE.md` and no existing application code or Git repository was detected.
