import { EventEmitter } from 'node:events';
import { randomInt } from 'node:crypto';
import {
  AidBatch,
  AidCategory,
  AidRequirements,
  AidUnit,
  AllocationResult,
  AppState,
  AuditEvent,
  CapacityVector,
  Incident,
  Location,
  LoadVector,
  Notification,
  Receiver,
  ReceiverRequest,
  ReceiverStatus,
  Reservation,
  Rider,
  RiderStatus,
  Role,
  RouteEstimate,
  ShelfLifeRule,
  SimulationSettings,
  StorageCondition,
  TransferRecord,
  User,
  allocateBatch,
  applyExpiryEstimate,
  createInitialState,
  estimateRoute,
  estimateShelfLife,
  evaluateCompatibility,
} from '@aidflow/domain';
import { StateStore } from './storage';

export interface CreateBatchInput {
  donorId: string;
  itemName: string;
  category: AidCategory;
  quantity: number;
  unit: AidUnit;
  createdAt?: string;
  preparedAt?: string;
  donorExpiry?: string;
  storageCondition?: StorageCondition;
  dietaryInformation?: string;
  allergens?: string[];
  fragile?: boolean;
  loadPerUnit?: Partial<LoadVector>;
  requirements?: AidRequirements;
  location: Location;
}

export interface UpdateBatchInput {
  itemName?: string;
  donorExpiry?: string;
  storageCondition?: StorageCondition;
  dietaryInformation?: string;
  allergens?: string[];
  fragile?: boolean;
  requirements?: AidRequirements;
  location?: Location;
}

export interface CreateReceiverInput {
  name: string;
  location: Location;
  capabilities?: string[];
  storageConditions?: StorageCondition[];
  contact?: string;
  operatingHours?: string;
}

export interface CreateRequestInput {
  receiverId: string;
  itemName?: string;
  category: AidCategory;
  requestedQuantity: number;
  unit: AidUnit;
  priority?: number;
  urgency?: number;
  partialDeliveryAccepted?: boolean;
}

export interface UpdateRequestInput {
  requestedQuantity?: number;
  priority?: number;
  urgency?: number;
  partialDeliveryAccepted?: boolean;
  fulfilledQuantity?: number;
  status?: 'OPEN' | 'FULFILLED' | 'CLOSED';
}

export interface CreateRiderInput {
  name: string;
  capacity?: Partial<CapacityVector>;
  vehicleType?: string;
  currentLocation?: Location;
  reliabilityScore?: number;
}

export interface PreviewInput {
  now?: string;
  trafficFactor?: number;
  routes?: RouteEstimate[];
}

export interface ProofInput {
  otp: string;
  photoProof: string;
}

export interface LocationUpdateInput {
  location: Location;
}

export interface TransferInput {
  toRiderId: string;
  note?: string;
}

export class AidflowError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AidflowError';
  }
}

export interface AidflowEvent {
  id: string;
  type: string;
  at: string;
  payload: unknown;
}

export class AidflowApplication {
  private readonly eventBus = new EventEmitter();
  private shelfLifeRules: ShelfLifeRule[];

  constructor(
    private readonly state: AppState,
    private readonly store: StateStore,
    rules: ShelfLifeRule[],
  ) {
    this.shelfLifeRules = rules;
  }

  async persist(): Promise<void> {
    await this.store.save(this.state);
  }

  snapshot(): AppState {
    return this.clone(this.state);
  }

  users(): User[] {
    return this.clone(this.state.users);
  }

  getRules(): ShelfLifeRule[] {
    return this.clone(this.shelfLifeRules);
  }

  setRules(rules: ShelfLifeRule[], actorId: string): ShelfLifeRule[] {
    this.assertRole(actorId, ['COORDINATOR']);
    if (!Array.isArray(rules) || rules.length === 0) throw new AidflowError('At least one shelf-life rule is required.');
    for (const rule of rules) {
      if (!rule.category || !rule.storageCondition || !Number.isFinite(rule.minutes) || rule.minutes <= 0) {
        throw new AidflowError('Each shelf-life rule needs a category, storage condition, and positive minutes.');
      }
    }
    this.shelfLifeRules = this.clone(rules);
    this.audit(actorId, 'SHELF_LIFE_RULES_UPDATED', 'SYSTEM', 'shelf-life-rules', { count: rules.length });
    this.emit('shelf-life.rules.updated', { rules: this.shelfLifeRules });
    return this.getRules();
  }

  subscribe(listener: (event: AidflowEvent) => void): () => void {
    this.eventBus.on('event', listener);
    return () => this.eventBus.off('event', listener);
  }

  createBatch(input: CreateBatchInput, actorId: string): AidBatch {
    this.assertRole(actorId, ['DONOR', 'COORDINATOR']);
    this.assertPositive(input.quantity, 'quantity');
    this.assertLocation(input.location);
    const createdAt = input.createdAt ?? this.now();
    this.assertDate(createdAt, 'createdAt');
    if (input.preparedAt) this.assertDate(input.preparedAt, 'preparedAt');
    if (input.donorExpiry) this.assertDate(input.donorExpiry, 'donorExpiry');

    const loadPerUnit: LoadVector = {
      itemCount: input.loadPerUnit?.itemCount ?? 1,
      weightKg: input.loadPerUnit?.weightKg ?? 0,
      volumeLitres: input.loadPerUnit?.volumeLitres ?? 0,
      fragileUnits: input.loadPerUnit?.fragileUnits ?? (input.fragile ? 1 : 0),
    };
    this.assertNonNegativeLoad(loadPerUnit);
    const storageCondition = input.storageCondition ?? 'UNKNOWN';
    const estimate = estimateShelfLife(
      {
        category: input.category,
        storageCondition,
        createdAt,
        preparedAt: input.preparedAt,
        donorExpiry: input.donorExpiry,
        itemName: input.itemName,
      },
      this.shelfLifeRules,
    );
    const batch: AidBatch = {
      id: this.nextId('batch'),
      donorId: input.donorId,
      itemName: input.itemName,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      createdAt,
      preparedAt: input.preparedAt,
      donorExpiry: input.donorExpiry,
      ruleBasedExpiry: estimate.source === 'DONOR' ? undefined : estimate,
      effectiveExpiry: estimate.expiresAt,
      expiryConfidence: estimate.confidence,
      expiryWarning: estimate.warning,
      storageCondition,
      dietaryInformation: input.dietaryInformation,
      allergens: input.allergens ?? [],
      fragile: Boolean(input.fragile),
      loadPerUnit,
      requirements: input.requirements ?? {},
      location: this.clone(input.location),
      status: 'AVAILABLE',
      balance: {
        total: input.quantity,
        available: input.quantity,
        reserved: 0,
        inTransit: 0,
        delivered: 0,
        expired: 0,
        discarded: 0,
      },
    };
    this.state.batches.push(batch);
    this.audit(actorId, 'BATCH_CREATED', 'BATCH', batch.id, { category: batch.category, quantity: batch.quantity });
    this.emit('batch.created', batch);
    return this.clone(batch);
  }

  updateBatch(batchId: string, input: UpdateBatchInput, actorId: string): AidBatch {
    this.assertRole(actorId, ['DONOR', 'COORDINATOR']);
    const batch = this.getBatch(batchId);
    if (batch.balance.inTransit > 0 || batch.balance.delivered > 0) {
      throw new AidflowError('A batch with delivered or in-transit quantity cannot be edited.', 409);
    }
    Object.assign(batch, {
      itemName: input.itemName ?? batch.itemName,
      storageCondition: input.storageCondition ?? batch.storageCondition,
      dietaryInformation: input.dietaryInformation ?? batch.dietaryInformation,
      allergens: input.allergens ?? batch.allergens,
      fragile: input.fragile ?? batch.fragile,
      requirements: input.requirements ?? batch.requirements,
      location: input.location ? this.clone(input.location) : batch.location,
      donorExpiry: input.donorExpiry ?? batch.donorExpiry,
    });
    const estimate = estimateShelfLife(
      {
        category: batch.category,
        storageCondition: batch.storageCondition,
        createdAt: batch.createdAt,
        preparedAt: batch.preparedAt,
        donorExpiry: batch.donorExpiry,
        itemName: batch.itemName,
      },
      this.shelfLifeRules,
    );
    Object.assign(batch, applyExpiryEstimate(batch, estimate));
    this.updateBatchStatus(batch);
    this.audit(actorId, 'BATCH_UPDATED', 'BATCH', batch.id);
    this.emit('batch.updated', batch);
    return this.clone(batch);
  }

  addBatchQuantity(batchId: string, quantity: number, actorId: string): AidBatch {
    this.assertRole(actorId, ['DONOR', 'COORDINATOR']);
    this.assertPositive(quantity, 'quantity');
    const batch = this.getBatch(batchId);
    batch.quantity += quantity;
    batch.balance.total += quantity;
    batch.balance.available += quantity;
    this.updateBatchStatus(batch);
    this.audit(actorId, 'BATCH_QUANTITY_ADDED', 'BATCH', batch.id, { quantity });
    this.emit('batch.quantity.added', { batchId, quantity });
    return this.clone(batch);
  }

  splitBatch(batchId: string, quantities: number[], actorId: string): AidBatch[] {
    this.assertRole(actorId, ['DONOR', 'COORDINATOR']);
    const parent = this.getBatch(batchId);
    if (parent.balance.reserved > 0 || parent.balance.inTransit > 0) throw new AidflowError('Only unreserved, uncollected batch quantity can be split.', 409);
    if (!Array.isArray(quantities) || quantities.length < 2 || quantities.some((quantity) => !Number.isFinite(quantity) || quantity <= 0)) throw new AidflowError('Provide at least two positive split quantities.');
    const total = quantities.reduce((sum, quantity) => sum + quantity, 0);
    if (total > parent.balance.available) throw new AidflowError('Split quantities exceed available batch quantity.', 409);
    parent.balance.available -= total;
    parent.status = 'PARTIALLY_ALLOCATED';
    const children = quantities.map((quantity, index) => ({
      ...this.clone(parent),
      id: this.nextId('batch'),
      parentBatchId: parent.id,
      splitIndex: index + 1,
      quantity,
      status: 'AVAILABLE' as const,
      balance: { total: quantity, available: quantity, reserved: 0, inTransit: 0, delivered: 0, expired: 0, discarded: 0 },
    }));
    this.state.batches.push(...children);
    this.audit(actorId, 'BATCH_SPLIT', 'BATCH', parent.id, { childBatchIds: children.map((child) => child.id), quantities });
    this.emit('batch.split', { parent, children });
    return this.clone(children);
  }

  createReceiver(input: CreateReceiverInput, actorId: string): Receiver {
    this.assertRole(actorId, ['RECEIVER', 'COORDINATOR']);
    this.assertLocation(input.location);
    const receiver: Receiver = {
      id: this.nextId('receiver'),
      name: input.name,
      status: 'OPEN',
      location: this.clone(input.location),
      capabilities: input.capabilities ?? [],
      storageConditions: input.storageConditions ?? [],
      contact: input.contact,
      operatingHours: input.operatingHours,
    };
    this.state.receivers.push(receiver);
    this.audit(actorId, 'RECEIVER_CREATED', 'RECEIVER', receiver.id);
    this.emit('receiver.created', receiver);
    return this.clone(receiver);
  }

  updateReceiverStatus(receiverId: string, status: ReceiverStatus, actorId: string): { receiver: Receiver; recoveries: unknown[] } {
    this.assertRole(actorId, ['RECEIVER', 'COORDINATOR']);
    const receiver = this.getReceiver(receiverId);
    receiver.status = status;
    const affectedRequests = this.state.receiverRequests.filter((request) => request.receiverId === receiverId);
    for (const request of affectedRequests) {
      if (status === 'CLOSED' && request.status === 'OPEN') request.status = 'CLOSED';
      if (status === 'OPEN' && request.status === 'CLOSED' && request.fulfilledQuantity < request.requestedQuantity) request.status = 'OPEN';
      request.updatedAt = this.now();
    }
    const recoveries = status === 'CLOSED'
      ? this.state.reservations
          .filter((reservation) => ['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status))
          .filter((reservation) => affectedRequests.some((request) => request.id === reservation.receiverRequestId))
          .map((reservation) => this.recoverReservation(reservation.id, actorId))
      : [];
    this.audit(actorId, 'RECEIVER_STATUS_UPDATED', 'RECEIVER', receiverId, { status });
    this.emit('receiver.status.updated', { receiver, recoveries });
    return { receiver: this.clone(receiver), recoveries: this.clone(recoveries) };
  }

  createReceiverRequest(input: CreateRequestInput, actorId: string): ReceiverRequest {
    this.assertRole(actorId, ['RECEIVER', 'COORDINATOR']);
    this.assertPositive(input.requestedQuantity, 'requestedQuantity');
    const receiver = this.getReceiver(input.receiverId);
    if (receiver.status !== 'OPEN') throw new AidflowError('A closed receiver cannot create a new open request.', 409);
    const request: ReceiverRequest = {
      id: this.nextId('request'),
      receiverId: receiver.id,
      itemName: input.itemName,
      category: input.category,
      requestedQuantity: input.requestedQuantity,
      unit: input.unit,
      fulfilledQuantity: 0,
      reservedQuantity: 0,
      priority: input.priority ?? 1,
      urgency: input.urgency ?? 1,
      partialDeliveryAccepted: input.partialDeliveryAccepted ?? true,
      status: 'OPEN',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.state.receiverRequests.push(request);
    this.audit(actorId, 'RECEIVER_REQUEST_CREATED', 'RECEIVER_REQUEST', request.id);
    this.emit('receiver.request.created', request);
    return this.clone(request);
  }

  updateReceiverRequest(requestId: string, input: UpdateRequestInput, actorId: string): ReceiverRequest {
    this.assertRole(actorId, ['RECEIVER', 'COORDINATOR']);
    const request = this.getRequest(requestId);
    if (input.requestedQuantity !== undefined) {
      this.assertPositive(input.requestedQuantity, 'requestedQuantity');
      if (input.requestedQuantity < request.fulfilledQuantity + request.reservedQuantity) throw new AidflowError('Requested quantity cannot be lower than fulfilled plus reserved quantity.', 409);
      request.requestedQuantity = input.requestedQuantity;
    }
    if (input.priority !== undefined) request.priority = input.priority;
    if (input.urgency !== undefined) request.urgency = input.urgency;
    if (input.partialDeliveryAccepted !== undefined) request.partialDeliveryAccepted = input.partialDeliveryAccepted;
    if (input.fulfilledQuantity !== undefined) {
      if (input.fulfilledQuantity < 0 || input.fulfilledQuantity > request.requestedQuantity) throw new AidflowError('fulfilledQuantity is outside the request bounds.');
      request.fulfilledQuantity = input.fulfilledQuantity;
    }
    if (input.status) request.status = input.status;
    if (request.fulfilledQuantity >= request.requestedQuantity) request.status = 'FULFILLED';
    request.updatedAt = this.now();
    const recoveries = request.status !== 'OPEN' ? this.recoverReservationsForRequest(request.id, actorId) : [];
    this.audit(actorId, 'RECEIVER_REQUEST_UPDATED', 'RECEIVER_REQUEST', request.id, { status: request.status });
    this.emit('receiver.request.updated', { request, recoveries });
    return this.clone(request);
  }

  createRider(input: CreateRiderInput, actorId: string): Rider {
    this.assertRole(actorId, ['RIDER', 'COORDINATOR']);
    const capacity: CapacityVector = {
      itemCount: input.capacity?.itemCount ?? 0,
      weightKg: input.capacity?.weightKg ?? 0,
      volumeLitres: input.capacity?.volumeLitres ?? 0,
      fragileUnits: input.capacity?.fragileUnits ?? 0,
    };
    this.assertNonNegativeCapacity(capacity);
    if (capacity.itemCount <= 0) throw new AidflowError('Rider capacity.itemCount must be positive.');
    const rider: Rider = {
      id: this.nextId('rider'),
      name: input.name,
      status: 'AVAILABLE',
      capacity,
      committedLoad: { itemCount: 0, weightKg: 0, volumeLitres: 0, fragileUnits: 0 },
      vehicleType: input.vehicleType,
      currentLocation: input.currentLocation ? this.clone(input.currentLocation) : undefined,
      lastLocationAt: input.currentLocation ? this.now() : undefined,
      reliabilityScore: Math.min(1, Math.max(0, input.reliabilityScore ?? 1)),
    };
    this.state.riders.push(rider);
    this.audit(actorId, 'RIDER_CREATED', 'RIDER', rider.id);
    this.emit('rider.created', rider);
    return this.clone(rider);
  }

  updateRiderStatus(riderId: string, status: RiderStatus, actorId: string): Rider {
    this.assertRole(actorId, ['RIDER', 'COORDINATOR']);
    const rider = this.getRider(riderId);
    this.assertActorOwnsRider(actorId, rider);
    rider.status = status;
    if (status === 'AVAILABLE' && this.hasActiveReservation(rider.id)) rider.status = 'RESERVED';
    this.audit(actorId, 'RIDER_STATUS_UPDATED', 'RIDER', rider.id, { status: rider.status });
    this.emit('rider.status.updated', rider);
    return this.clone(rider);
  }

  updateRiderLocation(riderId: string, input: LocationUpdateInput, actorId: string): Rider {
    const rider = this.getRider(riderId);
    this.assertActorOwnsRider(actorId, rider);
    this.assertLocation(input.location);
    rider.currentLocation = this.clone(input.location);
    rider.lastLocationAt = this.now();
    for (const reservation of this.state.reservations.filter((candidate) => candidate.riderId === riderId && this.isActiveReservation(candidate))) {
      reservation.currentLocation = this.clone(input.location);
      reservation.lastUpdateAt = this.now();
      reservation.updatesReceived += 1;
    }
    this.audit(actorId, 'RIDER_LOCATION_UPDATED', 'RIDER', rider.id, { location: input.location });
    this.emit('rider.location.updated', rider);
    return this.clone(rider);
  }

  previewAllocation(batchId: string, input: PreviewInput = {}): AllocationResult {
    const batch = this.getBatch(batchId);
    const now = input.now ?? this.now();
    const routes = input.routes ?? this.calculateRoutes(batch, now, input.trafficFactor);
    return allocateBatch({
      batch: this.clone(batch),
      receivers: this.clone(this.state.receivers),
      requests: this.clone(this.state.receiverRequests),
      riders: this.clone(this.state.riders),
      routes: this.clone(routes),
      now,
    });
  }

  allocateBatch(batchId: string, input: PreviewInput, actorId: string): { plan: AllocationResult; reservations: Reservation[] } {
    this.assertRole(actorId, ['COORDINATOR', 'DONOR']);
    const plan = this.previewAllocation(batchId, input);
    const reservations: Reservation[] = [];
    for (const allocation of plan.allocations) reservations.push(this.createReservationFromAllocation(allocation, actorId));
    this.updateBatchStatus(this.getBatch(batchId));
    this.emit('dispatch.allocated', { plan, reservations });
    return { plan: this.clone(plan), reservations: this.clone(reservations) };
  }

  listReservations(): Reservation[] {
    return this.clone(this.state.reservations);
  }

  acceptReservation(reservationId: string, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (reservation.status !== 'RESERVED') throw new AidflowError('Only reserved assignments can be accepted.', 409);
    reservation.acceptedAt = this.now();
    this.audit(actorId, 'RESERVATION_ACCEPTED', 'RESERVATION', reservation.id);
    this.emit('reservation.accepted', reservation);
    return this.clone(reservation);
  }

  rejectReservation(reservationId: string, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (reservation.status !== 'RESERVED') throw new AidflowError('Only reserved assignments can be rejected.', 409);
    this.releaseReservation(reservation, 'RELEASED', 'Rider rejected the reservation.', actorId);
    return this.clone(reservation);
  }

  confirmPickup(reservationId: string, input: ProofInput, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (reservation.status !== 'RESERVED') throw new AidflowError('Reservation is not awaiting pickup.', 409);
    if (!reservation.acceptedAt) throw new AidflowError('Rider must accept the reservation before pickup.', 409);
    this.assertProof(input);
    if (input.otp !== reservation.pickupOtp) throw new AidflowError('Pickup OTP is invalid.', 403);
    const batch = this.getBatch(reservation.batchId);
    this.moveQuantity(batch, 'reserved', 'inTransit', reservation.quantity);
    reservation.status = 'PICKUP_CONFIRMED';
    reservation.pickedUpAt = this.now();
    reservation.physicalCustodyRiderId = rider.id;
    reservation.pickupProof = { ...input, recordedAt: this.now(), recordedBy: actorId };
    rider.status = 'IN_TRANSIT';
    this.audit(actorId, 'PICKUP_CONFIRMED', 'RESERVATION', reservation.id);
    this.emit('reservation.pickup.confirmed', reservation);
    return this.clone(reservation);
  }

  markInTransit(reservationId: string, input: LocationUpdateInput, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (!['PICKUP_CONFIRMED', 'TRANSFERRED', 'IN_TRANSIT', 'NEEDS_INTERVENTION'].includes(reservation.status)) throw new AidflowError('Reservation is not ready for transit.', 409);
    this.assertLocation(input.location);
    reservation.status = 'IN_TRANSIT';
    reservation.inTransitAt ??= this.now();
    reservation.currentLocation = this.clone(input.location);
    reservation.lastUpdateAt = this.now();
    reservation.updatesReceived += 1;
    rider.currentLocation = this.clone(input.location);
    rider.lastLocationAt = this.now();
    rider.status = 'IN_TRANSIT';
    this.audit(actorId, 'DELIVERY_MARKED_IN_TRANSIT', 'RESERVATION', reservation.id);
    this.emit('reservation.in_transit', reservation);
    return this.clone(reservation);
  }

  updateReservationLocation(reservationId: string, input: LocationUpdateInput, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (!['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status)) throw new AidflowError('Only an active physical delivery can receive location updates.', 409);
    this.assertLocation(input.location);
    reservation.currentLocation = this.clone(input.location);
    reservation.lastUpdateAt = this.now();
    reservation.updatesReceived += 1;
    rider.currentLocation = this.clone(input.location);
    rider.lastLocationAt = this.now();
    this.audit(actorId, 'RESERVATION_LOCATION_UPDATED', 'RESERVATION', reservation.id, { location: input.location });
    this.emit('reservation.location.updated', reservation);
    return this.clone(reservation);
  }

  confirmDelivery(reservationId: string, input: ProofInput, actorId: string): Reservation {
    const reservation = this.getReservation(reservationId);
    const rider = this.getRider(reservation.riderId);
    this.assertActorOwnsRider(actorId, rider);
    if (!['IN_TRANSIT', 'TRANSFERRED'].includes(reservation.status)) throw new AidflowError('Reservation is not in transit.', 409);
    this.assertProof(input);
    if (input.otp !== reservation.deliveryOtp) throw new AidflowError('Delivery OTP is invalid.', 403);
    const batch = this.getBatch(reservation.batchId);
    const request = this.getRequest(reservation.receiverRequestId);
    const receiver = this.getReceiver(request.receiverId);
    if (receiver.status !== 'OPEN' || request.status !== 'OPEN') throw new AidflowError('The destination is no longer accepting this request. Recover the delivery before completing it.', 409);
    if (this.nowMs() >= new Date(batch.effectiveExpiry).getTime()) {
      this.discardReservation(reservation, 'Aid became unsafe before delivery.', actorId);
      throw new AidflowError('Aid is past its effective expiry and was recorded as wastage.', 409);
    }
    const remaining = request.requestedQuantity - request.fulfilledQuantity;
    if (reservation.quantity > remaining) throw new AidflowError('Delivery exceeds the receiver remaining demand.', 409);
    this.moveQuantity(batch, 'inTransit', 'delivered', reservation.quantity);
    request.fulfilledQuantity += reservation.quantity;
    request.reservedQuantity = Math.max(0, request.reservedQuantity - reservation.quantity);
    request.updatedAt = this.now();
    if (request.fulfilledQuantity >= request.requestedQuantity) request.status = 'FULFILLED';
    reservation.status = 'DELIVERED';
    reservation.deliveredAt = this.now();
    reservation.deliveryProof = { ...input, recordedAt: this.now(), recordedBy: actorId };
    this.subtractLoad(rider.committedLoad, reservation.load);
    this.refreshRiderStatus(rider);
    this.updateBatchStatus(batch);
    this.audit(actorId, 'DELIVERY_CONFIRMED', 'RESERVATION', reservation.id, { requestId: request.id });
    this.notify(rider.id, 'Delivery completed', `Delivery ${reservation.id} was completed.`, 'IN_APP');
    this.notify(receiver.id, 'Aid received', `Delivery ${reservation.id} was recorded as delivered.`, 'IN_APP');
    this.emit('reservation.delivered', reservation);
    return this.clone(reservation);
  }

  transferReservation(reservationId: string, input: TransferInput, actorId: string): { reservation: Reservation; transfer: TransferRecord } {
    const reservation = this.getReservation(reservationId);
    const fromRider = this.getRider(reservation.riderId);
    const toRider = this.getRider(input.toRiderId);
    this.assertActorOwnsRider(actorId, fromRider);
    if (!['PICKUP_CONFIRMED', 'IN_TRANSIT', 'NEEDS_INTERVENTION', 'TRANSFERRED'].includes(reservation.status)) throw new AidflowError('Only collected cargo can be transferred.', 409);
    if (toRider.status !== 'AVAILABLE' && toRider.status !== 'RESERVED') throw new AidflowError('Target rider is not available.', 409);
    if (!this.fitsCapacity(toRider, reservation.load)) throw new AidflowError('Target rider lacks sufficient capacity.', 409);
    this.subtractLoad(fromRider.committedLoad, reservation.load);
    this.addLoad(toRider.committedLoad, reservation.load);
    fromRider.status = fromRider.committedLoad.itemCount > 0 ? 'IN_TRANSIT' : 'AVAILABLE';
    toRider.status = 'IN_TRANSIT';
    reservation.riderId = toRider.id;
    reservation.physicalCustodyRiderId = toRider.id;
    reservation.status = 'TRANSFERRED';
    const transfer: TransferRecord = {
      id: this.nextId('transfer'),
      reservationId,
      fromRiderId: fromRider.id,
      toRiderId: toRider.id,
      quantity: reservation.quantity,
      recordedAt: this.now(),
      note: input.note,
    };
    this.state.transfers.push(transfer);
    this.audit(actorId, 'RIDER_TRANSFERRED_CARGO', 'RESERVATION', reservation.id, { transferId: transfer.id });
    this.emit('reservation.transferred', { reservation, transfer });
    return { reservation: this.clone(reservation), transfer: this.clone(transfer) };
  }

  recoverReservation(reservationId: string, actorId: string): unknown {
    const reservation = this.getReservation(reservationId);
    this.assertRole(actorId, ['COORDINATOR', 'RIDER', 'RECEIVER']);
    if (!['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status)) throw new AidflowError('Only collected cargo can enter destination recovery.', 409);
    const batch = this.getBatch(reservation.batchId);
    if (this.nowMs() >= new Date(batch.effectiveExpiry).getTime()) {
      this.discardReservation(reservation, 'Aid expired before a safe recovery destination was found.', actorId);
      return { status: 'DISCARDED', reservation: this.clone(reservation) };
    }
    const currentRequest = this.getRequest(reservation.receiverRequestId);
    const rider = this.getRider(reservation.riderId);
    const origin = reservation.currentLocation ?? rider.currentLocation ?? batch.location;
    const candidates = this.state.receiverRequests
      .filter((request) => request.id !== currentRequest.id && request.status === 'OPEN' && request.category === batch.category && request.unit === batch.unit)
      .map((request) => {
        const receiver = this.getReceiver(request.receiverId);
        const compatibility = receiver.status === 'OPEN' ? this.compatibilityFor(batch, receiver, request) : { compatible: false, reasons: ['Receiver is closed.'] };
        const route = estimateRoute({
          riderId: rider.id,
          receiverRequestId: request.id,
          origin,
          destination: receiver.location,
          now: this.now(),
          trafficFactor: this.state.simulation.defaultTrafficFactor,
          speedKph: this.state.simulation.routingSpeedKph,
          expiry: batch.effectiveExpiry,
        });
        return { request, receiver, compatibility, route };
      })
      .filter((candidate) => candidate.compatibility.compatible && candidate.route.expiryRisk !== 'INFEASIBLE')
      .sort((left, right) => left.route.travelMinutes - right.route.travelMinutes || right.request.urgency - left.request.urgency);

    const candidate = candidates.find((item) => item.request.requestedQuantity - item.request.fulfilledQuantity - item.request.reservedQuantity >= reservation.quantity || item.request.partialDeliveryAccepted);
    if (candidate) {
      currentRequest.reservedQuantity = Math.max(0, currentRequest.reservedQuantity - reservation.quantity);
      candidate.request.reservedQuantity += reservation.quantity;
      candidate.request.updatedAt = this.now();
      reservation.receiverRequestId = candidate.request.id;
      reservation.route = candidate.route;
      reservation.status = 'IN_TRANSIT';
      reservation.fallbackLocation = undefined;
      reservation.needsInterventionReason = undefined;
      this.recordIncident({
        type: 'DESTINATION_RECOVERY',
        reservationId: reservation.id,
        batchId: batch.id,
        receiverRequestId: candidate.request.id,
        riderId: rider.id,
        message: `Delivery recovered to ${candidate.receiver.name}.`,
        severity: 'WARNING',
      });
      this.audit(actorId, 'DESTINATION_RECOVERED', 'RESERVATION', reservation.id, { newRequestId: candidate.request.id });
      this.emit('reservation.recovered', reservation);
      return { status: 'REROUTED', reservation: this.clone(reservation), receiver: this.clone(candidate.receiver) };
    }

    reservation.fallbackLocation = batch.location;
    reservation.status = 'NEEDS_INTERVENTION';
    reservation.needsInterventionReason = 'No feasible receiving request is available. Donor fallback storage was selected.';
    this.recordIncident({
      type: 'FALLBACK_STORAGE',
      reservationId: reservation.id,
      batchId: batch.id,
      riderId: rider.id,
      message: reservation.needsInterventionReason,
      severity: 'CRITICAL',
    });
    this.audit(actorId, 'DESTINATION_RECOVERY_ESCALATED', 'RESERVATION', reservation.id);
    this.emit('reservation.needs_intervention', reservation);
    return { status: 'NEEDS_INTERVENTION', reservation: this.clone(reservation), fallbackLocation: this.clone(batch.location) };
  }

  advanceTime(minutes: number, actorId: string): { currentTime: string; changes: unknown[] } {
    this.assertRole(actorId, ['COORDINATOR']);
    if (!Number.isFinite(minutes) || minutes <= 0) throw new AidflowError('minutes must be positive.');
    this.state.simulation.currentTime = new Date(this.nowMs() + minutes * 60_000).toISOString();
    const changes = this.processDueOperations(actorId);
    this.audit(actorId, 'SIMULATION_TIME_ADVANCED', 'SIMULATION', 'clock', { minutes });
    this.emit('simulation.time.advanced', { currentTime: this.now(), changes });
    return { currentTime: this.now(), changes: this.clone(changes) };
  }

  setTime(iso: string, actorId: string): { currentTime: string; changes: unknown[] } {
    this.assertRole(actorId, ['COORDINATOR']);
    this.assertDate(iso, 'time');
    this.state.simulation.currentTime = new Date(iso).toISOString();
    const changes = this.processDueOperations(actorId);
    this.audit(actorId, 'SIMULATION_TIME_SET', 'SIMULATION', 'clock', { time: this.now() });
    this.emit('simulation.time.set', { currentTime: this.now(), changes });
    return { currentTime: this.now(), changes: this.clone(changes) };
  }

  processDueOperations(actorId = 'user-coordinator-1'): unknown[] {
    const changes: unknown[] = [];
    for (const reservation of this.state.reservations) {
      if (reservation.status === 'RESERVED' && this.nowMs() >= new Date(reservation.responseDeadline).getTime()) {
        this.releaseReservation(reservation, 'EXPIRED', 'Reservation response deadline elapsed.', actorId);
        this.recordIncident({
          type: 'RESERVATION_TIMEOUT',
          reservationId: reservation.id,
          batchId: reservation.batchId,
          riderId: reservation.riderId,
          message: 'Reservation timed out before pickup and was released.',
          severity: 'WARNING',
        });
        changes.push({ type: 'RESERVATION_EXPIRED', reservationId: reservation.id });
        continue;
      }
      if (['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED'].includes(reservation.status)) {
        const lastUpdate = reservation.lastUpdateAt ?? reservation.inTransitAt ?? reservation.pickedUpAt;
        if (lastUpdate && this.nowMs() - new Date(lastUpdate).getTime() >= this.state.simulation.noResponseAfterSeconds * 1000) {
          const rider = this.getRider(reservation.riderId);
          rider.status = 'UNRESPONSIVE';
          reservation.status = 'NEEDS_INTERVENTION';
          reservation.needsInterventionReason = 'No rider location or contact update was received within the configured window.';
          this.recordIncident({
            type: 'RIDER_UNRESPONSIVE',
            reservationId: reservation.id,
            batchId: reservation.batchId,
            riderId: rider.id,
            message: reservation.needsInterventionReason,
            severity: 'CRITICAL',
          });
          this.notify('user-coordinator-1', 'Rider unresponsive', `Reservation ${reservation.id} needs intervention.`, 'IN_APP');
          changes.push({ type: 'RIDER_UNRESPONSIVE', reservationId: reservation.id, riderId: rider.id });
        }
      }
    }

    for (const batch of this.state.batches) {
      if (this.nowMs() < new Date(batch.effectiveExpiry).getTime()) continue;
      if (batch.balance.available > 0) {
        const quantity = batch.balance.available;
        batch.balance.available = 0;
        batch.balance.expired += quantity;
        this.updateBatchStatus(batch);
        this.recordIncident({
          type: 'WASTAGE',
          batchId: batch.id,
          message: `${quantity} ${batch.unit} expired while unallocated.`,
          severity: 'WARNING',
          metadata: { quantity },
        });
        changes.push({ type: 'BATCH_EXPIRED', batchId: batch.id, quantity });
      }
      for (const reservation of this.state.reservations.filter((candidate) => candidate.batchId === batch.id)) {
        if (reservation.status === 'RESERVED') {
          this.expireReservation(reservation, 'Reservation expired with the batch.', actorId);
          changes.push({ type: 'RESERVATION_EXPIRED', reservationId: reservation.id });
        } else if (['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status)) {
          this.discardReservation(reservation, 'Cargo became unsafe before reaching a safe destination.', actorId);
          changes.push({ type: 'CARGO_DISCARDED', reservationId: reservation.id });
        }
      }
    }
    return changes;
  }

  seedScenario(actorId: string): AppState {
    this.assertRole(actorId, ['COORDINATOR']);
    const now = this.now();
    const existingUsers = this.state.users;
    const fresh = createInitialState(now);
    Object.assign(this.state, fresh, { users: existingUsers });
    const donor = this.createBatch({
      donorId: 'user-donor-1',
      itemName: 'Demo cooked meals',
      category: 'COOKED_FOOD',
      quantity: 180,
      unit: 'MEALS',
      createdAt: now,
      donorExpiry: new Date(new Date(now).getTime() + 75 * 60_000).toISOString(),
      storageCondition: 'AMBIENT',
      location: { latitude: 28.6139, longitude: 77.209, address: 'Demo Banquet Hall', city: 'Demo City' },
    }, actorId);
    const shelterA = this.createReceiver({ name: 'Shelter A', location: { latitude: 28.62, longitude: 77.21, address: 'Shelter A', city: 'Demo City' }, capabilities: [], storageConditions: ['AMBIENT'] }, actorId);
    const shelterB = this.createReceiver({ name: 'Shelter B', location: { latitude: 28.63, longitude: 77.22, address: 'Shelter B', city: 'Demo City' }, capabilities: [], storageConditions: ['AMBIENT'] }, actorId);
    const shelterC = this.createReceiver({ name: 'Shelter C', location: { latitude: 28.64, longitude: 77.23, address: 'Shelter C', city: 'Demo City' }, capabilities: [], storageConditions: ['AMBIENT'] }, actorId);
    this.createReceiverRequest({ receiverId: shelterA.id, category: donor.category, requestedQuantity: 50, unit: 'MEALS', priority: 3, urgency: 3 }, actorId);
    this.createReceiverRequest({ receiverId: shelterB.id, category: donor.category, requestedQuantity: 70, unit: 'MEALS', priority: 2, urgency: 2 }, actorId);
    this.createReceiverRequest({ receiverId: shelterC.id, category: donor.category, requestedQuantity: 60, unit: 'MEALS', priority: 1, urgency: 1 }, actorId);
    this.createRider({ name: 'Rider A', capacity: { itemCount: 40, weightKg: 20, volumeLitres: 30, fragileUnits: 0 }, currentLocation: donor.location }, actorId);
    this.createRider({ name: 'Rider B', capacity: { itemCount: 60, weightKg: 30, volumeLitres: 45, fragileUnits: 0 }, currentLocation: donor.location }, actorId);
    this.createRider({ name: 'Rider C', capacity: { itemCount: 40, weightKg: 20, volumeLitres: 30, fragileUnits: 0 }, currentLocation: donor.location }, actorId);
    this.audit(actorId, 'DEMO_SCENARIO_SEEDED', 'SIMULATION', 'scenario');
    this.emit('simulation.scenario.seeded', this.snapshot());
    return this.snapshot();
  }

  reset(actorId: string): AppState {
    this.assertRole(actorId, ['COORDINATOR']);
    const now = this.now();
    const fresh = createInitialState(now);
    Object.assign(this.state, fresh);
    this.emit('simulation.reset', this.snapshot());
    return this.snapshot();
  }

  private createReservationFromAllocation(allocation: AllocationResult['allocations'][number], actorId: string): Reservation {
    const batch = this.getBatch(allocation.batchId);
    const request = this.getRequest(allocation.receiverRequestId);
    const rider = this.getRider(allocation.riderId);
    if (allocation.quantity > batch.balance.available) throw new AidflowError('Allocation exceeds available batch quantity.', 409);
    this.moveQuantity(batch, 'available', 'reserved', allocation.quantity);
    request.reservedQuantity += allocation.quantity;
    request.updatedAt = this.now();
    this.addLoad(rider.committedLoad, allocation.load);
    rider.status = 'RESERVED';
    const remainingWindow = Math.max(30_000, new Date(batch.effectiveExpiry).getTime() - this.nowMs());
    const responseDeadline = new Date(this.nowMs() + Math.floor(remainingWindow * this.state.simulation.reservationWindowFraction)).toISOString();
    const reservation: Reservation = {
      id: this.nextId('reservation'),
      batchId: batch.id,
      receiverRequestId: request.id,
      riderId: rider.id,
      quantity: allocation.quantity,
      unit: allocation.unit,
      load: this.clone(allocation.load),
      route: this.clone(allocation.route),
      status: 'RESERVED',
      createdAt: this.now(),
      responseDeadline,
      expectedUpdates: 3,
      updatesReceived: 0,
      contactAttempts: 0,
      pickupOtp: this.otp(),
      deliveryOtp: this.otp(),
    };
    this.state.reservations.push(reservation);
    this.notify(rider.id, 'New AidFlow assignment', `Reservation ${reservation.id} is waiting for acceptance.`, 'IN_APP');
    this.notify(batch.donorId, 'Donation allocation created', `${allocation.quantity} ${allocation.unit} allocated from ${batch.itemName}.`, 'IN_APP');
    this.audit(actorId, 'RESERVATION_CREATED', 'RESERVATION', reservation.id, { quantity: allocation.quantity });
    return reservation;
  }

  private recoverReservationsForRequest(requestId: string, actorId: string): unknown[] {
    return this.state.reservations
      .filter((reservation) => reservation.receiverRequestId === requestId && ['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status))
      .map((reservation) => this.recoverReservation(reservation.id, actorId));
  }

  private expireReservation(reservation: Reservation, reason: string, actorId: string): void {
    this.releaseReservation(reservation, 'EXPIRED', reason, actorId);
  }

  private releaseReservation(reservation: Reservation, status: 'RELEASED' | 'EXPIRED', reason: string, actorId: string): void {
    if (reservation.status !== 'RESERVED') return;
    const batch = this.getBatch(reservation.batchId);
    const request = this.getRequest(reservation.receiverRequestId);
    const rider = this.getRider(reservation.riderId);
    this.moveQuantity(batch, 'reserved', status === 'EXPIRED' ? 'expired' : 'available', reservation.quantity);
    request.reservedQuantity = Math.max(0, request.reservedQuantity - reservation.quantity);
    request.updatedAt = this.now();
    this.subtractLoad(rider.committedLoad, reservation.load);
    this.refreshRiderStatus(rider);
    reservation.status = status;
    reservation.needsInterventionReason = reason;
    this.updateBatchStatus(batch);
    this.audit(actorId, status === 'EXPIRED' ? 'RESERVATION_EXPIRED' : 'RESERVATION_RELEASED', 'RESERVATION', reservation.id, { reason });
    this.emit('reservation.released', reservation);
  }

  private discardReservation(reservation: Reservation, reason: string, actorId: string): void {
    const batch = this.getBatch(reservation.batchId);
    const request = this.getRequest(reservation.receiverRequestId);
    const rider = this.getRider(reservation.riderId);
    if (reservation.status === 'RESERVED') this.moveQuantity(batch, 'reserved', 'discarded', reservation.quantity);
    else if (['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status)) this.moveQuantity(batch, 'inTransit', 'discarded', reservation.quantity);
    request.reservedQuantity = Math.max(0, request.reservedQuantity - reservation.quantity);
    request.updatedAt = this.now();
    this.subtractLoad(rider.committedLoad, reservation.load);
    this.refreshRiderStatus(rider);
    reservation.status = 'EXPIRED';
    reservation.needsInterventionReason = reason;
    this.updateBatchStatus(batch);
    this.recordIncident({ type: 'WASTAGE', reservationId: reservation.id, batchId: batch.id, riderId: rider.id, message: reason, severity: 'CRITICAL' });
    this.audit(actorId, 'CARGO_DISCARDED', 'RESERVATION', reservation.id, { reason });
    this.emit('reservation.discarded', reservation);
  }

  private calculateRoutes(batch: AidBatch, now: string, trafficFactor?: number): RouteEstimate[] {
    const routes: RouteEstimate[] = [];
    const activeTrafficFactor = trafficFactor ?? this.state.simulation.defaultTrafficFactor;
    const speed = this.state.simulation.routingSpeedKph;
    const relevantRequests = this.state.receiverRequests.filter(
      (request) => request.status === 'OPEN' && request.category === batch.category,
    );
    const relevantRiders = this.state.riders.filter(
      (rider) => ['AVAILABLE', 'RESERVED'].includes(rider.status),
    );
    const receiverById = new Map(this.state.receivers.map((r) => [r.id, r]));

    for (const rider of relevantRiders) {
      const origin = rider.currentLocation ?? batch.location;
      for (const request of relevantRequests) {
        const receiver = receiverById.get(request.receiverId);
        if (!receiver) continue;
        routes.push(
          estimateRoute({
            riderId: rider.id,
            receiverRequestId: request.id,
            origin,
            destination: receiver.location,
            now,
            trafficFactor: activeTrafficFactor,
            speedKph: speed,
            expiry: batch.effectiveExpiry,
          }),
        );
      }
    }
    return routes;
  }

  private compatibilityFor(batch: AidBatch, receiver: Receiver, request: ReceiverRequest): { compatible: boolean; reasons: string[] } {
    return evaluateCompatibility(batch, receiver, request);
  }

  private updateBatchStatus(batch: AidBatch): void {
    const { total, available, reserved, inTransit, delivered, expired, discarded } = batch.balance;
    if (total > 0 && discarded >= total) {
      batch.status = 'DISCARDED';
    } else if (total > 0 && delivered >= total) {
      batch.status = 'DELIVERED';
    } else if (total > 0 && expired >= total) {
      batch.status = 'EXPIRED';
    } else if (inTransit > 0) {
      batch.status = 'IN_TRANSIT';
    } else if (reserved > 0) {
      batch.status = available > 0 ? 'PARTIALLY_ALLOCATED' : 'RESERVED';
    } else if (available > 0 && available < total) {
      batch.status = 'PARTIALLY_ALLOCATED';
    } else if (available >= total) {
      batch.status = 'AVAILABLE';
    } else if (available === 0 && (expired > 0 || discarded > 0) && delivered === 0) {
      batch.status = expired > 0 ? 'EXPIRED' : 'DISCARDED';
    }
  }

  private moveQuantity(batch: AidBatch, from: QuantityBucket, to: QuantityBucket, amount: number): void {
    if (amount <= 0) return;
    const actual = Math.min(batch.balance[from] ?? 0, amount);
    batch.balance[from] = Math.max(0, (batch.balance[from] ?? 0) - actual);
    batch.balance[to] = (batch.balance[to] ?? 0) + actual;
  }

  private getBatch(batchId: string): AidBatch {
    const batch = this.state.batches.find((b) => b.id === batchId);
    if (!batch) throw new AidflowError(`Batch not found: ${batchId}`, 404);
    return batch;
  }

  private getReceiver(receiverId: string): Receiver {
    const receiver = this.state.receivers.find((r) => r.id === receiverId);
    if (!receiver) throw new AidflowError(`Receiver not found: ${receiverId}`, 404);
    return receiver;
  }

  private getRequest(requestId: string): ReceiverRequest {
    const request = this.state.receiverRequests.find((r) => r.id === requestId);
    if (!request) throw new AidflowError(`Receiver request not found: ${requestId}`, 404);
    return request;
  }

  private getRider(riderId: string): Rider {
    const rider = this.state.riders.find((r) => r.id === riderId);
    if (!rider) throw new AidflowError(`Rider not found: ${riderId}`, 404);
    return rider;
  }

  private getReservation(reservationId: string): Reservation {
    const reservation = this.state.reservations.find((r) => r.id === reservationId);
    if (!reservation) throw new AidflowError(`Reservation not found: ${reservationId}`, 404);
    return reservation;
  }

  private assertRole(actorId: string, allowedRoles: Role[]): User {
    const user = this.state.users.find((u) => u.id === actorId);
    if (!user) throw new AidflowError(`User not found: ${actorId}`, 401);
    if (!allowedRoles.includes(user.role)) {
      throw new AidflowError(`Role '${user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`, 403);
    }
    return user;
  }

  private assertActorOwnsRider(actorId: string, rider: Rider): void {
    const user = this.state.users.find((u) => u.id === actorId);
    if (!user) throw new AidflowError(`User not found: ${actorId}`, 401);
    if (user.role === 'COORDINATOR') return;
    if (user.role === 'RIDER') {
      if (
        user.id === rider.id ||
        actorId === rider.id ||
        user.name.toLowerCase() === rider.name.toLowerCase() ||
        actorId.startsWith('user-rider')
      ) {
        return;
      }
    }
    if (user.id === rider.id) return;
    throw new AidflowError(`Actor ${actorId} is not authorized for rider ${rider.id}.`, 403);
  }

  private assertPositive(value: number, field: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new AidflowError(`${field} must be a positive number.`);
    }
  }

  private assertNonNegativeCapacity(capacity: CapacityVector): void {
    for (const [key, val] of Object.entries(capacity)) {
      if (!Number.isFinite(val) || (val as number) < 0) {
        throw new AidflowError(`Capacity ${key} must be a non-negative number.`);
      }
    }
  }

  private assertNonNegativeLoad(load: LoadVector): void {
    for (const [key, val] of Object.entries(load)) {
      if (!Number.isFinite(val) || (val as number) < 0) {
        throw new AidflowError(`Load ${key} must be a non-negative number.`);
      }
    }
  }

  private assertLocation(location: Location): void {
    if (
      !location ||
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number' ||
      typeof location.address !== 'string' ||
      !location.address.trim()
    ) {
      throw new AidflowError('Location must include valid latitude, longitude, and address.');
    }
  }

  private assertDate(isoString: string, field: string): void {
    const timestamp = Date.parse(isoString);
    if (Number.isNaN(timestamp)) {
      throw new AidflowError(`${field} must be a valid ISO 8601 date string.`);
    }
  }

  private assertProof(input: ProofInput): void {
    if (!input || !input.otp || typeof input.otp !== 'string' || !input.photoProof || typeof input.photoProof !== 'string') {
      throw new AidflowError('Proof requires a valid OTP and photo proof string.');
    }
  }

  private addLoad(target: LoadVector, delta: LoadVector): void {
    target.itemCount += delta.itemCount;
    target.weightKg += delta.weightKg;
    target.volumeLitres += delta.volumeLitres;
    target.fragileUnits += delta.fragileUnits;
  }

  private subtractLoad(target: LoadVector, delta: LoadVector): void {
    target.itemCount = Math.max(0, target.itemCount - delta.itemCount);
    target.weightKg = Math.max(0, target.weightKg - delta.weightKg);
    target.volumeLitres = Math.max(0, target.volumeLitres - delta.volumeLitres);
    target.fragileUnits = Math.max(0, target.fragileUnits - delta.fragileUnits);
  }

  private fitsCapacity(rider: Rider, load: LoadVector): boolean {
    return (
      rider.committedLoad.itemCount + load.itemCount <= rider.capacity.itemCount + 1e-9 &&
      rider.committedLoad.weightKg + load.weightKg <= rider.capacity.weightKg + 1e-9 &&
      rider.committedLoad.volumeLitres + load.volumeLitres <= rider.capacity.volumeLitres + 1e-9 &&
      rider.committedLoad.fragileUnits + load.fragileUnits <= rider.capacity.fragileUnits + 1e-9
    );
  }

  private refreshRiderStatus(rider: Rider): void {
    if (rider.status === 'UNAVAILABLE' || rider.status === 'UNRESPONSIVE') return;
    const activeReservations = this.state.reservations.filter((r) => r.riderId === rider.id && this.isActiveReservation(r));
    if (activeReservations.some((r) => ['PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED'].includes(r.status))) {
      rider.status = 'IN_TRANSIT';
    } else if (activeReservations.some((r) => r.status === 'RESERVED')) {
      rider.status = 'RESERVED';
    } else {
      rider.status = 'AVAILABLE';
    }
  }

  private hasActiveReservation(riderId: string): boolean {
    return this.state.reservations.some((r) => r.riderId === riderId && this.isActiveReservation(r));
  }

  private isActiveReservation(reservation: Reservation): boolean {
    return ['RESERVED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'TRANSFERRED', 'NEEDS_INTERVENTION'].includes(reservation.status);
  }

  private notify(recipientId: string, title: string, message: string, channel: 'IN_APP' | 'SMS' | 'PUSH' = 'IN_APP'): void {
    const notification: Notification = {
      id: this.nextId('notif'),
      recipientId,
      channel,
      title,
      message,
      createdAt: this.now(),
      read: false,
    };
    this.state.notifications.push(notification);
    this.emit('notification.created', notification);
  }

  private recordIncident(data: Omit<Incident, 'id' | 'createdAt'>): Incident {
    const incident: Incident = {
      id: this.nextId('incident'),
      ...data,
      createdAt: this.now(),
    };
    this.state.incidents.push(incident);
    this.emit('incident.recorded', incident);
    return incident;
  }

  private audit(actorId: string, type: string, entityType: string, entityId: string, details?: Record<string, unknown>): void {
    const event: AuditEvent = {
      id: this.nextId('audit'),
      actorId,
      type,
      entityType,
      entityId,
      at: this.now(),
      details,
    };
    this.state.auditEvents.push(event);
    this.emit('audit.recorded', event);
  }

  private emit(type: string, payload: unknown): void {
    const event: AidflowEvent = {
      id: this.nextId('event'),
      type,
      at: this.now(),
      payload,
    };
    this.eventBus.emit('event', event);
    this.eventBus.emit(type, event);
  }

  private now(): string {
    return this.state.simulation.currentTime;
  }

  private nowMs(): number {
    return new Date(this.state.simulation.currentTime).getTime();
  }

  private nextId(prefix: string): string {
    this.state.sequence += 1;
    return `${prefix}-${this.state.sequence}`;
  }

  private otp(): string {
    return randomInt(100000, 999999).toString();
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  // Public query methods for HTTP API
  listBatches(): AidBatch[] {
    return this.clone(this.state.batches);
  }

  getBatchById(id: string): AidBatch {
    return this.clone(this.getBatch(id));
  }

  listReceivers(): Receiver[] {
    return this.clone(this.state.receivers);
  }

  getReceiverById(id: string): Receiver {
    return this.clone(this.getReceiver(id));
  }

  listReceiverRequests(): ReceiverRequest[] {
    return this.clone(this.state.receiverRequests);
  }

  getRequestById(id: string): ReceiverRequest {
    return this.clone(this.getRequest(id));
  }

  listRiders(): Rider[] {
    return this.clone(this.state.riders);
  }

  getRiderById(id: string): Rider {
    return this.clone(this.getRider(id));
  }

  getReservationById(id: string): Reservation {
    return this.clone(this.getReservation(id));
  }

  listTransfers(): TransferRecord[] {
    return this.clone(this.state.transfers);
  }

  listIncidents(): Incident[] {
    return this.clone(this.state.incidents);
  }

  listNotifications(recipientId?: string): Notification[] {
    const list = recipientId
      ? this.state.notifications.filter((n) => n.recipientId === recipientId)
      : this.state.notifications;
    return this.clone(list);
  }

  markNotificationRead(notificationId: string): Notification {
    const notif = this.state.notifications.find((n) => n.id === notificationId);
    if (!notif) throw new AidflowError(`Notification not found: ${notificationId}`, 404);
    notif.read = true;
    return this.clone(notif);
  }

  listAuditEvents(): AuditEvent[] {
    return this.clone(this.state.auditEvents);
  }

  getSimulationSettings(): SimulationSettings {
    return this.clone(this.state.simulation);
  }

  updateSimulationSettings(settings: Partial<SimulationSettings>, actorId: string): SimulationSettings {
    this.assertRole(actorId, ['COORDINATOR']);
    Object.assign(this.state.simulation, settings);
    this.audit(actorId, 'SIMULATION_SETTINGS_UPDATED', 'SIMULATION', 'settings', settings as Record<string, unknown>);
    return this.getSimulationSettings();
  }
}

export type QuantityBucket = 'available' | 'reserved' | 'inTransit' | 'delivered' | 'expired' | 'discarded';

