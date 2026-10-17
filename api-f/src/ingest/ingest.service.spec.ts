import { Types } from 'mongoose';
import { IngestService } from './ingest.service.js';
import type { ApiFootballClient } from './api-football.client.js';
import { ApiFootballError } from './api-football.client.js';
import { FIXTURES, STANDINGS } from './api-football.fixtures.js';

// --- Modelo falso en memoria con lo mínimo que usa IngestService ---

type Doc = Record<string, any>;

function getPath(doc: Doc, path: string): unknown {
  return path.split('.').reduce<any>((value, key) => value?.[key], doc);
}

function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  let target = doc;
  for (const key of keys.slice(0, -1)) {
    target[key] ??= {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

class FakeModel {
  docs: Doc[] = [];

  private matches(doc: Doc, filter: Doc) {
    return Object.entries(filter).every(([key, expected]) => {
      const actual = getPath(doc, key);
      if (Array.isArray(actual)) return actual.some((v) => String(v) === String(expected));
      return String(actual) === String(expected);
    });
  }

  find(filter: Doc = {}) {
    const found = this.docs.filter((d) => this.matches(d, filter));
    return { lean: async () => found };
  }

  findOne(filter: Doc = {}) {
    const found = this.docs.find((d) => this.matches(d, filter)) ?? null;
    return { lean: async () => found };
  }

  async create(doc: Doc) {
    const created = { _id: new Types.ObjectId(), ...doc };
    this.docs.push(created);
    return created;
  }

  async updateOne(filter: Doc, update: Doc, options: { upsert?: boolean } = {}) {
    let target = this.docs.find((d) => this.matches(d, filter));

    if (!target && options.upsert) {
      target = { _id: new Types.ObjectId() };
      for (const [key, value] of Object.entries(filter)) setPath(target, key, value);
      this.docs.push(target);
    }
    if (!target) return;

    for (const [key, value] of Object.entries(update.$set ?? {})) setPath(target, key, value);
    for (const [key, value] of Object.entries(update.$addToSet ?? {})) {
      const list: unknown[] = (target[key] ??= []);
      if (!list.some((v) => String(v) === String(value))) list.push(value);
    }
  }

  async bulkWrite(operations: { updateOne: { filter: Doc; update: Doc; upsert?: boolean } }[]) {
    for (const { updateOne } of operations) {
      await this.updateOne(updateOne.filter, updateOne.update, { upsert: updateOne.upsert });
    }
  }
}

// --- Cliente falso ---

function fakeClient(overrides: Partial<Record<'getFixtures' | 'getStandings', unknown>> = {}) {
  let requests = 0;
  return {
    get requestCount() {
      return requests;
    },
    requestsRemainingToday: 90,
    getFixtures: async (..._args: [number, number]) => {
      requests++;
      return FIXTURES;
    },
    getStandings: async (..._args: [number, number]) => {
      requests++;
      return STANDINGS;
    },
    ...overrides,
  } as unknown as ApiFootballClient;
}

function setup(client: ApiFootballClient | null = fakeClient(), leagues = [128]) {
  const models = {
    competition: new FakeModel(),
    team: new FakeModel(),
    match: new FakeModel(),
    stats: new FakeModel(),
    run: new FakeModel(),
  };
  const service = new IngestService(
    models.competition as any,
    models.team as any,
    models.match as any,
    models.stats as any,
    models.run as any,
    { leagues, season: 2026 },
    client,
  );
  return { service, models };
}

describe('IngestService', () => {
  it('con una base vacía crea competición, equipos, partidos y estadísticas', async () => {
    const { service, models } = setup();

    const result = await service.runOnce('cron');

    expect(result?.status).toBe('success');
    expect(models.competition.docs).toHaveLength(1);
    expect(models.team.docs).toHaveLength(3);
    expect(models.match.docs).toHaveLength(3);
    expect(models.stats.docs).toHaveLength(3);

    const competition = models.competition.docs[0];
    expect(competition.name).toBe('Liga Profesional Argentina');
    expect(competition.externalIds.apiFootball).toBe(128);
    expect(competition.currentRound).toBe('Regular Season - 10');

    const match = models.match.docs.find((m) => m.externalIds.apiFootball === 9001)!;
    expect(match.status).toBe('finished');
    expect(match.score).toEqual({ home: 2, away: 0 });
    expect(match.homeTeam).toEqual({ name: 'River Plate', code: 'RIV' });
    expect(match.competitionName).toBe('Liga Profesional Argentina');
  });

  it('calcula los promedios de liga con todos los equipos y la fuerza de cada uno', async () => {
    const { service, models } = setup();
    await service.runOnce();

    const competition = models.competition.docs[0];
    // local: (12+8+7) goles en 18 partidos; visitante: (9+6+4) en 18
    expect(competition.avgHomeGoals).toBeCloseTo(27 / 18, 10);
    expect(competition.avgAwayGoals).toBeCloseTo(19 / 18, 10);

    const river = models.team.docs.find((t) => t.name === 'River Plate')!;
    const stats = models.stats.docs.find((s) => String(s.teamId) === String(river._id))!;
    expect(stats.rank).toBe(1);
    expect(stats.form).toEqual(['W', 'W', 'D', 'W', 'W']);
    expect(stats.home).toEqual({ played: 6, goalsFor: 12, goalsAgainst: 3 });
    expect(stats.strength.attack).toBeGreaterThan(1); // River marca más que el promedio
    expect(stats.strength.defense).toBeLessThan(1); // y recibe menos
  });

  it('registra la corrida en ingest_runs con peticiones y resultado por liga', async () => {
    const { service, models } = setup();
    await service.runOnce('startup');

    expect(models.run.docs).toHaveLength(1);
    const run = models.run.docs[0];
    expect(run.status).toBe('success');
    expect(run.trigger).toBe('startup');
    expect(run.requests).toBe(2); // fixtures + standings
    expect(run.requestsRemainingToday).toBe(90);
    expect(run.finishedAt).toBeInstanceOf(Date);
    expect(run.errorMessages).toEqual([]);
    expect(run.leagues).toEqual([
      { leagueId: 128, season: 2026, fixtures: 3, teams: 3, stats: 3 },
    ]);
  });

  it('fusiona por nombre con los datos del seed en vez de duplicarlos', async () => {
    const { service, models } = setup();

    const competitionId = new Types.ObjectId();
    models.competition.docs.push({
      _id: competitionId,
      name: 'Liga Profesional Argentina',
      season: 2026,
      externalIds: { seed: 'liga-argentina' },
    });
    const riverId = new Types.ObjectId();
    models.team.docs.push({
      _id: riverId,
      name: 'River Plate',
      code: 'RIV',
      externalIds: { seed: 'river' },
      competitionIds: [competitionId],
    });
    const seedMatch = {
      _id: new Types.ObjectId(),
      externalIds: { seed: 'm1' },
      pickSummary: { pick: 'HOME', hasValue: true },
    };
    models.match.docs.push(seedMatch);

    await service.runOnce();

    expect(models.competition.docs).toHaveLength(1);
    expect(models.competition.docs[0].externalIds).toEqual({ seed: 'liga-argentina', apiFootball: 128 });
    expect(models.team.docs).toHaveLength(3); // River no se duplicó
    const river = models.team.docs.find((t) => t.name === 'River Plate')!;
    expect(String(river._id)).toBe(String(riverId));
    expect(river.code).toBe('RIV');
    expect(river.externalIds).toEqual({ seed: 'river', apiFootball: 435 });
    expect(models.match.docs).toHaveLength(4); // 3 reales + el del seed intacto
    expect(models.match.docs[0].pickSummary).toEqual({ pick: 'HOME', hasValue: true });
  });

  it('es idempotente y no pisa el pickSummary de los partidos ya ingestados', async () => {
    const { service, models } = setup();
    await service.runOnce();

    const match = models.match.docs.find((m) => m.externalIds.apiFootball === 9002)!;
    match.pickSummary = { pick: 'HOME', hasValue: true, predictionId: 'p1' };

    await service.runOnce();

    expect(models.competition.docs).toHaveLength(1);
    expect(models.team.docs).toHaveLength(3);
    expect(models.match.docs).toHaveLength(3);
    expect(models.stats.docs).toHaveLength(3);
    expect(models.run.docs).toHaveLength(2);
    expect(match.pickSummary).toEqual({ pick: 'HOME', hasValue: true, predictionId: 'p1' });
  });

  it('actualiza el marcador y el estado cuando un partido ya se jugó', async () => {
    const { service, models } = setup();
    await service.runOnce();

    const updated = structuredClone(FIXTURES);
    updated[1].fixture.status = { short: 'FT' };
    updated[1].goals = { home: 3, away: 1 };
    (service as any).client.getFixtures = async () => updated;

    await service.runOnce();

    const match = models.match.docs.find((m) => m.externalIds.apiFootball === 9002)!;
    expect(match.status).toBe('finished');
    expect(match.score).toEqual({ home: 3, away: 1 });
  });

  it('si una liga falla sigue con las demás y la corrida queda partial', async () => {
    const client = fakeClient({
      getFixtures: async (leagueId: number) => {
        if (leagueId === 999) {
          throw new ApiFootballError('/fixtures -> plan: Free plans do not have access to this season');
        }
        return FIXTURES;
      },
    });
    const { service, models } = setup(client, [999, 128]);

    const result = await service.runOnce();

    expect(result?.status).toBe('partial');
    expect(result?.errors[0]).toContain('liga 999');
    expect(result?.errors[0]).toContain('Free plans do not have access');
    expect(models.match.docs).toHaveLength(3); // la liga 128 sí se ingestó
    expect(models.run.docs[0].status).toBe('partial');
  });

  it('si todas las ligas fallan la corrida queda failed', async () => {
    const client = fakeClient({
      getFixtures: async () => {
        throw new ApiFootballError('HTTP 500');
      },
    });
    const { service } = setup(client, [128, 140]);

    expect((await service.runOnce())?.status).toBe('failed');
  });

  it('una temporada sin partidos se informa como error de esa liga', async () => {
    const { service } = setup(fakeClient({ getFixtures: async () => [] }));

    const result = await service.runOnce();

    expect(result?.status).toBe('failed');
    expect(result?.errors[0]).toContain('no devolvió partidos');
  });

  it('sin API key no hace nada ni escribe en la base', async () => {
    const { service, models } = setup(null);

    expect(await service.runOnce()).toBeNull();
    expect(models.run.docs).toHaveLength(0);
  });

  it('no permite dos corridas simultáneas', async () => {
    const { service, models } = setup();

    const [first, second] = await Promise.all([service.runOnce(), service.runOnce()]);

    expect([first, second].filter((r) => r === null)).toHaveLength(1);
    expect(models.run.docs).toHaveLength(1);
  });
});
