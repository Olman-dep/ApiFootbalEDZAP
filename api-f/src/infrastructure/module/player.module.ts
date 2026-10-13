import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PlayersController } from '../controllers/player.controller.js';
import { PlayersService } from '../../application/player.service.js';

import { Player, PlayerSchema } from '../database/schemas/player.schema.js';
import { Match, MatchSchema } from '../database/schemas/match.schema.js';
import { Prediction, PredictionSchema } from '../database/schemas/prediction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Prediction.name, schema: PredictionSchema },
    ]),
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService], // lo consumirá PredictionEngineService
})
export class PlayersModule {}