import type { FdMatchesResponse, FdStandingsResponse } from './football-data.mappers.js';

export class FootballDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FootballDataError';
  }
}

const DEFAULT_BASE_URL = 'https://api.football-data.org/v4';
// El plan gratis permite 10 peticiones por minuto; si se excede, la API responde 429.
const MAX_WAIT_SECONDS = 65;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class FootballDataClient {
  private requests = 0;
  private availableMinute: number | undefined;

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = DEFAULT_BASE_URL,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
  ) {}

  /** Peticiones hechas por este cliente desde que se creó (incluye reintentos por 429). */
  get requestCount(): number {
    return this.requests;
  }

  /** Peticiones que quedaban en el minuto actual según la última respuesta, si la API lo informó. */
  get requestsAvailableMinute(): number | undefined {
    return this.availableMinute;
  }

  /** Partidos de una competición (código como "PD"). Sin `season` la API usa la temporada actual. */
  getMatches(competition: string, season?: number): Promise<FdMatchesResponse> {
    return this.get<FdMatchesResponse>(`/competitions/${competition}/matches`, season);
  }

  getStandings(competition: string, season?: number): Promise<FdStandingsResponse> {
    return this.get<FdStandingsResponse>(`/competitions/${competition}/standings`, season);
  }

  private async get<T>(path: string, season?: number, retried = false): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (season) url.searchParams.set('season', String(season));

    this.requests++;
    const res = await this.fetchFn(url, { headers: { 'X-Auth-Token': this.apiKey } });

    const available = res.headers.get('x-requests-available-minute');
    if (available !== null && !Number.isNaN(Number(available))) {
      this.availableMinute = Number(available);
    }

    if (res.status === 429 && !retried) {
      const reset = Number(res.headers.get('x-requestcounter-reset'));
      const seconds = Math.min(Number.isFinite(reset) && reset > 0 ? reset : 60, MAX_WAIT_SECONDS);
      await this.sleep(seconds * 1000);
      return this.get<T>(path, season, true);
    }

    if (!res.ok) {
      throw new FootballDataError(`HTTP ${res.status} en ${path}${await this.errorDetail(res)}`);
    }

    return (await res.json()) as T;
  }

  // La API explica el motivo en el cuerpo: { "message": "...", "errorCode": 403 }.
  private async errorDetail(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { message?: unknown };
      return typeof body.message === 'string' && body.message ? `: ${body.message}` : '';
    } catch {
      return '';
    }
  }
}
