# AidFlow — Product & Engineering Brief

**Status:** Planning snapshot; implementation has not started.
**Team:** Two developers.
**Working mode:** Backend first. Dedicated API testing and the UI will follow the backend foundation.
**Demo constraint:** Simulated hackathon prototype; judging begins before 2:30 PM.

**Deployment scope:** One city per deployment. Multi-city coordination is not part of the MVP.

**Authentication scope:** Production phone OTP and Google login are deferred. The prototype may use seeded demo identities or another lightweight development identity mechanism.

## 1. Product

**Name:** AidFlow  
**Tagline:** Every donation. The right destination. Before time runs out.

AidFlow is a real-time coordination, dispatch, inventory, and safety-enforcement platform for redistributing perishable food and essential aid.

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
- Provide aid name, category, quantity, unit, preparation or creation time, ingredients where applicable, storage conditions, dietary information, allergens, fragility, and safe-delivery deadline or expiry information.
- Edit a published batch and add more quantity.
- Split a batch into independently tracked sub-batches.
- View batch status, remaining time, allocation, rider, pickup, and delivery information.
- See unclaimed, delayed, partially allocated, and infeasible quantities.

### Volunteer rider

- Have an explicit transport capacity and operational status.
- View, accept, or reject assignments.
- Confirm pickup.
- Mark a delivery in transit.
- Confirm delivery after proof of delivery.
- Be simulated as unresponsive.
- Participate in reassignment or destination recovery when applicable.
- Carry supplies for multiple receivers and collect from multiple donors until capacity is full.
- Transfer cargo to another rider when recovery requires it.

Rider capacity may include item or meal count, weight, volume, vehicle type, and fragile-item capacity. Manual rider verification is not required for the prototype.

### Receiver

Examples include shelters, NGOs, relief camps, and other receiving locations.

- Define demand by aid category and quantity.
- Define receiving capacity and operational capabilities.
- Update demand during active deliveries.
- Become fulfilled or close.
- Accept or reject incoming aid.
- View incoming assignments and expected arrival information.

Receivers may be individuals or organizations. They may accept partial deliveries, but the system must never allocate more than their remaining request. A fully fulfilled receiver request is complete and cannot receive additional allocation through that request.

### Coordinator / NGO operator

- Observe active operations.
- Identify stalled reservations and urgent deliveries.
- Inspect allocation decisions and operational exceptions.
- Initiate or approve recovery when automatic recovery is not feasible.

Each user has exactly one of the roles above. Donors and receivers may be individuals or organizations.

## 4. Aid categories in scope

The MVP includes:

- Cooked food
- Raw ration kits
- Infant formula
- Essential relief kits

Safety and compatibility assumptions must differ by category. The prototype must not present its rule-based estimates or compatibility checks as certified food-safety or product-handling advice.

## 5. Required capabilities

### Donation management

Each donation batch needs:

- Unique identifier
- Donor
- Aid category
- Aid name or item description
- Quantity and unit
- Preparation, cooking, creation, or product timestamp as applicable
- Ingredients and ingredient shelf-life inputs where applicable
- Donor-provided safe-delivery deadline or expiry time, when supplied
- Rule-based expiry estimate when a donor expiry is not supplied
- Effective expiry using the safer result from the available expiry information
- Storage conditions
- Dietary information
- Allergens
- Fragility
- Current status
- Allocation information
- Pickup and delivery information
- Handling or destination requirements where applicable
- Clear remaining-time indicator for time-sensitive aid

Donors may edit published batches, add quantity, and split a batch into sub-batches. After splitting, each sub-batch must remain independently traceable for allocation, reservation, delivery, expiry, and wastage.

### Receiver demand and inventory

Receiver demand must support:

- Aid category and item requirement
- Requested quantity and unit
- Fulfilled quantity
- Remaining demand and receiving capacity
- Location and address
- Urgency or priority
- Operating hours and current operational status
- Storage conditions and required capabilities
- Contact information
- Partial-delivery acceptance

Receivers may update demand while deliveries are active. A receiver that is full or closed must no longer receive new allocation through the completed or closed request. Lack of response to contact attempts is an operational signal that may trigger recovery.

Inventory must distinguish available, reserved, allocated, packed, in-transit, delivered, expired, discarded, and unallocated quantity. The backend must expose the information required for role-specific operational maps, including donor, rider, receiver, route, address, latest location, and delivery status.

### Proof and delivery operations

- Pickup confirmation requires an OTP and photo proof.
- A delivery is complete only after proof of delivery is recorded.
- Delivery records must preserve the relevant batch or sub-batch, quantities, actors, timestamps, and latest known location.
- Rider-to-rider transfer is an explicit operation with both riders and the transferred quantity recorded.

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

The reservation window depends on the remaining safe-delivery time of the reserved aid. The system notifies the rider and expects three updates during that window. Missing location updates or failure to respond to contact attempts marks the rider as unresponsive. Reservations expire automatically after the configured no-response condition, and a partial reservation may be released when shelf-life risk requires it.

The demo must trigger timeout or advance simulated time immediately; judges must not wait in real time.

Cargo already physically collected must never be reassigned as if it were still at the donor. Before pickup, uncollected quantity may be released for reassignment. After pickup, recovery must redirect the physical cargo or transfer it to another rider rather than create a duplicate allocation.

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

If a receiver becomes full or closes, the rider may choose the closest feasible request. If no feasible receiver request exists, the system selects the closest donor fallback location for temporary storage until another request is available. If the aid becomes unsafe before a safe destination or storage location is reached, it is discarded and recorded as wastage through an incident.

### Compatibility and safety

Requirements and receiver capabilities must be structured data.

The feasibility engine must reject or flag incompatible allocations and explain why, for example:

> Allocation blocked: destination has no confirmed cooking facilities.

Missing essential capability information must be treated conservatively and flagged for review instead of being assumed compatible.

The detailed dependency rules for cooked food, raw ration kits, infant formula, and essential relief kits remain to be defined. Compatibility decisions must be structured, explainable, and enforced before allocation or rerouting.

## 6. Dispatch engine

The dispatch engine is the central backend component. It must be deterministic, independently testable, and separate from UI components.

It evaluates:

- Available donation quantity
- Rider remaining capacity
- Existing rider commitments
- Receiver remaining demand and capacity
- Travel-time feasibility
- Remaining safe-delivery window
- Simulated traffic and travel time
- Expiry risk on the proposed route
- Destination compatibility
- Partial allocation and unallocated remainder
- Reservation status and rider reliability signals
- Recovery options when an assignment becomes infeasible

The source of truth is successful, usable aid delivery—not assignment count.

Inventory uses FEFO (First Expiring, First Out) as its primary ordering rule. Receiver fulfillment priority also considers expiry, travel time, expiry risk, receiver urgency, distance, fragility, compatibility, available quantity, rider capacity, and whether partial delivery is accepted. Unallocated inventory must remain visible with its current reason.

## 7. Current demo approach

The first version is simulated:

- Fixed demo users and seeded data.
- No production authentication provider; the prototype uses seeded or lightweight demo identities.
- Simulated locations, traffic, travel times, and routes.
- Simulated clock for expiry and reservation timeout.
- Explicit controls for failure scenarios.
- Real backend state transitions rather than visual-only effects.

The routing decision is fastest simulated travel time while considering simulated traffic and expiry risk. Real Google Maps integration is deferred, but the routing boundary should allow a future provider to be added.

Operational quantities, expiry, allocations, demand, receiver status, delivery status, and latest rider location must be updated in real time. Rider location is expected approximately every 15 seconds, only the latest location is stored, and live location is visible to all users of the prototype.

The prototype should support in-app, SMS, and push notification channels through replaceable notification adapters.

Expected simulation controls include:

- Advance simulated time.
- Trigger rider timeout or unresponsiveness.
- Close or fulfil receiver demand.
- Trigger destination recovery.
- Trigger reassignment or coordinator intervention.

The repository must include seeded test data and demonstrations for the judge-relevant failure paths, including tight expiry windows, batch splitting across riders, competing reservations, rider timeout before pickup, rider unresponsiveness after pickup, partial reservation release, partial receiver fulfillment, receiver closure or fulfillment during transit, fallback receiver selection, donor storage fallback, rider-to-rider transfer, expiry during transit, unsafe disposal, wastage incidents, compatibility failures, and live state updates.

## 8. Shelf-life approach

Machine learning is removed from the MVP. No training dataset or trained model is currently available.

The first version uses a configurable rule-based estimator based on available information such as:

- Aid category
- Aid or food item
- Cooking, preparation, creation, or product time as applicable
- Ingredients and ingredient shelf-life information where available
- Storage or handling condition when supplied
- Current simulated time

The estimator returns an expiry time and date with a confidence level. Low-confidence results create a warning. An authorized coordinator may override an estimate with an auditable reason. When both a donor-provided expiry and an estimate exist, the system uses the safer result by default; the exact precedence and override policy remain configurable.

The rule-based result should be treated as an operational estimate, not certified food-safety advice.

Possible future research sources:

- USDA FoodKeeper data may help create initial storage-guidance rules, but it is guidance data rather than a ready-made training dataset.
- USDA Predictive Microbiology Information Portal / ComBase-related resources may be considered later if a credible training or modelling path is needed.

Neither source is a current MVP dependency.

## 9. MVP technical direction

The backend will use a modular monolith with clear domain boundaries:

- **Language and runtime:** TypeScript on Node.js.
- **Backend framework:** NestJS.
- **Database:** PostgreSQL.
- **Runtime environment:** Docker.
- **Background processing:** A separate job queue for expiry, reservation timeout, simulated-clock, notification, and recovery jobs.
- **Routing:** Simulated locations, traffic, travel times, and routes for the prototype.
- **Real-time transport:** To be selected; the backend must publish events for live operational updates without coupling domain logic to a particular transport.
- **Authentication:** Deferred for the prototype; seeded or lightweight demo identities are sufficient.
- **Testing:** Unit and integration tests for the domain engine, API, reservations, inventory, and recovery flows.

Data access, migration, package-management, real-time transport, and queue libraries remain implementation choices unless separately approved.

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

Use a modular monolith rather than microservices for the hackathon. Future external services such as Google Maps routing, production authentication, SMS, and push notifications should be replaceable behind adapters.

## 10. Planned backend-first order

1. Confirm stack and repository setup.
2. Define domain entities and status transitions.
3. Create database schema and seed demo data.
4. Implement all role endpoints and donation, receiver demand, rider, and inventory operations.
5. Implement the deterministic dispatch and batch-splitting engine.
6. Implement reservations, simulated time, timeout, release, and reassignment.
7. Implement compatibility checks and destination recovery.
8. Add background jobs, real-time events, notifications, and simulation controls.
9. Add API and scenario tests for all judge workflows, with test data committed to the repository.
10. Build the role-based frontend after backend behavior is verified.

## 11. Decisions still open

- Final UI library.
- Exact backend package versions and package manager.
- Data-access, migration, queue, and real-time transport libraries.
- Exact simulated authentication flow.
- Detailed compatibility and dependency rules for each aid category.
- Exact route tie-breakers and allocation scoring rules.
- Exact reservation window and three-update schedule.
- Exact receiver-unresponsive recovery workflow.
- Exact proof-of-delivery format.
- Future Google Maps and production authentication integration.

## 12. Current repository observation

The current repository contains the README and this planning brief. Application implementation has not started yet.
