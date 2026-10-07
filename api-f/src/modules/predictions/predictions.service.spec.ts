import { PredictionsService } from './predictions.service.js';
import { PoissonService } from '../../ml/poisson.service.js';
import { MockProvider } from '../../infrastructure/mock/mock-data.js';

describe('PredictionsService regression', () => {
  it('getPredictionForMatch("1") returns probabilities summing to ~1 and overUnder25 with numbers', async () => {
    const matchesService = {
      getTodayMatches: () => new MockProvider().getTodayMatches(),
    };
    const service = new PredictionsService(matchesService as any, new PoissonService());
    const result = await service.getPredictionForMatch('1');

    expect(result).toBeDefined();
    expect(result.probabilities).toBeDefined();
    expect(result.probabilities.homeWin).toBeTypeOf('number');
    expect(result.probabilities.draw).toBeTypeOf('number');
    expect(result.probabilities.awayWin).toBeTypeOf('number');
    const sum = result.probabilities.homeWin + result.probabilities.draw + result.probabilities.awayWin;
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
    expect(result.overUnder25).toBeDefined();
    expect(result.overUnder25.over).toBeTypeOf('number');
    expect(result.overUnder25.under).toBeTypeOf('number');
  });
});
