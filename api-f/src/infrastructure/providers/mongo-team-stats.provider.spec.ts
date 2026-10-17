import { Types } from 'mongoose';
import { MongoTeamStatsProvider } from './mongo-team-stats.provider.js';
import type { MatchDto } from './match-data-provider.interface.js';

// Modelo falso: find() y findById() devuelven un objeto con lean().
function fakeModel(docs: any[]) {
  return {
    find: () => ({ lean: async () => docs }),
    findById: () => ({ lean: async () => docs[0] ?? null }),
  } as any;
}

describe('MongoTeamStatsProvider', () => {
  const competitionId = new Types.ObjectId();
  const riverId = new Types.ObjectId();
  const bocaId = new Types.ObjectId();

  const match = {
    id: new Types.ObjectId().toString(),
    homeTeam: 'River Plate',
    awayTeam: 'Boca Juniors',
    competitionId: competitionId.toString(),
    season: 2026,
  } as MatchDto;

  const teams = [
    { _id: riverId, name: 'River Plate' },
    { _id: bocaId, name: 'Boca Juniors' },
  ];
  const stats = [
    { teamId: riverId, strength: { attack: 1.4, defense: 0.8 } },
    { teamId: bocaId, strength: { attack: 0.9, defense: 1.2 } },
  ];
  const competition = [{ _id: competitionId, avgHomeGoals: 1.3, avgAwayGoals: 0.95 }];

  it('calcula los lambdas con strength y los promedios de la liga', async () => {
    const provider = new MongoTeamStatsProvider(
      fakeModel(teams),
      fakeModel(stats),
      fakeModel(competition),
    );
    const result = await provider.getExpectedGoals(match);

    expect(result).not.toBeNull();
    expect(result!.home).toBeCloseTo(1.4 * 1.2 * 1.3, 10);
    expect(result!.away).toBeCloseTo(0.9 * 0.8 * 0.95, 10);
  });

  it('devuelve null si el competitionId no es un ObjectId válido', async () => {
    const provider = new MongoTeamStatsProvider(
      fakeModel(teams),
      fakeModel(stats),
      fakeModel(competition),
    );

    expect(
      await provider.getExpectedGoals({ ...match, competitionId: 'liga-argentina' }),
    ).toBeNull();
  });

  it('devuelve null si falta un equipo', async () => {
    const provider = new MongoTeamStatsProvider(
      fakeModel([teams[0]]),
      fakeModel(stats),
      fakeModel(competition),
    );

    expect(await provider.getExpectedGoals(match)).toBeNull();
  });

  it('devuelve null si falta la estadística de un equipo', async () => {
    const provider = new MongoTeamStatsProvider(
      fakeModel(teams),
      fakeModel([stats[0]]),
      fakeModel(competition),
    );

    expect(await provider.getExpectedGoals(match)).toBeNull();
  });

  it('devuelve null si no existe la competición', async () => {
    const provider = new MongoTeamStatsProvider(
      fakeModel(teams),
      fakeModel(stats),
      fakeModel([]),
    );

    expect(await provider.getExpectedGoals(match)).toBeNull();
  });
});
