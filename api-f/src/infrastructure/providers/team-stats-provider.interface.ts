import type { MatchDto } from './match-data-provider.interface.js';

export interface ExpectedGoalsResult {
  home: number;
  away: number;
}

export interface TeamStatsProvider {
  /**
   * Goles esperados (lambdas) de local y visitante para el partido, o `null`
   * si no hay estadísticas suficientes para calcularlos.
   */
  getExpectedGoals(match: MatchDto): Promise<ExpectedGoalsResult | null>;
}
