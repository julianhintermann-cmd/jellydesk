import type { ProbeResult } from '@/lib/connection/probe';

export type { ProbeResult };
export type ConnectionMode = 'local' | 'external' | 'offline';

export interface ServerUrls {
  local: string;
  external?: string;
}

export interface ConnectionState {
  mode: ConnectionMode;
  baseUrl: string | null;
  consecutiveFailures: number;
}

export interface ConnectionDeps {
  probe: (url: string, timeoutMs: number) => Promise<ProbeResult>;
}

export interface ConnectionOptions {
  localTimeoutMs: number;
  externalTimeoutMs: number;
  recheckMs: number;
  failureThreshold: number;
}

const DEFAULTS: ConnectionOptions = {
  localTimeoutMs: 2500,
  externalTimeoutMs: 6000,
  recheckMs: 60_000,
  failureThreshold: 3,
};

type Listener = (state: ConnectionState) => void;

export class ConnectionManager {
  private state: ConnectionState = { mode: 'offline', baseUrl: null, consecutiveFailures: 0 };
  private listeners = new Set<Listener>();
  private recheckTimer: ReturnType<typeof setInterval> | null = null;
  private readonly options: ConnectionOptions;
  private generation = 0;
  private reconnectPending = false;

  constructor(
    private readonly urls: ServerUrls,
    private readonly deps: ConnectionDeps,
    options: Partial<ConnectionOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  getState(): ConnectionState {
    return this.state;
  }

  baseUrl(): string | null {
    return this.state.baseUrl;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(): Promise<ConnectionState> {
    const gen = ++this.generation;
    if (await this.isUp(this.urls.local, this.options.localTimeoutMs)) {
      if (gen !== this.generation) return this.state;
      return this.set('local', this.urls.local);
    }
    if (this.urls.external && (await this.isUp(this.urls.external, this.options.externalTimeoutMs))) {
      if (gen !== this.generation) return this.state;
      return this.set('external', this.urls.external);
    }
    if (gen !== this.generation) return this.state;
    return this.set('offline', null);
  }

  startRecheck(): void {
    this.stop();
    this.recheckTimer = setInterval(() => void this.recheck(), this.options.recheckMs);
  }

  stop(): void {
    if (this.recheckTimer) clearInterval(this.recheckTimer);
    this.recheckTimer = null;
  }

  reportSuccess(): void {
    if (this.state.consecutiveFailures !== 0) this.set(this.state.mode, this.state.baseUrl, 0);
  }

  reportFailure(): void {
    const failures = this.state.consecutiveFailures + 1;
    if (failures >= this.options.failureThreshold) {
      this.set(this.state.mode, this.state.baseUrl, 0);
      if (this.reconnectPending) return;
      this.reconnectPending = true;
      setTimeout(() => {
        this.reconnectPending = false;
        void this.connect();
      }, 0);
      return;
    }
    this.set(this.state.mode, this.state.baseUrl, failures);
  }

  private async recheck(): Promise<void> {
    if (this.state.mode === 'local') return;
    if (this.state.mode === 'offline') {
      await this.connect();
      return;
    }
    const gen = ++this.generation;
    if (await this.isUp(this.urls.local, this.options.localTimeoutMs)) {
      if (gen !== this.generation) return;
      this.set('local', this.urls.local);
    }
  }

  private async isUp(url: string, timeoutMs: number): Promise<boolean> {
    try {
      const result = await this.deps.probe(url, timeoutMs);
      return result.ok;
    } catch {
      return false;
    }
  }

  private set(mode: ConnectionMode, baseUrl: string | null, consecutiveFailures = 0): ConnectionState {
    this.state = { mode, baseUrl, consecutiveFailures };
    for (const l of this.listeners) {
      try {
        l(this.state);
      } catch {
        // listener errors must not break the manager
      }
    }
    return this.state;
  }
}
