import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ActivityLogItem,
  DatabaseSchema,
  DemandRequest,
  DispatchAssignment,
  DonationBatch,
  InterventionItem,
  VolunteerRider,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const initialDatabase: DatabaseSchema = {
  donations: [
    {
      id: "BATCH-89",
      source: "FC Road Community Kitchen",
      item: "85 Warm Bhakri & Dal Packets",
      category: "cooked_food",
      weightKg: 26,
      portionCount: 85,
      cookedAt: "1:45 PM",
      expiresInMinutes: 32,
      temp: "Hot (64°C)",
      thermalState: "hot",
      status: "Ready for Pickup",
      assignedRider: "Unassigned",
    },
    {
      id: "BATCH-90",
      source: "JM Road Annapurna Center",
      item: "24 Tiffin Meals (Rice & Curry)",
      category: "cooked_food",
      weightKg: 14,
      portionCount: 24,
      cookedAt: "1:15 PM",
      expiresInMinutes: 18,
      temp: "Warm (55°C)",
      thermalState: "warm",
      status: "Critical Window",
      assignedRider: "Rider 04 · Akash",
    },
    {
      id: "BATCH-91",
      source: "Gokhale Institute Mess Surplus",
      item: "50 Chapati Packs & Sabzi",
      category: "cooked_food",
      weightKg: 18,
      portionCount: 50,
      cookedAt: "2:00 PM",
      expiresInMinutes: 55,
      temp: "Hot (68°C)",
      thermalState: "hot",
      status: "Packing Now",
      assignedRider: "Unassigned",
    },
    {
      id: "BATCH-92",
      source: "Agricultural College Research Canteen",
      item: "30 Fruit & Protein Ration Boxes",
      category: "ration_kits",
      weightKg: 22,
      portionCount: 30,
      cookedAt: "12:30 PM",
      expiresInMinutes: 240,
      temp: "Ambient (24°C)",
      thermalState: "ambient",
      status: "Stored in Cold Hub",
      assignedRider: "Standby",
    },
  ],
  requests: [
    {
      id: "REQ-101",
      shelter: "Shivaji Nagar Rain Basera (Near ST Depot)",
      category: "cooked_food",
      items: "60 Hot Thali Meals",
      portionCount: 60,
      urgency: "High",
      timeNeeded: "Within 25 min",
      status: "Unfulfilled",
      dietary: "Vegetarian / No Onion",
      contact: "Dr. Kulkarni (+91 98220 11234)",
      location: "Near Shivaji Nagar ST Stand",
    },
    {
      id: "REQ-102",
      shelter: "Sangam Ghat Relief Camp",
      category: "ration_kits",
      items: "35 Ration Kits (Flour, Dal, Oil)",
      portionCount: 35,
      urgency: "Medium",
      timeNeeded: "Within 2 hours",
      status: "In Transit",
      dietary: "Dry Groceries",
      contact: "Ramesh Shinde (+91 94230 55678)",
      location: "Mutha River Confluence Ghat",
    },
    {
      id: "REQ-103",
      shelter: "COEP Night Shelter Ward",
      category: "cooked_food",
      items: "40 Fresh Bhakri & Pithla Packs",
      portionCount: 40,
      urgency: "High",
      timeNeeded: "Within 15 min",
      status: "Unfulfilled",
      dietary: "Fresh Cooked",
      contact: "Prof. Joshi (+91 98900 88219)",
      location: "COEP North Campus Hostel",
    },
    {
      id: "REQ-104",
      shelter: "Sancheti Chowk Transit Camp",
      category: "essential_aid",
      items: "25 Clean Water Jerry Cans & Biscuits",
      portionCount: 25,
      urgency: "Normal",
      timeNeeded: "Within 3 hours",
      status: "Scheduled",
      dietary: "Packaged Aid",
      contact: "Pooja Salve (+91 97654 32109)",
      location: "Near Sancheti Hospital Chowk",
    },
  ],
  riders: [
    {
      id: "RIDER-04",
      name: "Akash Deshmukh",
      vehicle: "Hero Electric E-Scooter",
      carrierCapacityMaxKg: 40,
      carrierCapacityUsedKg: 22,
      location: "Crossing Sangam Bridge (COEP)",
      run: "FC Road Kitchen → Shivaji Nagar Shelter",
      eta: "6 mins",
      status: "In Transit",
      phone: "+91 98230 44556",
    },
    {
      id: "RIDER-07",
      name: "Rahul Patil",
      vehicle: "Honda Activa + Rear Insulated Crate",
      carrierCapacityMaxKg: 35,
      carrierCapacityUsedKg: 10,
      location: "JM Road Sambhaji Park",
      run: "JM Road Center → Sangam Ghat Camp",
      eta: "11 mins",
      status: "In Transit",
      phone: "+91 98765 12345",
    },
    {
      id: "RIDER-11",
      name: "Priya Shinde",
      vehicle: "Cycle with Front Cargo Rack",
      carrierCapacityMaxKg: 20,
      carrierCapacityUsedKg: 0,
      location: "Agricultural College Gate",
      run: "Standby for Short Radius Dispatch",
      eta: "Available",
      status: "Available",
      phone: "+91 97650 98765",
    },
    {
      id: "RIDER-15",
      name: "Tanmay Kulkarni",
      vehicle: "Mahindra Bolero Aid Van",
      carrierCapacityMaxKg: 150,
      carrierCapacityUsedKg: 45,
      location: "Sancheti Chowk Flyover",
      run: "Agri College Cold Hub → Relief Points",
      eta: "14 mins",
      status: "In Transit",
      phone: "+91 99220 88776",
    },
  ],
  dispatches: [
    {
      id: "DSP-301",
      origin: "FC Road Community Kitchen",
      destination: "Shivaji Nagar Rain Basera",
      cargo: "85 Warm Meals (26 kg)",
      recommendedRider: "Rider 04 (Akash)",
      vehicle: "Hero Electric E-Scooter",
      matchScore: "98%",
      eta: "14 min",
      expiryMargin: "32 min remaining",
      status: "Pending Approval",
    },
    {
      id: "DSP-302",
      origin: "Gokhale Institute Mess",
      destination: "COEP Night Shelter",
      cargo: "50 Chapati Packs (18 kg)",
      recommendedRider: "Rider 07 (Rahul)",
      vehicle: "Activa + Insulated Box",
      matchScore: "94%",
      eta: "11 min",
      expiryMargin: "55 min remaining",
      status: "Pending Approval",
    },
    {
      id: "DSP-303",
      origin: "JM Road Annapurna Center",
      destination: "Sangam Ghat Relief Camp",
      cargo: "24 Tiffin Meals (14 kg)",
      recommendedRider: "Rider 11 (Priya)",
      vehicle: "Cargo Cycle",
      matchScore: "89%",
      eta: "8 min",
      expiryMargin: "18 min remaining (URGENT)",
      status: "Critical Priority",
    },
  ],
  interventions: [
    {
      id: "INT-801",
      type: "EXPIRY_DEADLINE",
      severity: "critical",
      title: "Batch #90 on JM Road reaching 18-minute critical threshold",
      details: "Original destination shelter reporting gate queue delay. Temperature dropped to 54°C.",
      recommendation: "Divert shipment to Agricultural College Cold Hub (1.1 km away).",
      actionLabel: "Divert to Cold Storage Hub",
      status: "Action Required",
    },
    {
      id: "INT-802",
      type: "CAPACITY_MISMATCH",
      severity: "warning",
      title: "FC Road Kitchen batch (26 kg) exceeds Rider 11's cargo limit (20 kg)",
      details: "Attempted assignment causes 6 kg safety overload on two-wheeler carrier.",
      recommendation: "Split donation into two 13 kg sub-batches across Rider 11 & Rider 04.",
      actionLabel: "Auto-Split & Dispatch Dual Riders",
      status: "Action Required",
    },
    {
      id: "INT-803",
      type: "TRAFFIC_BOTTLENECK",
      severity: "notice",
      title: "Sancheti Chowk junction congestion (+12 min delay)",
      details: "Peak hour traffic bottleneck detected on Shivaji Road underpass.",
      recommendation: "Push alternate route via Dengle Bridge to all 3 active en-route carriers.",
      actionLabel: "Broadcast Dengle Bridge Bypass",
      status: "Action Required",
    },
  ],
  activities: [
    { id: "ACT-01", time: "2 min ago", text: "FC Road Community Kitchen posted 85 warm meals (Bhakri & Dal).", type: "donor" },
    { id: "ACT-02", time: "7 min ago", text: "Rider 04 (Akash) accepted pickup assignment at JM Road Center.", type: "rider" },
    { id: "ACT-03", time: "11 min ago", text: "Batch #90 reached 20-minute safety threshold. Coordinator alerted.", type: "system" },
    { id: "ACT-04", time: "18 min ago", text: "Shivaji Nagar Rain Basera verified receipt of 30 meal kits.", type: "receiver" },
    { id: "ACT-05", time: "24 min ago", text: "Agri College Cold Hub opened 40 reserve crates for overflow aid.", type: "coordinator" },
    { id: "ACT-06", time: "35 min ago", text: "Dengle Bridge transit route verified clear of flooding.", type: "system" },
  ],
};

let inMemoryDb: DatabaseSchema | null = null;

export async function getDb(): Promise<DatabaseSchema> {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DB_FILE, "utf-8");
    inMemoryDb = JSON.parse(content) as DatabaseSchema;
    return inMemoryDb;
  } catch {
    inMemoryDb = JSON.parse(JSON.stringify(initialDatabase));
    await saveDb();
    return inMemoryDb!;
  }
}

export async function saveDb(): Promise<void> {
  if (!inMemoryDb) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(inMemoryDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist database to file, keeping in-memory:", err);
  }
}

// ── CRUD Helpers ──────────────────────────────────────────

export async function getDonations(): Promise<DonationBatch[]> {
  const db = await getDb();
  return db.donations;
}

export async function createDonation(payload: Partial<DonationBatch>): Promise<DonationBatch> {
  const db = await getDb();
  const newDonation: DonationBatch = {
    id: `BATCH-${Math.floor(Math.random() * 900 + 100)}`,
    source: payload.source || "FC Road Kitchen",
    item: payload.item || "Fresh Meals",
    category: payload.category || "cooked_food",
    weightKg: Number(payload.weightKg) || 15,
    portionCount: Number(payload.portionCount) || 50,
    cookedAt: payload.cookedAt || "Just now",
    expiresInMinutes: Number(payload.expiresInMinutes) || 45,
    temp: payload.temp || "Hot (65°C)",
    thermalState: payload.thermalState || "hot",
    status: "Ready for Pickup",
    assignedRider: "Unassigned",
  };

  db.donations.unshift(newDonation);
  db.activities.unshift({
    id: `ACT-${Date.now()}`,
    time: "Just now",
    text: `${newDonation.source} published ${newDonation.item} (${newDonation.weightKg} kg).`,
    type: "donor",
  });
  await saveDb();
  return newDonation;
}

export async function splitDonation(id: string): Promise<DonationBatch[]> {
  const db = await getDb();
  const index = db.donations.findIndex((d) => d.id === id);
  if (index === -1) throw new Error("Donation batch not found");

  const original = db.donations[index];
  const halfWeight = Math.round((original.weightKg / 2) * 10) / 10;
  const halfPortions = Math.floor(original.portionCount / 2);

  const sub1: DonationBatch = {
    ...original,
    id: `${original.id}-A`,
    parentBatchId: original.id,
    weightKg: halfWeight,
    portionCount: halfPortions,
    item: `${original.item} (Split A)`,
    status: "Ready for Pickup",
  };

  const sub2: DonationBatch = {
    ...original,
    id: `${original.id}-B`,
    parentBatchId: original.id,
    weightKg: original.weightKg - halfWeight,
    portionCount: original.portionCount - halfPortions,
    item: `${original.item} (Split B)`,
    status: "Ready for Pickup",
  };

  db.donations.splice(index, 1, sub1, sub2);
  db.activities.unshift({
    id: `ACT-${Date.now()}`,
    time: "Just now",
    text: `Batch ${original.id} split into ${sub1.id} and ${sub2.id} for parallel dispatch.`,
    type: "coordinator",
  });
  await saveDb();
  return [sub1, sub2];
}

export async function getRequests(): Promise<DemandRequest[]> {
  const db = await getDb();
  return db.requests;
}

export async function createRequest(payload: Partial<DemandRequest>): Promise<DemandRequest> {
  const db = await getDb();
  const newRequest: DemandRequest = {
    id: `REQ-${Math.floor(Math.random() * 900 + 100)}`,
    shelter: payload.shelter || "Shivaji Nagar Rain Basera",
    category: payload.category || "cooked_food",
    items: payload.items || "Warm Thali Meals",
    portionCount: Number(payload.portionCount) || 50,
    urgency: payload.urgency || "High",
    timeNeeded: payload.timeNeeded || "Within 30 min",
    status: "Unfulfilled",
    dietary: payload.dietary || "Vegetarian",
    contact: payload.contact || "Anita Kulkarni (+91 98220 11234)",
    location: payload.location || "Shivaji Nagar Sector",
  };

  db.requests.unshift(newRequest);
  db.activities.unshift({
    id: `ACT-${Date.now()}`,
    time: "Just now",
    text: `${newRequest.shelter} posted request for ${newRequest.items}.`,
    type: "receiver",
  });
  await saveDb();
  return newRequest;
}

export async function updateRequest(id: string, updates: Partial<DemandRequest>): Promise<DemandRequest> {
  const db = await getDb();
  const req = db.requests.find((r) => r.id === id);
  if (!req) throw new Error("Request not found");

  Object.assign(req, updates);
  if (updates.status === "In Transit") {
    db.activities.unshift({
      id: `ACT-${Date.now()}`,
      time: "Just now",
      text: `Dispatch assigned for ${req.shelter}: ${req.items}.`,
      type: "coordinator",
    });
  }
  await saveDb();
  return req;
}

export async function getRiders(): Promise<VolunteerRider[]> {
  const db = await getDb();
  return db.riders;
}

export async function updateRider(id: string, updates: Partial<VolunteerRider>): Promise<VolunteerRider> {
  const db = await getDb();
  const rider = db.riders.find((r) => r.id === id);
  if (!rider) throw new Error("Rider not found");

  Object.assign(rider, updates);
  await saveDb();
  return rider;
}

export async function getDispatches(): Promise<DispatchAssignment[]> {
  const db = await getDb();
  return db.dispatches;
}

export async function updateDispatch(id: string, updates: Partial<DispatchAssignment>): Promise<DispatchAssignment> {
  const db = await getDb();
  const dispatch = db.dispatches.find((d) => d.id === id);
  if (!dispatch) throw new Error("Dispatch not found");

  Object.assign(dispatch, updates);
  if (updates.status === "Dispatched (En Route)") {
    db.activities.unshift({
      id: `ACT-${Date.now()}`,
      time: "Just now",
      text: `${dispatch.id} dispatched via ${dispatch.recommendedRider}: ${dispatch.cargo}.`,
      type: "rider",
    });
  }
  await saveDb();
  return dispatch;
}

export async function autoMatchDispatches(): Promise<DispatchAssignment[]> {
  const db = await getDb();
  // Mark pending dispatches as active
  for (const d of db.dispatches) {
    if (d.status === "Pending Approval") {
      d.status = "Dispatched (En Route)";
    }
  }
  db.activities.unshift({
    id: `ACT-${Date.now()}`,
    time: "Just now",
    text: "Coordinator triggered Auto-Match: all feasible allocations dispatched.",
    type: "coordinator",
  });
  await saveDb();
  return db.dispatches;
}

export async function getInterventions(): Promise<InterventionItem[]> {
  const db = await getDb();
  return db.interventions;
}

export async function resolveIntervention(id: string): Promise<InterventionItem> {
  const db = await getDb();
  const item = db.interventions.find((i) => i.id === id);
  if (!item) throw new Error("Intervention not found");

  item.status = "Resolved & Executed";
  db.activities.unshift({
    id: `ACT-${Date.now()}`,
    time: "Just now",
    text: `Intervention ${item.id} resolved: ${item.actionLabel}.`,
    type: "coordinator",
  });
  await saveDb();
  return item;
}

export async function getActivities(): Promise<ActivityLogItem[]> {
  const db = await getDb();
  return db.activities;
}
