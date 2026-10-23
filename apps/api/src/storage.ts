import { Pool } from 'pg';
import { AppState, createInitialState } from '@aidflow/domain';

export interface StateStore {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  close?(): Promise<void>;
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export class InMemoryStateStore implements StateStore {
  private state: AppState | null;

  constructor(initialState?: AppState) {
    this.state = initialState ? cloneState(initialState) : null;
  }

  async load(): Promise<AppState | null> {
    return this.state ? cloneState(this.state) : null;
  }

  async save(state: AppState): Promise<void> {
    this.state = cloneState(state);
  }
}

export class PostgresStateStore implements StateStore {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async load(): Promise<AppState | null> {
    await this.ensureSchema();
    const result = await this.pool.query<{ state: AppState }>(
      'SELECT state FROM aidflow_state WHERE id = 1',
    );
    return result.rows[0]?.state ?? null;
  }

  async save(state: AppState): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `INSERT INTO aidflow_state (id, state, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [JSON.stringify(state)],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS aidflow_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
}

export async function loadOrCreateState(store: StateStore, now = new Date().toISOString()): Promise<AppState> {
  const loaded = await store.load();
  if (loaded) return loaded;
  const state = createInitialState(now);
  await store.save(state);
  return state;
}
