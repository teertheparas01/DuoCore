import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AidBatch,
  Receiver,
  ReceiverRequest,
  Rider,
  allocateBatch,
  estimateRoute,
  estimateShelfLife,
} from './index';

const now = '2026-10-23T10:00:00.000Z';

function batch(overrides: Partial<AidBatch> = {}): AidBatch {
  return {
    id: 'batch-1',
    donorId: 'donor-1',
    itemName: 'Cooked meals',
    category: 'COOKED_FOOD',
    quantity: 180,
    unit: 'MEALS',
    createdAt: now,
    effectiveExpiry: '2026-10-23T11:15:00.000Z',
    expiryConfidence: 'LOW',
    storageCondition: 'AMBIENT',
    allergens: [],
    fragile: false,
    loadPerUnit: { itemCount: 1, weightKg: 0.25, volumeLitres: 0.5, fragileUnits: 0 },
    requirements: {},
    location: { latitude: 28.6139, longitude: 77.209, address: 'Donor gate' },
    status: 'AVAILABLE',
    balance: { total: 180, available: 180, reserved: 0, inTransit: 0, delivered: 0, expired: 0, discarded: 0 },
    ...overrides,
  };
}

function receiver(id: string): Receiver {
  return {
    id,
    name: id,
    status: 'OPEN',
    location: { latitude: 28.62, longitude: 77.21, address: id },
    capabilities: [],
    storageConditions: ['AMBIENT'],
  };
}

function request(id: string, receiverId: string, quantity: number, priority: number): ReceiverRequest {
  return {
    id,
    receiverId,
    category: 'COOKED_FOOD',
    requestedQuantity: quantity,
    unit: 'MEALS',
    fulfilledQuantity: 0,
    reservedQuantity: 0,
    priority,
    urgency: priority,
    partialDeliveryAccepted: true,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  };
}

function rider(id: string, itemCount: number): Rider {
  return {
    id,
    name: id,
    status: 'AVAILABLE',
    capacity: { itemCount, weightKg: itemCount * 0.25, volumeLitres: itemCount * 0.5, fragileUnits: 0 },
    committedLoad: { itemCount: 0, weightKg: 0, volumeLitres: 0, fragileUnits: 0 },
    reliabilityScore: 1,
  };
}

function route(riderId: string, receiverRequestId: string, minutes: number): ReturnType<typeof estimateRoute> {
  return {
    riderId,
    receiverRequestId,
    distanceKm: 2,
    travelMinutes: minutes,
    trafficFactor: 1,
    estimatedArrival: new Date(new Date(now).getTime() + minutes * 60_000).toISOString(),
    expiryRisk: 'LOW',
  };
}

test('splits a donation across riders and preserves the unallocated remainder', () => {
  const result = allocateBatch({
    batch: batch(),
    receivers: [receiver('shelter-a'), receiver('shelter-b'), receiver('shelter-c')],
    requests: [request('request-a', 'shelter-a', 50, 3), request('request-b', 'shelter-b', 70, 2), request('request-c', 'shelter-c', 60, 1)],
    riders: [rider('rider-a', 40), rider('rider-b', 60), rider('rider-c', 40)],
    routes: [
      route('rider-a', 'request-a', 20), route('rider-b', 'request-a', 25), route('rider-c', 'request-a', 30),
      route('rider-a', 'request-b', 20), route('rider-b', 'request-b', 25), route('rider-c', 'request-b', 30),
      route('rider-a', 'request-c', 25), route('rider-b', 'request-c', 25), route('rider-c', 'request-c', 25),
    ],
    now,
  });

  assert.equal(result.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0), 140);
  assert.equal(result.unallocated.quantity, 40);
  assert.ok(result.unallocated.reasons.length > 0);
});

test('blocks a receiver that lacks required capabilities', () => {
  const result = allocateBatch({
    batch: batch({ requirements: { requiredCapabilities: ['COOKING_FACILITY'] } }),
    receivers: [receiver('shelter-a')],
    requests: [request('request-a', 'shelter-a', 50, 3)],
    riders: [rider('rider-a', 40)],
    routes: [route('rider-a', 'request-a', 20)],
    now,
  });

  assert.equal(result.allocations.length, 0);
  assert.equal(result.unallocated.quantity, 180);
  assert.match(result.unallocated.reasons[0], /missing confirmed capabilities/);
});

test('rejects a route that reaches after expiry', () => {
  const result = allocateBatch({
    batch: batch({ effectiveExpiry: '2026-10-23T10:10:00.000Z' }),
    receivers: [receiver('shelter-a')],
    requests: [request('request-a', 'shelter-a', 50, 3)],
    riders: [rider('rider-a', 40)],
    routes: [{ ...route('rider-a', 'request-a', 20), expiryRisk: 'INFEASIBLE' }],
    now,
  });

  assert.equal(result.allocations.length, 0);
  assert.equal(result.unallocated.quantity, 180);
  assert.match(result.unallocated.reasons[0], /No feasible rider route/);
});

test('uses the safer donor or rule-based expiry', () => {
  const estimate = estimateShelfLife({
    category: 'COOKED_FOOD',
    storageCondition: 'AMBIENT',
    createdAt: now,
    donorExpiry: '2026-10-23T10:30:00.000Z',
  });

  assert.equal(estimate.expiresAt, '2026-10-23T10:30:00.000Z');
  assert.equal(estimate.source, 'SAFER_OF_DONOR_AND_RULE');
});
