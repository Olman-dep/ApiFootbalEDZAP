import { FootballDataClient, FootballDataError } from './football-data.client.js';
import { MATCHES, STANDINGS } from './football-data.fixtures.js';

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

describe('FootballDataClient', () => {
  it('pide partidos con el token, competición y temporada, y cuenta la petición', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(MATCHES, { headers: { 'x-requests-available-minute': '8' } }),
    );
    const client = new FootballDataClient('mi-token', fetchFn as unknown as typeof fetch);

    const response = await client.getMatches('PD', 2026);

    expect(response.matches).toHaveLength(3);
    expect(client.requestCount).toBe(1);
    expect(client.requestsAvailableMinute).toBe(8);

    const [url, options] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://api.football-data.org/v4/competitions/PD/matches');
    expect(url.searchParams.get('season')).toBe('2026');
    expect((options.headers as Record<string, string>)['X-Auth-Token']).toBe('mi-token');
  });

  it('sin temporada no manda el parámetro season (la API usa la actual)', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(STANDINGS));
    const client = new FootballDataClient('k', fetchFn as unknown as typeof fetch);

    await client.getStandings('PL');

    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.pathname).toBe('/v4/competitions/PL/standings');
    expect(url.searchParams.has('season')).toBe(false);
  });

  it('incluye el mensaje de la API cuando la competición no está en el plan (403)', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { message: 'The resource you are looking for is restricted to the plan TIER_TWO.', errorCode: 403 },
        { status: 403 },
      ),
    );
    const client = new FootballDataClient('k', fetchFn as unknown as typeof fetch);

    const error = await client.getMatches('ASL').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FootballDataError);
    expect((error as Error).message).toContain('HTTP 403');
    expect((error as Error).message).toContain('restricted to the plan');
  });

  it('con un cuerpo de error ilegible igual lanza FootballDataError', async () => {
    const fetchFn = vi.fn(async () => new Response('no es json', { status: 500 }));
    const client = new FootballDataClient('k', fetchFn as unknown as typeof fetch);

    await expect(client.getStandings('PD')).rejects.toThrow(/HTTP 500/);
  });

  it('ante un 429 espera lo que indica la API y reintenta una vez', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ message: 'rate limit' }, { status: 429, headers: { 'x-requestcounter-reset': '12' } }),
      )
      .mockResolvedValueOnce(jsonResponse(MATCHES));
    const sleep = vi.fn(async () => {});
    const client = new FootballDataClient(
      'k',
      fetchFn as unknown as typeof fetch,
      'https://api.football-data.org/v4',
      sleep,
    );

    const response = await client.getMatches('PD');

    expect(response.matches).toHaveLength(3);
    expect(sleep).toHaveBeenCalledWith(12_000);
    expect(client.requestCount).toBe(2); // el reintento también cuenta
  });

  it('si el 429 se repite después del reintento, falla', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: 'rate limit' }, { status: 429 }));
    const sleep = vi.fn(async () => {});
    const client = new FootballDataClient(
      'k',
      fetchFn as unknown as typeof fetch,
      'https://api.football-data.org/v4',
      sleep,
    );

    await expect(client.getMatches('PD')).rejects.toThrow(/HTTP 429/);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(60_000); // sin header, espera un minuto
  });
});
