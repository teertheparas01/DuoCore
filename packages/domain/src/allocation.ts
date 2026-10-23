import {
  AidBatch,
  Allocation,
  AllocationResult,
  LoadVector,
  Receiver,
  ReceiverRequest,
  Rider,
  RouteEstimate,
} from './models';
import { evaluateCompatibility } from './compatibility';

export interface AllocationInput {
  batch: AidBatch;
  receivers: Receiver[];
  requests: ReceiverRequest[];
  riders: Rider[];
  routes: RouteEstimate[];
  now: string;
}

function remainingRequest(request: ReceiverRequest): number {
  const requestedRemaining = Math.max(0, request.requestedQuantity - request.fulfilledQuantity - request.reservedQuantity);
  return requestedRemaining;
}

function remainingCapacity(rider: Rider): LoadVector {
  return {
    itemCount: Math.max(0, rider.capacity.itemCount - rider.committedLoad.itemCount),
    weightKg: Math.max(0, rider.capacity.weightKg - rider.committedLoad.weightKg),
    volumeLitres: Math.max(0, rider.capacity.volumeLitres - rider.committedLoad.volumeLitres),
    fragileUnits: Math.max(0, rider.capacity.fragileUnits - rider.committedLoad.fragileUnits),
  };
}

function loadForQuantity(batch: AidBatch, quantity: number): LoadVector {
  return {
    itemCount: batch.loadPerUnit.itemCount * quantity,
    weightKg: batch.loadPerUnit.weightKg * quantity,
    volumeLitres: batch.loadPerUnit.volumeLitres * quantity,
    fragileUnits: batch.loadPerUnit.fragileUnits * quantity,
  };
}

function fitsLoad(available: LoadVector, requested: LoadVector): boolean {
  return (
    requested.itemCount <= available.itemCount + 1e-9 &&
    requested.weightKg <= available.weightKg + 1e-9 &&
    requested.volumeLitres <= available.volumeLitres + 1e-9 &&
    requested.fragileUnits <= available.fragileUnits + 1e-9
  );
}

function maxQuantityForCapacity(batch: AidBatch, available: LoadVector): number {
  const candidates = [Number.POSITIVE_INFINITY];
  if (batch.loadPerUnit.itemCount > 0) candidates.push(available.itemCount / batch.loadPerUnit.itemCount);
  if (batch.loadPerUnit.weightKg > 0) candidates.push(available.weightKg / batch.loadPerUnit.weightKg);
  if (batch.loadPerUnit.volumeLitres > 0) candidates.push(available.volumeLitres / batch.loadPerUnit.volumeLitres);
  if (batch.loadPerUnit.fragileUnits > 0) candidates.push(available.fragileUnits / batch.loadPerUnit.fragileUnits);
  return Math.max(0, Math.floor(Math.min(...candidates)));
}

function requestSort(left: ReceiverRequest, right: ReceiverRequest): number {
  return right.urgency - left.urgency || right.priority - left.priority || left.id.localeCompare(right.id);
}

function routeSort(left: { rider: Rider; route: RouteEstimate }, right: { rider: Rider; route: RouteEstimate }): number {
  return (
    left.route.travelMinutes - right.route.travelMinutes ||
    left.route.distanceKm - right.route.distanceKm ||
    right.rider.reliabilityScore - left.rider.reliabilityScore ||
    left.rider.id.localeCompare(right.rider.id)
  );
}

function scoreAllocation(request: ReceiverRequest, route: RouteEstimate, batch: AidBatch): number {
  const expiryMinutes = Math.max(0, (new Date(batch.effectiveExpiry).getTime() - new Date(route.estimatedArrival).getTime()) / 60_000);
  return request.urgency * 10_000 + request.priority * 1_000 + expiryMinutes - route.travelMinutes * 2 - route.distanceKm;
}

export function allocateBatch(input: AllocationInput): AllocationResult {
  const allocations: Allocation[] = [];
  let remainingQuantity = Math.max(0, input.batch.balance.available);
  const reasons = new Set<string>();
  const receiverById = new Map(input.receivers.map((receiver) => [receiver.id, receiver]));
  const routeByPair = new Map(input.routes.map((route) => [`${route.riderId}:${route.receiverRequestId}`, route]));
  const remainingRiderCapacity = new Map(input.riders.map((rider) => [rider.id, remainingCapacity(rider)]));

  if (new Date(input.batch.effectiveExpiry).getTime() <= new Date(input.now).getTime()) {
    return {
      batchId: input.batch.id,
      allocations: [],
      unallocated: {
        quantity: remainingQuantity,
        unit: input.batch.unit,
        reasons: ['Donation is past its effective safe-delivery deadline.'],
      },
    };
  }

  const openRequests = input.requests
    .filter((request) => request.status === 'OPEN' && remainingRequest(request) > 0 && request.category === input.batch.category)
    .sort(requestSort);

  if (openRequests.length === 0) reasons.add('No open compatible-category receiver demand is currently available.');

  for (const request of openRequests) {
    if (remainingQuantity <= 0) break;
    const receiver = receiverById.get(request.receiverId);
    if (!receiver || receiver.status !== 'OPEN') {
      reasons.add(`Receiver request ${request.id} is not open for allocation.`);
      continue;
    }

    const compatibility = evaluateCompatibility(input.batch, receiver, request);
    if (!compatibility.compatible) {
      compatibility.reasons.forEach((reason) => reasons.add(reason));
      continue;
    }

    const demand = Math.min(remainingQuantity, remainingRequest(request));
    const candidates = input.riders
      .filter((rider) => ['AVAILABLE', 'RESERVED'].includes(rider.status))
      .map((rider) => ({ rider, route: routeByPair.get(`${rider.id}:${request.id}`) }))
      .filter((candidate): candidate is { rider: Rider; route: RouteEstimate } => Boolean(candidate.route))
      .filter((candidate) => candidate.route.expiryRisk !== 'INFEASIBLE')
      .sort(routeSort);

    if (candidates.length === 0) {
      reasons.add(`No feasible rider route is available for ${receiver.name}.`);
      continue;
    }

    const totalCapacity = candidates.reduce(
      (sum, candidate) => sum + Math.min(maxQuantityForCapacity(input.batch, remainingRiderCapacity.get(candidate.rider.id)!), demand),
      0,
    );
    if (!request.partialDeliveryAccepted && totalCapacity < demand) {
      reasons.add(`${receiver.name} does not accept partial delivery and available rider capacity cannot fill the request.`);
      continue;
    }

    let requestRemaining = demand;
    for (const candidate of candidates) {
      if (requestRemaining <= 0 || remainingQuantity <= 0) break;
      const capacity = remainingRiderCapacity.get(candidate.rider.id)!;
      const maxByRider = maxQuantityForCapacity(input.batch, capacity);
      const quantity = Math.min(requestRemaining, remainingQuantity, maxByRider);
      if (quantity <= 0) continue;
      const load = loadForQuantity(input.batch, quantity);
      if (!fitsLoad(capacity, load)) continue;

      allocations.push({
        batchId: input.batch.id,
        riderId: candidate.rider.id,
        receiverRequestId: request.id,
        quantity,
        unit: input.batch.unit,
        load,
        route: candidate.route,
        score: scoreAllocation(request, candidate.route, input.batch),
        rationale: [
          'Compatible receiver request selected.',
          `Priority ${request.priority} and urgency ${request.urgency} considered.`,
          `Estimated travel time: ${candidate.route.travelMinutes} minutes.`,
          `Expiry risk: ${candidate.route.expiryRisk}.`,
        ],
      });

      remainingQuantity -= quantity;
      requestRemaining -= quantity;
      remainingRiderCapacity.set(candidate.rider.id, {
        itemCount: capacity.itemCount - load.itemCount,
        weightKg: capacity.weightKg - load.weightKg,
        volumeLitres: capacity.volumeLitres - load.volumeLitres,
        fragileUnits: capacity.fragileUnits - load.fragileUnits,
      });
    }
  }

  if (remainingQuantity > 0 && allocations.length > 0) {
    reasons.add('Remaining quantity exceeds currently feasible rider capacity or receiver demand.');
  }
  if (input.riders.every((rider) => maxQuantityForCapacity(input.batch, remainingCapacity(rider)) <= 0)) {
    reasons.add('No available rider capacity remains for this batch.');
  }

  return {
    batchId: input.batch.id,
    allocations,
    unallocated: {
      quantity: remainingQuantity,
      unit: input.batch.unit,
      reasons: [...reasons],
    },
  };
}

export { loadForQuantity, maxQuantityForCapacity, remainingCapacity };
