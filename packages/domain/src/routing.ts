import { Location, RouteEstimate } from './models';

export interface RoutingInput {
  riderId: string;
  receiverRequestId: string;
  origin: Location;
  destination: Location;
  now: string;
  trafficFactor?: number;
  speedKph?: number;
  expiry?: string;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(origin: Location, destination: Location): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(destination.latitude - origin.latitude);
  const lonDelta = toRadians(destination.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateRoute(input: RoutingInput): RouteEstimate {
  const distanceKm = haversineDistanceKm(input.origin, input.destination);
  const trafficFactor = Math.max(0.1, input.trafficFactor ?? 1);
  const speedKph = Math.max(1, input.speedKph ?? 25);
  const travelMinutes = Math.max(1, Math.ceil((distanceKm / speedKph) * 60 * trafficFactor));
  const estimatedArrival = new Date(new Date(input.now).getTime() + travelMinutes * 60_000).toISOString();
  let expiryRisk: RouteEstimate['expiryRisk'] = 'LOW';
  if (input.expiry) {
    const remainingMinutes = (new Date(input.expiry).getTime() - new Date(input.now).getTime()) / 60_000;
    const margin = remainingMinutes - travelMinutes;
    if (margin < 0) expiryRisk = 'INFEASIBLE';
    else if (margin < 15) expiryRisk = 'HIGH';
    else if (margin < 30) expiryRisk = 'MEDIUM';
  }

  return {
    riderId: input.riderId,
    receiverRequestId: input.receiverRequestId,
    distanceKm: Number(distanceKm.toFixed(3)),
    travelMinutes,
    trafficFactor,
    estimatedArrival,
    expiryRisk,
  };
}
