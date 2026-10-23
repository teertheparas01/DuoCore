export type Role = "donor" | "receiver" | "rider" | "coordinator";

export interface DonationBatch {
  id: string;
  source: string;
  item: string;
  category: "cooked_food" | "ration_kits" | "infant_formula" | "essential_aid";
  weightKg: number;
  portionCount: number;
  cookedAt: string;
  expiresInMinutes: number;
  temp: string;
  thermalState: "hot" | "warm" | "ambient" | "cold";
  status: "Ready for Pickup" | "Critical Window" | "Packing Now" | "Stored in Cold Hub" | "In Transit" | "Delivered";
  assignedRider: string;
  parentBatchId?: string;
  subBatches?: string[];
}

export interface DemandRequest {
  id: string;
  shelter: string;
  category: "cooked_food" | "ration_kits" | "infant_formula" | "essential_aid";
  items: string;
  portionCount: number;
  urgency: "High" | "Medium" | "Normal";
  timeNeeded: string;
  status: "Unfulfilled" | "Scheduled" | "In Transit" | "Fulfilled";
  dietary: string;
  contact: string;
  location: string;
}

export interface VolunteerRider {
  id: string;
  name: string;
  vehicle: string;
  carrierCapacityMaxKg: number;
  carrierCapacityUsedKg: number;
  location: string;
  run: string;
  eta: string;
  status: "Available" | "In Transit" | "Off Duty";
  phone: string;
}

export interface DispatchAssignment {
  id: string;
  donationBatchId?: string;
  requestId?: string;
  origin: string;
  destination: string;
  cargo: string;
  recommendedRider: string;
  vehicle: string;
  matchScore: string;
  eta: string;
  expiryMargin: string;
  status: "Pending Approval" | "Critical Priority" | "Dispatched (En Route)" | "Delivered";
}

export interface InterventionItem {
  id: string;
  type: "EXPIRY_DEADLINE" | "CAPACITY_MISMATCH" | "TRAFFIC_BOTTLENECK" | "UNRESPONSIVE_RIDER";
  severity: "critical" | "warning" | "notice";
  title: string;
  details: string;
  recommendation: string;
  actionLabel: string;
  status: "Action Required" | "Resolved & Executed";
}

export interface ActivityLogItem {
  id: string;
  time: string;
  text: string;
  type: "donor" | "rider" | "receiver" | "coordinator" | "system";
}

export interface DatabaseSchema {
  donations: DonationBatch[];
  requests: DemandRequest[];
  riders: VolunteerRider[];
  dispatches: DispatchAssignment[];
  interventions: InterventionItem[];
  activities: ActivityLogItem[];
}
