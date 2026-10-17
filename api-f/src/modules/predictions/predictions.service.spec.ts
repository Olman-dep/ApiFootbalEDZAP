import { NotFoundException } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { PoissonService } from '../../ml/poisson.service.js';
import { MockProvider } from '../../infrastructure/mock/mock-data.js';
import { MockTeamStatsProvider } from '../../infrastructure/mock/mock-team-stats.provider.js';
import type { TeamStatsProvider } from '../../infrastructure/providers/team-stats-provider.interface.js';

function buildMatchesService() {
  const provider = new MockProvider();
  return {
    getMatchById: async (id: string) => {
      const match = await provider.getMatchById(id);
      if (!match) throw new NotFoundException('Match not found');
      return match;
    },
  };
}

describe('PredictionsService', () => {
  it('getPredictionForMatch("1") returns probabilities summing to ~1 and overUnder25 with numbers', async () => {
    const service = new PredictionsService(
      buildMatchesService() as any,
      new PoissonService(),
      new MockTeamStatsProvider(),
    );
    const result = await service.getPredictionForMatch('1');

    expect(result).toBeDefined();
    expect(result.probabilities).toBeDefined();
    expect(result.probabilities.homeWin).toBeTypeOf('number');
    expect(result.probabilities.draw).toBeTypeOf('number');
    expect(result.probabilities.awayWin).toBeTypeOf('number');
    const sum =
      result.probabilities.homeWin +
      result.probabilities.draw +
      result.probabilities.awayWin;
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
    expect(result.overUnder25).toBeDefined();
    expect(result.overUnder25.over).toBeTypeOf('number');
    expect(result.overUnder25.under).toBeTypeOf('number');
  });

  it('usa los goles esperados del provider y lo indica en expectedGoals', async () => {
    const teamStats: TeamStatsProvider = {
      getExpectedGoals: async () => ({ home: 1.8, away: 0.7 }),
    };
    const service = new PredictionsService(
      buildMatchesService() as any,
      new PoissonService(),
      teamStats,
    );
    const result = await service.getPredictionForMatch('1');

    expect(result.expectedGoals).toEqual({
      home: 1.8,
      away: 0.7,
      source: 'team_stats',
    });
    expect(result.probabilities.homeWin).toBeGreaterThan(
      result.probabilities.awayWin,
    );
  });

  it('cae a 1.2 / 1.2 con source "default" si el provider no tiene datos', async () => {
    const teamStats: TeamStatsProvider = {
      getExpectedGoals: async () => null,
    };
    const service = new PredictionsService(
      buildMatchesService() as any,
      new PoissonService(),
      teamStats,
    );
    const result = await service.getPredictionForMatch('1');

    expect(result.expectedGoals).toEqual({
      home: 1.2,
      away: 1.2,
      source: 'default',
    });
  });

  it('propaga NotFoundException si el partido no existe', async () => {
    const service = new PredictionsService(
      buildMatchesService() as any,
      new PoissonService(),
      new MockTeamStatsProvider(),
    );

    await expect(service.getPredictionForMatch('no-existe')).rejects.toThrow(
      NotFoundException,
    );
  });
});
