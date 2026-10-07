import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MatchesModule } from './modules/matches/matches.module.js';
import { PredictionsModule } from './modules/predictions/predictions.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MatchesModule, PredictionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}