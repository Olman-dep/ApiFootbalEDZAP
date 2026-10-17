import { NotFoundException } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { PoissonService } from '../../ml/poisson.service.js';
import { MockProvider } from '../../infrastructure/mock/mock-data.js';
import { MockTeamStatsProvider } from '../../infrastructure/mock/mock-team-stats.provider.js';
import { InMemoryPredictionStore } from '../../infrastructure/mock/in-memory-prediction.store.js';
import type { TeamStatsProvider } from '../../infrastructure/providers/team-stats-provider.interface.js';
import type {
  PredictionStore,
  PredictionToSave,
} from '../../infrastructure/providers/prediction-store.interface.js';

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
      new InMemoryPredictionStore(),
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
      new InMemoryPredictionStore(),
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
      new InMemoryPredictionStore(),
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
      new InMemoryPredictionStore(),
    );

    await expect(service.getPredictionForMatch('no-existe')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('generatePredictionForMatch', () => {
    it('guarda la predicción con lambdas, probabilidades y tags, y devuelve su id', async () => {
      const saveLatest = vi.fn(async (_prediction: PredictionToSave) => ({
        id: 'pred-1',
        modelVersion: '1.0.0',
        generatedAt: '2026-10-17T15:00:00.000Z',
      }));
      const store: PredictionStore = { saveLatest };
      const teamStats: TeamStatsProvider = {
        getExpectedGoals: async () => ({ home: 1.8, away: 0.7 }),
      };
      const service = new PredictionsService(
        buildMatchesService() as any,
        new PoissonService(),
        teamStats,
        store,
      );

      const result = await service.generatePredictionForMatch('1');

      expect(result.prediction.id).toBe('pred-1');
      expect(result.expectedGoals.source).toBe('team_stats');
      expect(saveLatest).toHaveBeenCalledTimes(1);
      const saved = saveLatest.mock.calls[0][0];
      expect(saved.matchId).toBe('1');
      expect(saved.lambdas).toEqual({ homeGoals: 1.8, awayGoals: 0.7 });
      expect(saved.probabilities).toEqual(result.probabilities);
      expect(saved.totalGoals.line).toBe(2.5);
      expect(saved.totalGoals.projectedTotal).toBeCloseTo(2.5, 10);
      expect(['over', 'under']).toContain(saved.totalGoals.selection);
      expect(saved.tags).toEqual(['team_stats']);
    });

    it('getPredictionForMatch no guarda nada', async () => {
      const saveLatest = vi.fn();
      const service = new PredictionsService(
        buildMatchesService() as any,
        new PoissonService(),
        new MockTeamStatsProvider(),
        { saveLatest } as unknown as PredictionStore,
      );

      await service.getPredictionForMatch('1');

      expect(saveLatest).not.toHaveBeenCalled();
    });

    it('no guarda si el partido no existe', async () => {
      const saveLatest = vi.fn();
      const service = new PredictionsService(
        buildMatchesService() as any,
        new PoissonService(),
        new MockTeamStatsProvider(),
        { saveLatest } as unknown as PredictionStore,
      );

      await expect(service.generatePredictionForMatch('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(saveLatest).not.toHaveBeenCalled();
    });
  });
});
