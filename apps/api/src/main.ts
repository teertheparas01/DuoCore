import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createInitialState, ShelfLifeRule } from '@aidflow/domain';
import { DEFAULT_SHELF_LIFE_RULES } from '@aidflow/domain';
import {
  AidflowApplication,
  AidflowError,
  AidflowEvent,
  CreateBatchInput,
  CreateReceiverInput,
  CreateRequestInput,
  CreateRiderInput,
  LocationUpdateInput,
  PreviewInput,
  ProofInput,
  TransferInput,
  UpdateBatchInput,
  UpdateRequestInput,
} from './aidflow.service';
import { InMemoryStateStore, loadOrCreateState, PostgresStateStore, StateStore } from './storage';

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

// ──────────── Helpers ────────────

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {} as T;
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.');
  }
  return parsed as T;
}

function actorId(request: IncomingMessage): string {
  // Demo auth: X-Actor-Id header or default to coordinator
  return (request.headers['x-actor-id'] as string) ?? 'user-coordinator-1';
}

function param(segments: string[], index: number): string {
  const value = segments[index];
  if (!value) throw new AidflowError('Missing URL parameter.', 400);
  return value;
}

// ──────────── SSE clients ────────────

const sseClients = new Set<ServerResponse>();

function broadcastSSE(event: AidflowEvent): void {
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}

// ──────────── Route handler ────────────

async function handle(
  app: AidflowApplication,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  // CORS
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', 'content-type, x-actor-id');
  response.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const method = request.method ?? 'GET';
  const actor = actorId(request);

  // ──── Health ────
  if (method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok', service: 'aidflow-api' });
    return;
  }

  // ──── SSE events stream ────
  if (method === 'GET' && url.pathname === '/events') {
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    response.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
    sseClients.add(response);
    request.on('close', () => sseClients.delete(response));
    return;
  }

  // ──── Full state snapshot ────
  if (method === 'GET' && url.pathname === '/state') {
    sendJson(response, 200, app.snapshot());
    await app.persist();
    return;
  }

  // ──── Auth / Users ────
  if (method === 'GET' && url.pathname === '/users') {
    sendJson(response, 200, app.users());
    return;
  }
  if (method === 'GET' && url.pathname === '/users/me') {
    const users = app.users();
    const me = users.find((u) => u.id === actor);
    if (!me) { sendJson(response, 404, { error: `User not found: ${actor}` }); return; }
    sendJson(response, 200, me);
    return;
  }
  if (method === 'POST' && url.pathname === '/auth/login') {
    const body = await readJson<{ userId?: string }>(request);
    const userId = body.userId ?? actor;
    const users = app.users();
    const user = users.find((u) => u.id === userId);
    if (!user) { sendJson(response, 404, { error: `User not found: ${userId}` }); return; }
    sendJson(response, 200, { token: `demo-token-${userId}`, user });
    return;
  }

  // ──── Batches ────
  if (method === 'GET' && url.pathname === '/batches') {
    sendJson(response, 200, app.listBatches());
    return;
  }
  if (method === 'GET' && segments[0] === 'batches' && segments.length === 2) {
    sendJson(response, 200, app.getBatchById(param(segments, 1)));
    return;
  }
  if (method === 'POST' && url.pathname === '/batches') {
    const result = app.createBatch(await readJson<CreateBatchInput>(request), actor);
    await app.persist();
    sendJson(response, 201, result);
    return;
  }
  if (method === 'PUT' && segments[0] === 'batches' && segments.length === 2) {
    const result = app.updateBatch(param(segments, 1), await readJson<UpdateBatchInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'batches' && segments[2] === 'add-quantity' && segments.length === 3) {
    const body = await readJson<{ quantity: number }>(request);
    const result = app.addBatchQuantity(param(segments, 1), body.quantity, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'batches' && segments[2] === 'split' && segments.length === 3) {
    const body = await readJson<{ quantities: number[] }>(request);
    const result = app.splitBatch(param(segments, 1), body.quantities, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Allocation preview & commit ────
  if (method === 'POST' && segments[0] === 'batches' && segments[2] === 'allocation-preview' && segments.length === 3) {
    sendJson(response, 200, app.previewAllocation(param(segments, 1), await readJson<PreviewInput>(request)));
    return;
  }
  if (method === 'POST' && segments[0] === 'batches' && segments[2] === 'allocate' && segments.length === 3) {
    const result = app.allocateBatch(param(segments, 1), await readJson<PreviewInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Receivers ────
  if (method === 'GET' && url.pathname === '/receivers') {
    sendJson(response, 200, app.listReceivers());
    return;
  }
  if (method === 'GET' && segments[0] === 'receivers' && segments.length === 2) {
    sendJson(response, 200, app.getReceiverById(param(segments, 1)));
    return;
  }
  if (method === 'POST' && url.pathname === '/receivers') {
    const result = app.createReceiver(await readJson<CreateReceiverInput>(request), actor);
    await app.persist();
    sendJson(response, 201, result);
    return;
  }
  if (method === 'PATCH' && segments[0] === 'receivers' && segments[2] === 'status' && segments.length === 3) {
    const body = await readJson<{ status: 'OPEN' | 'CLOSED' }>(request);
    const result = app.updateReceiverStatus(param(segments, 1), body.status, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Receiver requests ────
  if (method === 'GET' && url.pathname === '/requests') {
    sendJson(response, 200, app.listReceiverRequests());
    return;
  }
  if (method === 'GET' && segments[0] === 'requests' && segments.length === 2) {
    sendJson(response, 200, app.getRequestById(param(segments, 1)));
    return;
  }
  if (method === 'POST' && url.pathname === '/requests') {
    const result = app.createReceiverRequest(await readJson<CreateRequestInput>(request), actor);
    await app.persist();
    sendJson(response, 201, result);
    return;
  }
  if ((method === 'PUT' || method === 'PATCH') && segments[0] === 'requests' && segments.length === 2) {
    const result = app.updateReceiverRequest(param(segments, 1), await readJson<UpdateRequestInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Riders ────
  if (method === 'GET' && url.pathname === '/riders') {
    sendJson(response, 200, app.listRiders());
    return;
  }
  if (method === 'GET' && segments[0] === 'riders' && segments.length === 2) {
    sendJson(response, 200, app.getRiderById(param(segments, 1)));
    return;
  }
  if (method === 'POST' && url.pathname === '/riders') {
    const result = app.createRider(await readJson<CreateRiderInput>(request), actor);
    await app.persist();
    sendJson(response, 201, result);
    return;
  }
  if (method === 'PATCH' && segments[0] === 'riders' && segments[2] === 'status' && segments.length === 3) {
    const body = await readJson<{ status: string }>(request);
    const result = app.updateRiderStatus(param(segments, 1), body.status as any, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if ((method === 'PUT' || method === 'PATCH') && segments[0] === 'riders' && segments[2] === 'location' && segments.length === 3) {
    const result = app.updateRiderLocation(param(segments, 1), await readJson<LocationUpdateInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Reservations ────
  if (method === 'GET' && url.pathname === '/reservations') {
    sendJson(response, 200, app.listReservations());
    return;
  }
  if (method === 'GET' && segments[0] === 'reservations' && segments.length === 2) {
    sendJson(response, 200, app.getReservationById(param(segments, 1)));
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'accept' && segments.length === 3) {
    const result = app.acceptReservation(param(segments, 1), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'reject' && segments.length === 3) {
    const result = app.rejectReservation(param(segments, 1), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'pickup' && segments.length === 3) {
    const result = app.confirmPickup(param(segments, 1), await readJson<ProofInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'in-transit' && segments.length === 3) {
    const result = app.markInTransit(param(segments, 1), await readJson<LocationUpdateInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if ((method === 'PUT' || method === 'PATCH') && segments[0] === 'reservations' && segments[2] === 'location' && segments.length === 3) {
    const result = app.updateReservationLocation(param(segments, 1), await readJson<LocationUpdateInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'deliver' && segments.length === 3) {
    const result = app.confirmDelivery(param(segments, 1), await readJson<ProofInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'transfer' && segments.length === 3) {
    const result = app.transferReservation(param(segments, 1), await readJson<TransferInput>(request), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && segments[0] === 'reservations' && segments[2] === 'recover' && segments.length === 3) {
    const result = app.recoverReservation(param(segments, 1), actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Transfers ────
  if (method === 'GET' && url.pathname === '/transfers') {
    sendJson(response, 200, app.listTransfers());
    return;
  }

  // ──── Incidents ────
  if (method === 'GET' && url.pathname === '/incidents') {
    sendJson(response, 200, app.listIncidents());
    return;
  }

  // ──── Notifications ────
  if (method === 'GET' && url.pathname === '/notifications') {
    const recipientId = url.searchParams.get('recipientId') ?? undefined;
    sendJson(response, 200, app.listNotifications(recipientId));
    return;
  }
  if (method === 'PATCH' && segments[0] === 'notifications' && segments[2] === 'read' && segments.length === 3) {
    const result = app.markNotificationRead(param(segments, 1));
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Audit events ────
  if (method === 'GET' && url.pathname === '/audit') {
    sendJson(response, 200, app.listAuditEvents());
    return;
  }

  // ──── Shelf-life rules ────
  if (method === 'GET' && url.pathname === '/shelf-life-rules') {
    sendJson(response, 200, app.getRules());
    return;
  }
  if (method === 'PUT' && url.pathname === '/shelf-life-rules') {
    const body = await readJson<{ rules: ShelfLifeRule[] }>(request);
    const result = app.setRules(body.rules, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  // ──── Simulation ────
  if (method === 'GET' && url.pathname === '/simulation') {
    sendJson(response, 200, app.getSimulationSettings());
    return;
  }
  if (method === 'PATCH' && url.pathname === '/simulation') {
    const body = await readJson<Record<string, unknown>>(request);
    const result = app.updateSimulationSettings(body as any, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && url.pathname === '/simulation/advance') {
    const body = await readJson<{ minutes: number }>(request);
    const result = app.advanceTime(body.minutes, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && url.pathname === '/simulation/set-time') {
    const body = await readJson<{ time: string }>(request);
    const result = app.setTime(body.time, actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && url.pathname === '/simulation/process') {
    const changes = app.processDueOperations(actor);
    await app.persist();
    sendJson(response, 200, { changes });
    return;
  }

  // ──── Scenario seeding & reset ────
  if (method === 'POST' && url.pathname === '/simulation/seed') {
    const result = app.seedScenario(actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }
  if (method === 'POST' && url.pathname === '/simulation/reset') {
    const result = app.reset(actor);
    await app.persist();
    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, { error: 'Route not found.' });
}

// ──────────── Bootstrap ────────────

async function bootstrap(): Promise<void> {
  const store: StateStore = databaseUrl
    ? new PostgresStateStore(databaseUrl)
    : new InMemoryStateStore();

  const state = await loadOrCreateState(store);
  const rules: ShelfLifeRule[] = DEFAULT_SHELF_LIFE_RULES;
  const app = new AidflowApplication(state, store, rules);

  // Auto-seed initial Pune Shivaji Nagar grid scenario if empty
  if (state.batches.length === 0) {
    app.seedScenario('user-coordinator-1');
    const batches = app.listBatches();
    if (batches.length > 0) {
      try {
        app.allocateBatch(batches[0].id, {}, 'user-coordinator-1');
      } catch (err) {
        console.warn('Initial auto-allocate:', err);
      }
    }
  }

  // Broadcast all domain events to SSE clients
  app.subscribe(broadcastSSE);

  const server = createServer((request, response) => {
    void handle(app, request, response).catch((error: unknown) => {
      if (error instanceof AidflowError) {
        sendJson(response, error.statusCode, { error: error.message, details: error.details });
      } else {
        const message = error instanceof Error ? error.message : 'Unexpected error.';
        sendJson(response, 400, { error: message });
      }
    });
  });

  server.listen(port, () => {
    console.log(`AidFlow API listening on http://localhost:${port}`);
    console.log(`Storage: ${databaseUrl ? 'PostgreSQL' : 'In-memory'}`);
  });
}

void bootstrap();
