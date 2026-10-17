import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MatchesModule } from './modules/matches/matches.module.js';
import { PredictionsModule } from './modules/predictions/predictions.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { IngestModule } from './ingest/ingest.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRoot(),
    IngestModule.forRoot(),
    TerminusModule,
    MatchesModule,
    PredictionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}