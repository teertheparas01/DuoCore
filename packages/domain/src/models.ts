export type Role = 'DONOR' | 'RIDER' | 'RECEIVER' | 'COORDINATOR';

export type AidCategory =
  | 'COOKED_FOOD'
  | 'RAW_RATION_KITS'
  | 'INFANT_FORMULA'
  | 'ESSENTIAL_RELIEF_KITS';

export type AidUnit = 'MEALS' | 'UNITS' | 'KITS' | 'BOXES' | 'KG' | 'LITERS';

export type StorageCondition = 'AMBIENT' | 'REFRIGERATED' | 'FROZEN' | 'UNKNOWN';

export type BatchStatus =
  | 'AVAILABLE'
  | 'PARTIALLY_ALLOCATED'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'EXPIRED'
  | 'DISCARDED'
  | 'NEEDS_INTERVENTION';

export type ReceiverStatus = 'OPEN' | 'CLOSED';

export type RequestStatus = 'OPEN' | 'FULFILLED' | 'CLOSED';

export type RiderStatus = 'AVAILABLE' | 'RESERVED' | 'IN_TRANSIT' | 'UNAVAILABLE' | 'UNRESPONSIVE';

export type ReservationStatus =
  | 'RESERVED'
  | 'PICKUP_CONFIRMED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'RELEASED'
  | 'NEEDS_INTERVENTION'
  | 'TRANSFERRED';

export type IncidentType =
  | 'RESERVATION_TIMEOUT'
  | 'RIDER_UNRESPONSIVE'
  | 'DESTINATION_RECOVERY'
  | 'FALLBACK_STORAGE'
  | 'WASTAGE'
  | 'COMPATIBILITY_BLOCK'
  | 'EXPIRY_RISK'
  | 'MANUAL_OVERRIDE';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  contact?: string;
  organization?: string;
}

export interface AidRequirements {
  requiredCapabilities?: string[];
  requiredStorageConditions?: StorageCondition[];
  requiresFragileHandling?: boolean;
  notes?: string;
}

export interface CapacityVector {
  itemCount: number;
  weightKg: number;
  volumeLitres: number;
  fragileUnits: number;
}

export interface LoadVector {
  itemCount: number;
  weightKg: number;
  volumeLitres: number;
  fragileUnits: number;
}

export interface ExpiryEstimate {
  expiresAt: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'DONOR' | 'RULE_BASED' | 'SAFER_OF_DONOR_AND_RULE';
  warning?: string;
}

export interface QuantityBalance {
  total: number;
  available: number;
  reserved: number;
  inTransit: number;
  delivered: number;
  expired: number;
  discarded: number;
}

export interface AidBatch {
  id: string;
  parentBatchId?: string;
  donorId: string;
  itemName: string;
  category: AidCategory;
  quantity: number;
  unit: AidUnit;
  createdAt: string;
  preparedAt?: string;
  donorExpiry?: string;
  ruleBasedExpiry?: ExpiryEstimate;
  effectiveExpiry: string;
  expiryConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  expiryWarning?: string;
  storageCondition: StorageCondition;
  dietaryInformation?: string;
  allergens: string[];
  fragile: boolean;
  loadPerUnit: LoadVector;
  requirements: AidRequirements;
  location: Location;
  status: BatchStatus;
  balance: QuantityBalance;
  splitIndex?: number;
}

export interface Receiver {
  id: string;
  name: string;
  status: ReceiverStatus;
  location: Location;
  capabilities: string[];
  storageConditions: StorageCondition[];
  contact?: string;
  operatingHours?: string;
}

export interface ReceiverRequest {
  id: string;
  receiverId: string;
  itemName?: string;
  category: AidCategory;
  requestedQuantity: number;
  unit: AidUnit;
  fulfilledQuantity: number;
  reservedQuantity: number;
  priority: number;
  urgency: number;
  partialDeliveryAccepted: boolean;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Rider {
  id: string;
  name: string;
  status: RiderStatus;
  capacity: CapacityVector;
  committedLoad: LoadVector;
  vehicleType?: string;
  currentLocation?: Location;
  lastLocationAt?: string;
  reliabilityScore: number;
}

export interface RouteEstimate {
  riderId: string;
  receiverRequestId: string;
  distanceKm: number;
  travelMinutes: number;
  trafficFactor: number;
  estimatedArrival: string;
  expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'INFEASIBLE';
}

export interface Allocation {
  batchId: string;
  riderId: string;
  receiverRequestId: string;
  quantity: number;
  unit: AidUnit;
  load: LoadVector;
  route: RouteEstimate;
  score: number;
  rationale: string[];
}

export interface UnallocatedRemainder {
  quantity: number;
  unit: AidUnit;
  reasons: string[];
}

export interface AllocationResult {
  batchId: string;
  allocations: Allocation[];
  unallocated: UnallocatedRemainder;
}

export interface Proof {
  otp: string;
  photoProof: string;
  recordedAt: string;
  recordedBy: string;
}

export interface Reservation {
  id: string;
  batchId: string;
  receiverRequestId: string;
  riderId: string;
  quantity: number;
  unit: AidUnit;
  load: LoadVector;
  route: RouteEstimate;
  status: ReservationStatus;
  createdAt: string;
  acceptedAt?: string;
  responseDeadline: string;
  expectedUpdates: number;
  updatesReceived: number;
  lastUpdateAt?: string;
  contactAttempts: number;
  lastContactAttemptAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  pickupOtp: string;
  deliveryOtp: string;
  pickupProof?: Proof;
  deliveryProof?: Proof;
  currentLocation?: Location;
  fallbackLocation?: Location;
  needsInterventionReason?: string;
  physicalCustodyRiderId?: string;
}

export interface TransferRecord {
  id: string;
  reservationId: string;
  fromRiderId: string;
  toRiderId: string;
  quantity: number;
  recordedAt: string;
  note?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  reservationId?: string;
  batchId?: string;
  receiverRequestId?: string;
  riderId?: string;
  message: string;
  createdAt: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, string | number | boolean>;
}

export interface Notification {
  id: string;
  recipientId: string;
  channel: 'IN_APP' | 'SMS' | 'PUSH';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  type: string;
  entityType: string;
  entityId: string;
  at: string;
  details?: Record<string, unknown>;
}

export interface SimulationSettings {
  currentTime: string;
  locationUpdateIntervalSeconds: number;
  noResponseAfterSeconds: number;
  reservationWindowFraction: number;
  defaultTrafficFactor: number;
  routingSpeedKph: number;
}

export interface AppState {
  sequence: number;
  users: User[];
  batches: AidBatch[];
  receivers: Receiver[];
  receiverRequests: ReceiverRequest[];
  riders: Rider[];
  reservations: Reservation[];
  transfers: TransferRecord[];
  incidents: Incident[];
  notifications: Notification[];
  auditEvents: AuditEvent[];
  simulation: SimulationSettings;
}
