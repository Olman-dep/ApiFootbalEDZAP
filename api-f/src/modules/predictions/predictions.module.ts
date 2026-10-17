import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller.js';
import { PredictionsService } from './predictions.service.js';
import { PoissonService } from '../../ml/poisson.service.js';
import { MatchesModule } from '../matches/matches.module.js';
import { TeamStatsProviderFactory } from '../../infrastructure/team-stats.provider.js';

@Module({
  imports: [MatchesModule],
  controllers: [PredictionsController],
  providers: [PredictionsService, PoissonService, TeamStatsProviderFactory],
})
export class PredictionsModule {}
