import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, DEFAULT_SHELF_LIFE_RULES } from '@aidflow/domain';
import { AidflowApplication } from './aidflow.service';
import { InMemoryStateStore } from './storage';

function setupApp() {
  const state = createInitialState('2026-10-23T10:00:00.000Z');
  const store = new InMemoryStateStore(state);
  const app = new AidflowApplication(state, store, DEFAULT_SHELF_LIFE_RULES);
  return { app, state };
}

test('AidFlow Application Service - end to end operational lifecycle', async (t) => {
  const { app } = setupApp();

  await t.test('seeds demo scenario correctly', () => {
    const seeded = app.seedScenario('user-coordinator-1');
    assert.equal(seeded.batches.length, 1);
    assert.equal(seeded.batches[0].quantity, 180);
    assert.equal(seeded.receivers.length, 3);
    assert.equal(seeded.riders.length, 3);
  });

  await t.test('allocation preview computes capacity-aware split and unallocated remainder', () => {
    const batches = app.listBatches();
    const batchId = batches[0].id;
    const preview = app.previewAllocation(batchId);

    assert.equal(preview.batchId, batchId);
    assert.equal(preview.unallocated.quantity, 40);
    assert.equal(preview.allocations.reduce((sum, a) => sum + a.quantity, 0), 140);
  });

  await t.test('allocates batch into reservations and tracks OTPs and balances', () => {
    const batches = app.listBatches();
    const batchId = batches[0].id;
    const { plan, reservations } = app.allocateBatch(batchId, {}, 'user-coordinator-1');

    assert.equal(reservations.length, 5);
    const updatedBatch = app.getBatchById(batchId);
    assert.equal(updatedBatch.balance.available, 40);
    assert.equal(updatedBatch.balance.reserved, 140);
    assert.equal(updatedBatch.status, 'PARTIALLY_ALLOCATED');

    // Each reservation must have 6-digit OTPs
    for (const r of reservations) {
      assert.match(r.pickupOtp, /^\d{6}$/);
      assert.match(r.deliveryOtp, /^\d{6}$/);
    }
  });

  await t.test('full pickup and delivery flow with OTP validation', () => {
    const reservations = app.listReservations();
    const firstRes = reservations[0];

    // Accept
    const accepted = app.acceptReservation(firstRes.id, 'user-rider-1');
    assert.ok(accepted.acceptedAt);

    // Reject wrong OTP
    assert.throws(
      () => app.confirmPickup(firstRes.id, { otp: '000000', photoProof: 'proof.jpg' }, 'user-rider-1'),
      /Pickup OTP is invalid/
    );

    // Confirm pickup with valid OTP
    const pickedUp = app.confirmPickup(firstRes.id, { otp: firstRes.pickupOtp, photoProof: 'proof.jpg' }, 'user-rider-1');
    assert.equal(pickedUp.status, 'PICKUP_CONFIRMED');

    // In transit
    const inTransit = app.markInTransit(firstRes.id, { location: { latitude: 28.62, longitude: 77.21, address: 'En route' } }, 'user-rider-1');
    assert.equal(inTransit.status, 'IN_TRANSIT');

    // Confirm delivery with valid OTP
    const delivered = app.confirmDelivery(firstRes.id, { otp: firstRes.deliveryOtp, photoProof: 'pod.jpg' }, 'user-rider-1');
    assert.equal(delivered.status, 'DELIVERED');

    const updatedBatch = app.getBatchById(firstRes.batchId);
    assert.equal(updatedBatch.balance.delivered, firstRes.quantity);
  });

  await t.test('rider-to-rider cargo transfer', () => {
    const reservations = app.listReservations();
    const secondRes = reservations[1]; // reservation for rider-33

    app.acceptReservation(secondRes.id, 'user-rider-1');
    app.confirmPickup(secondRes.id, { otp: secondRes.pickupOtp, photoProof: 'proof2.jpg' }, 'user-rider-1');

    // Transfer from rider-33 to rider-29 (who completed delivery and is available)
    const { reservation, transfer } = app.transferReservation(
      secondRes.id,
      { toRiderId: 'rider-29', note: 'Breakdown' },
      'user-rider-1'
    );

    assert.equal(reservation.status, 'TRANSFERRED');
    assert.equal(reservation.riderId, 'rider-29');
    assert.equal(transfer.quantity, secondRes.quantity);
  });

  await t.test('destination recovery when receiver closes', () => {
    // When Shelter A (receiver-5) closes, any in-transit delivery to Shelter A should reroute to Shelter B
    const result = app.updateReceiverStatus('receiver-5', 'CLOSED', 'user-coordinator-1');
    assert.equal(result.receiver.status, 'CLOSED');
    assert.ok(result.recoveries.length > 0);
    const rec = result.recoveries[0] as { status: string; reservation: { receiverRequestId: string } };
    assert.equal(rec.status, 'REROUTED');
    assert.equal(rec.reservation.receiverRequestId, 'request-21');
  });

  await t.test('simulation time advance flags unresponsive rider and expires overdue reservation', () => {
    const { changes } = app.advanceTime(60, 'user-coordinator-1');
    const unresponsive = changes.find((c: any) => c.type === 'RIDER_UNRESPONSIVE');
    const expired = changes.find((c: any) => c.type === 'RESERVATION_EXPIRED');

    assert.ok(unresponsive, 'Should flag unresponsive rider');
    assert.ok(expired, 'Should expire unaccepted reservation');

    const incidents = app.listIncidents();
    assert.ok(incidents.length > 0);
  });
});
