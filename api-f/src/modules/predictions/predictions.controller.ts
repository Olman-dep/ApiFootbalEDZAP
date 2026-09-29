import { Controller, Get, Param } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get(':matchId')
  async getPrediction(@Param('matchId') matchId: string) {
    return this.predictionsService.getPredictionForMatch(matchId);
  }
}