import { Controller, Get, Param, Post } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  // Calcula al vuelo, no guarda nada.
  @Get(':matchId')
  async getPrediction(@Param('matchId') matchId: string) {
    return this.predictionsService.getPredictionForMatch(matchId);
  }

  // Calcula y guarda una nueva versión de la predicción del partido.
  @Post(':matchId')
  async generatePrediction(@Param('matchId') matchId: string) {
    return this.predictionsService.generatePredictionForMatch(matchId);
  }
}
