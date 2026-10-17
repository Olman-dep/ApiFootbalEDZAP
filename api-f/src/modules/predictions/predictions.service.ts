import { Inject, Injectable } from '@nestjs/common';
import { PoissonService } from '../../ml/poisson.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { TEAM_STATS_PROVIDER } from '../../infrastructure/team-stats.provider.js';
import type { TeamStatsProvider } from '../../infrastructure/providers/team-stats-provider.interface.js';

// Goles esperados por equipo cuando no hay estadísticas disponibles.
const DEFAULT_EXPECTED_GOALS = 1.2;

@Injectable()
export class PredictionsService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly poissonService: PoissonService,
    @Inject(TEAM_STATS_PROVIDER)
    private readonly teamStatsProvider: TeamStatsProvider,
  ) {}

  async getPredictionForMatch(matchId: string) {
    // Lanza NotFoundException si el partido no existe.
    const match = await this.matchesService.getMatchById(matchId);

    const fromStats = await this.teamStatsProvider.getExpectedGoals(match);
    const expectedGoals = {
      home: fromStats?.home ?? DEFAULT_EXPECTED_GOALS,
      away: fromStats?.away ?? DEFAULT_EXPECTED_GOALS,
      source: fromStats ? ('team_stats' as const) : ('default' as const),
    };

    const probabilities = this.poissonService.calculateMatchProbabilities(
      expectedGoals.home,
      expectedGoals.away,
    );

    const overUnder25 = this.poissonService.calculateOverUnder(
      expectedGoals.home,
      expectedGoals.away,
      2.5,
    );

    return { match, expectedGoals, probabilities, overUnder25 };
  }
}
