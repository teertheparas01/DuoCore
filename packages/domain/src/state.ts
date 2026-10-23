import { AppState, SimulationSettings, User } from './models';

export const DEMO_USERS: User[] = [
  { id: 'user-donor-1', name: 'Demo Donor', role: 'DONOR', organization: 'Demo Kitchen' },
  { id: 'user-rider-1', name: 'Demo Rider', role: 'RIDER', contact: '+1-555-0101' },
  { id: 'user-receiver-1', name: 'Demo Receiver', role: 'RECEIVER', organization: 'Demo Shelter' },
  { id: 'user-coordinator-1', name: 'Demo Coordinator', role: 'COORDINATOR', organization: 'AidFlow Operations' },
];

export function createInitialState(now = new Date().toISOString()): AppState {
  const simulation: SimulationSettings = {
    currentTime: now,
    locationUpdateIntervalSeconds: 15,
    noResponseAfterSeconds: 45,
    reservationWindowFraction: 0.25,
    defaultTrafficFactor: 1,
    routingSpeedKph: 25,
  };
  return {
    sequence: 0,
    users: DEMO_USERS.map((user) => ({ ...user })),
    batches: [],
    receivers: [],
    receiverRequests: [],
    riders: [],
    reservations: [],
    transfers: [],
    incidents: [],
    notifications: [],
    auditEvents: [],
    simulation,
  };
}
