import { Inject, Injectable } from '@nestjs/common';
import { PoissonService } from '../../ml/poisson.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { TEAM_STATS_PROVIDER } from '../../infrastructure/team-stats.provider.js';
import { PREDICTION_STORE } from '../../infrastructure/prediction-store.provider.js';
import type { TeamStatsProvider } from '../../infrastructure/providers/team-stats-provider.interface.js';
import type { PredictionStore } from '../../infrastructure/providers/prediction-store.interface.js';

// Goles esperados por equipo cuando no hay estadísticas disponibles.
const DEFAULT_EXPECTED_GOALS = 1.2;

export const MODEL_NAME = 'poisson';
export const MODEL_VERSION = '1.0.0';

const GOALS_LINE = 2.5;

@Injectable()
export class PredictionsService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly poissonService: PoissonService,
    @Inject(TEAM_STATS_PROVIDER)
    private readonly teamStatsProvider: TeamStatsProvider,
    @Inject(PREDICTION_STORE)
    private readonly predictionStore: PredictionStore,
  ) {}

  // Calcula la predicción al vuelo, sin guardar nada.
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
      GOALS_LINE,
    );

    return { match, expectedGoals, probabilities, overUnder25 };
  }

  // Calcula la predicción y la guarda como la última versión del partido.
  async generatePredictionForMatch(matchId: string) {
    const result = await this.getPredictionForMatch(matchId);
    const { match, expectedGoals, probabilities, overUnder25 } = result;

    const saved = await this.predictionStore.saveLatest({
      matchId: match.id,
      modelName: MODEL_NAME,
      modelVersion: MODEL_VERSION,
      lambdas: { homeGoals: expectedGoals.home, awayGoals: expectedGoals.away },
      probabilities,
      totalGoals: {
        line: overUnder25.line,
        selection: overUnder25.over >= overUnder25.under ? 'over' : 'under',
        prob: Math.max(overUnder25.over, overUnder25.under),
        projectedTotal: expectedGoals.home + expectedGoals.away,
      },
      tags: [expectedGoals.source],
    });

    return { ...result, prediction: saved };
  }
}
