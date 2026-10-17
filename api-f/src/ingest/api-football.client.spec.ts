import { ApiFootballClient, ApiFootballError, extractApiErrors } from './api-football.client.js';
import { FIXTURES } from './api-football.fixtures.js';

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

describe('extractApiErrors', () => {
  it('[] y objeto vacío no son errores', () => {
    expect(extractApiErrors([])).toEqual([]);
    expect(extractApiErrors({})).toEqual([]);
    expect(extractApiErrors(undefined)).toEqual([]);
  });

  it('convierte el objeto de errores en mensajes legibles', () => {
    expect(extractApiErrors({ plan: 'Free plans do not have access to this season' })).toEqual([
      'plan: Free plans do not have access to this season',
    ]);
  });
});

describe('ApiFootballClient', () => {
  it('pide fixtures con la key, liga y temporada, y cuenta la petición', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { errors: [], results: 3, response: FIXTURES },
        { headers: { 'x-ratelimit-requests-remaining': '97' } },
      ),
    );
    const client = new ApiFootballClient('mi-key', fetchFn as unknown as typeof fetch);

    const fixtures = await client.getFixtures(128, 2026);

    expect(fixtures).toHaveLength(3);
    expect(client.requestCount).toBe(1);
    expect(client.requestsRemainingToday).toBe(97);

    const [url, options] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://v3.football.api-sports.io/fixtures');
    expect(url.searchParams.get('league')).toBe('128');
    expect(url.searchParams.get('season')).toBe('2026');
    expect((options.headers as Record<string, string>)['x-apisports-key']).toBe('mi-key');
  });

  it('lanza ApiFootballError si la API responde 200 con errors (p. ej. plan sin acceso)', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ errors: { plan: 'Free plans do not have access to this season' }, response: [] }),
    );
    const client = new ApiFootballClient('k', fetchFn as unknown as typeof fetch);

    const error = await client.getFixtures(128, 2026).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiFootballError);
    expect((error as Error).message).toContain('Free plans do not have access');
  });

  it('lanza ApiFootballError con HTTP no exitoso', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, { status: 500 }));
    const client = new ApiFootballClient('k', fetchFn as unknown as typeof fetch);

    await expect(client.getStandings(128, 2026)).rejects.toThrow(/HTTP 500/);
  });
});
