import { PoissonService } from './poisson.service.js';

describe('PoissonService', () => {
  const service = new PoissonService();

  it('las probabilidades 1X2 suman exactamente 1, incluso con lambdas altos', () => {
    for (const [home, away] of [[1.2, 1.2], [2.1, 1.9], [3.5, 3.2]]) {
      const p = service.calculateMatchProbabilities(home, away);
      expect(p.homeWin + p.draw + p.awayWin).toBeCloseTo(1, 10);
    }
  });

  it('el local con más goles esperados tiene mayor probabilidad de ganar', () => {
    const p = service.calculateMatchProbabilities(1.8, 0.7);
    expect(p.homeWin).toBeGreaterThan(p.awayWin);
  });
});
