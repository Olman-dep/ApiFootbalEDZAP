import type { ApiFixture, ApiStandingsResponse } from './api-football.mappers.js';

export class ApiFootballError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiFootballError';
  }
}

interface Envelope<T> {
  errors?: unknown;
  results?: number;
  response?: T[];
}

// La API devuelve `errors` como [] cuando no hay problemas y como objeto
// ({ plan: '...' }, { requests: '...' }) cuando los hay, siempre con HTTP 200.
export function extractApiErrors(errors: unknown): string[] {
  if (!errors) return [];
  const text = (value: unknown) =>
    typeof value === 'string' ? value : JSON.stringify(value);

  if (Array.isArray(errors)) return errors.map(text);
  if (typeof errors === 'object') {
    return Object.entries(errors as Record<string, unknown>).map(
      ([key, value]) => `${key}: ${text(value)}`,
    );
  }
  return [text(errors)];
}

export class ApiFootballClient {
  private requests = 0;
  private remainingToday: number | undefined;

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = 'https://v3.football.api-sports.io',
  ) {}

  /** Peticiones hechas por este cliente desde que se creó. */
  get requestCount(): number {
    return this.requests;
  }

  /** Peticiones que quedaban hoy según la última respuesta, si la API lo informó. */
  get requestsRemainingToday(): number | undefined {
    return this.remainingToday;
  }

  getFixtures(leagueId: number, season: number): Promise<ApiFixture[]> {
    return this.get<ApiFixture>('/fixtures', { league: leagueId, season });
  }

  getStandings(leagueId: number, season: number): Promise<ApiStandingsResponse[]> {
    return this.get<ApiStandingsResponse>('/standings', { league: leagueId, season });
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T[]> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    this.requests++;
    const res = await this.fetchFn(url, {
      headers: { 'x-apisports-key': this.apiKey },
    });

    const remaining = Number(res.headers.get('x-ratelimit-requests-remaining'));
    if (res.headers.get('x-ratelimit-requests-remaining') !== null && !Number.isNaN(remaining)) {
      this.remainingToday = remaining;
    }

    if (!res.ok) {
      throw new ApiFootballError(`HTTP ${res.status} en ${path}`);
    }

    const body = (await res.json()) as Envelope<T>;
    const errors = extractApiErrors(body.errors);
    if (errors.length > 0) {
      throw new ApiFootballError(`${path} -> ${errors.join('; ')}`);
    }

    return body.response ?? [];
  }
}
