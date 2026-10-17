import { TEAM_AVG_GOALS } from './mock-data.js';
import type { MatchDto } from '../providers/match-data-provider.interface.js';
import type {
  ExpectedGoalsResult,
  TeamStatsProvider,
} from '../providers/team-stats-provider.interface.js';

const DEFAULT_TEAM_GOALS = 1.2;

// Mantiene el comportamiento previo: cada equipo aporta su promedio fijo de
// goles (o 1.2 si no está en el mock). Si no conoce a ninguno, devuelve null.
export class MockTeamStatsProvider implements TeamStatsProvider {
  async getExpectedGoals(match: MatchDto): Promise<ExpectedGoalsResult | null> {
    const home = TEAM_AVG_GOALS[match.homeTeam];
    const away = TEAM_AVG_GOALS[match.awayTeam];

    if (home === undefined && away === undefined) return null;

    return {
      home: home ?? DEFAULT_TEAM_GOALS,
      away: away ?? DEFAULT_TEAM_GOALS,
    };
  }
}
