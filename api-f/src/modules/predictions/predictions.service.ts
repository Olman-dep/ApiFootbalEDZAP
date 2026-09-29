import { Injectable, NotFoundException } from '@nestjs/common';
import { PoissonService } from '../../ml/poisson.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { TEAM_AVG_GOALS } from '../../infrastructure/mock/mock-data.js';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly poissonService: PoissonService,
  ) {}

  async getPredictionForMatch(matchId: string) {
    const matches = await this.matchesService.getTodayMatches();
    const match = matches.find((m) => m.id === matchId);

    if (!match) {
      throw new NotFoundException(`No se encontró el partido ${matchId}`);
    }

    const homeAvgGoals = TEAM_AVG_GOALS[match.homeTeam] ?? 1.2;
    const awayAvgGoals = TEAM_AVG_GOALS[match.awayTeam] ?? 1.2;

    const probabilities = this.poissonService.calculateMatchProbabilities(
      homeAvgGoals,
      awayAvgGoals,
    );

    return { match, probabilities };
  }
}