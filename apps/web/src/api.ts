const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

async function request<T>(path: string, options: RequestInit = {}, actorId = "user-coordinator-1"): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-actor-id": actorId,
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) errMessage = data.error;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  return response.json() as Promise<T>;
}

export interface ApiBatch {
  id: string;
  donorId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  createdAt: string;
  effectiveExpiry: string;
  storageCondition: string;
  status: string;
  balance: {
    total: number;
    available: number;
    reserved: number;
    inTransit: number;
    delivered: number;
    expired: number;
    discarded: number;
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
  };
}

export interface ApiReceiver {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
  };
  capabilities: string[];
  storageConditions: string[];
}

export interface ApiRequest {
  id: string;
  receiverId: string;
  itemName?: string;
  category: string;
  requestedQuantity: number;
  unit: string;
  fulfilledQuantity: number;
  reservedQuantity: number;
  priority: number;
  urgency: number;
  status: string;
}

export interface ApiRider {
  id: string;
  name: string;
  status: string;
  capacity: {
    itemCount: number;
    weightKg: number;
    volumeLitres: number;
    fragileUnits: number;
  };
  committedLoad: {
    itemCount: number;
    weightKg: number;
    volumeLitres: number;
    fragileUnits: number;
  };
  vehicleType?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface ApiReservation {
  id: string;
  batchId: string;
  receiverRequestId: string;
  riderId: string;
  quantity: number;
  unit: string;
  status: string;
  pickupOtp: string;
  deliveryOtp: string;
  route?: {
    distanceKm: number;
    travelMinutes: number;
    trafficFactor: number;
    estimatedArrival: string;
    expiryRisk: string;
  };
  load?: {
    itemCount: number;
    weightKg: number;
    volumeLitres: number;
    fragileUnits: number;
  };
}

export interface ApiIncident {
  id: string;
  type: string;
  reservationId?: string;
  batchId?: string;
  receiverRequestId?: string;
  riderId?: string;
  message: string;
  createdAt: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, string | number | boolean>;
}

export interface ApiTransfer {
  id: string;
  reservationId: string;
  fromRiderId: string;
  toRiderId: string;
  quantity: number;
  recordedAt: string;
  note?: string;
}

export interface ApiAuditEvent {
  id: string;
  actorId: string;
  type: string;
  entityType: string;
  entityId: string;
  at: string;
  details?: Record<string, unknown>;
}

export interface ApiNotification {
  id: string;
  recipientId: string;
  channel: 'IN_APP' | 'SMS' | 'PUSH';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ApiSimulationSettings {
  currentTime: string;
  locationUpdateIntervalSeconds: number;
  noResponseAfterSeconds: number;
  reservationWindowFraction: number;
  defaultTrafficFactor: number;
  routingSpeedKph: number;
}

export interface ApiState {
  batches: ApiBatch[];
  receivers: ApiReceiver[];
  receiverRequests: ApiRequest[];
  riders: ApiRider[];
  reservations: ApiReservation[];
  incidents: ApiIncident[];
  notifications: ApiNotification[];
  transfers: ApiTransfer[];
  auditEvents: ApiAuditEvent[];
  simulation: ApiSimulationSettings;
}

export const api = {
  baseUrl: API_BASE,

  async checkHealth(): Promise<{ status: string }> {
    return request<{ status: string }>("/health");
  },

  async getState(): Promise<ApiState> {
    return request<ApiState>("/state");
  },

  async listBatches(): Promise<ApiBatch[]> {
    return request<ApiBatch[]>("/batches");
  },

  async createBatch(
    data: {
      donorId?: string;
      itemName: string;
      category: string;
      quantity: number;
      unit: string;
      storageCondition?: string;
      location: { latitude: number; longitude: number; address: string };
    },
    actorId = "user-donor-1"
  ): Promise<ApiBatch> {
    return request<ApiBatch>(
      "/batches",
      {
        method: "POST",
        body: JSON.stringify({
          donorId: data.donorId ?? actorId,
          ...data,
        }),
      },
      actorId
    );
  },

  async previewAllocation(batchId: string): Promise<any> {
    return request<any>(`/batches/${batchId}/allocation-preview`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async allocateBatch(batchId: string, actorId = "user-coordinator-1"): Promise<any> {
    return request<any>(
      `/batches/${batchId}/allocate`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
      actorId
    );
  },

  async listReceivers(): Promise<ApiReceiver[]> {
    return request<ApiReceiver[]>("/receivers");
  },

  async createReceiver(
    data: {
      name: string;
      location: { latitude: number; longitude: number; address: string };
      capabilities?: string[];
      storageConditions?: string[];
    },
    actorId = "user-receiver-1"
  ): Promise<ApiReceiver> {
    return request<ApiReceiver>(
      "/receivers",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      actorId
    );
  },

  async listRequests(): Promise<ApiRequest[]> {
    return request<ApiRequest[]>("/requests");
  },

  async createRequest(
    data: {
      receiverId: string;
      itemName?: string;
      category: string;
      requestedQuantity: number;
      unit: string;
      urgency?: number;
      priority?: number;
    },
    actorId = "user-receiver-1"
  ): Promise<ApiRequest> {
    return request<ApiRequest>(
      "/requests",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      actorId
    );
  },

  async updateReceiverStatus(
    receiverId: string,
    status: "OPEN" | "CLOSED",
    actorId = "user-coordinator-1"
  ): Promise<any> {
    return request<any>(
      `/receivers/${receiverId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      actorId
    );
  },

  async listRiders(): Promise<ApiRider[]> {
    return request<ApiRider[]>("/riders");
  },

  async listReservations(): Promise<ApiReservation[]> {
    return request<ApiReservation[]>("/reservations");
  },

  async acceptReservation(reservationId: string, actorId = "user-rider-1"): Promise<any> {
    return request<any>(`/reservations/${reservationId}/accept`, { method: "POST" }, actorId);
  },

  async confirmPickup(
    reservationId: string,
    otp: string,
    photoProof = "mock_pickup.jpg",
    actorId = "user-rider-1"
  ): Promise<any> {
    return request<any>(
      `/reservations/${reservationId}/pickup`,
      {
        method: "POST",
        body: JSON.stringify({ otp, photoProof }),
      },
      actorId
    );
  },

  async confirmDelivery(
    reservationId: string,
    otp: string,
    photoProof = "mock_delivery.jpg",
    actorId = "user-rider-1"
  ): Promise<any> {
    return request<any>(
      `/reservations/${reservationId}/deliver`,
      {
        method: "POST",
        body: JSON.stringify({ otp, photoProof }),
      },
      actorId
    );
  },

  async advanceTime(minutes = 15, actorId = "user-coordinator-1"): Promise<any> {
    return request<any>(
      "/simulation/advance",
      {
        method: "POST",
        body: JSON.stringify({ minutes }),
      },
      actorId
    );
  },

  async seedScenario(actorId = "user-coordinator-1"): Promise<ApiState> {
    return request<ApiState>("/simulation/seed", { method: "POST" }, actorId);
  },

  async listIncidents(): Promise<ApiIncident[]> {
    return request<ApiIncident[]>("/incidents");
  },

  async listTransfers(): Promise<ApiTransfer[]> {
    return request<ApiTransfer[]>("/transfers");
  },

  async listAuditEvents(): Promise<ApiAuditEvent[]> {
    return request<ApiAuditEvent[]>("/audit");
  },

  async listNotifications(recipientId?: string): Promise<ApiNotification[]> {
    const path = recipientId ? `/notifications?recipientId=${encodeURIComponent(recipientId)}` : "/notifications";
    return request<ApiNotification[]>(path);
  },

  async markNotificationRead(notificationId: string): Promise<any> {
    return request<any>(
      `/notifications/${notificationId}/read`,
      { method: "PATCH" }
    );
  },

  async getSimulationSettings(): Promise<ApiSimulationSettings> {
    return request<ApiSimulationSettings>("/simulation");
  },

  async updateSimulationSettings(settings: Partial<ApiSimulationSettings>, actorId = "user-coordinator-1"): Promise<any> {
    return request<any>(
      "/simulation",
      {
        method: "PATCH",
        body: JSON.stringify(settings),
      },
      actorId
    );
  },

  subscribeEvents(onEvent: (event: any) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/events`);
    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch {
        // ignore
      }
    };
    eventSource.addEventListener("batch.created", (e: any) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });
    eventSource.addEventListener("dispatch.allocated", (e: any) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });
    eventSource.addEventListener("reservation.delivered", (e: any) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });
    eventSource.addEventListener("simulation.time.advanced", (e: any) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });

    return () => {
      eventSource.close();
    };
  }
};