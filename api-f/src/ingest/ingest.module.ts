import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Competition, CompetitionSchema } from '../infrastructure/database/schemas/competition.schema.js';
import { IngestRun, IngestRunSchema } from '../infrastructure/database/schemas/ingest-run.schema.js';
import { Match, MatchSchema } from '../infrastructure/database/schemas/match.schema.js';
import { Team, TeamSchema } from '../infrastructure/database/schemas/team.schema.js';
import {
  TeamSeasonStats,
  TeamSeasonStatsSchema,
} from '../infrastructure/database/schemas/team-season-stats.schema.js';
import { ApiFootballClient } from './api-football.client.js';
import { IngestScheduler } from './ingest.scheduler.js';
import {
  API_FOOTBALL_CLIENT,
  INGEST_CONFIG,
  IngestService,
} from './ingest.service.js';
import type { IngestConfig } from './ingest.service.js';

// IDs de API-Football: 128 = Liga Profesional Argentina, 140 = La Liga.
const DEFAULT_LEAGUES = '128,140';

export function parseLeagues(value: string | undefined): number[] {
  return (value ?? DEFAULT_LEAGUES)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

@Module({})
export class IngestModule {
  // Sin MONGODB_URI no hay dónde guardar: el módulo queda vacío y la app corre con mock.
  static forRoot(uri: string | undefined = process.env.MONGODB_URI): DynamicModule {
    if (!uri) {
      return { module: IngestModule };
    }

    return {
      module: IngestModule,
      imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
          { name: Competition.name, schema: CompetitionSchema },
          { name: Team.name, schema: TeamSchema },
          { name: Match.name, schema: MatchSchema },
          { name: TeamSeasonStats.name, schema: TeamSeasonStatsSchema },
          { name: IngestRun.name, schema: IngestRunSchema },
        ]),
      ],
      providers: [
        IngestService,
        IngestScheduler,
        {
          provide: INGEST_CONFIG,
          useFactory: (config: ConfigService): IngestConfig => ({
            leagues: parseLeagues(config.get<string>('API_FOOTBALL_LEAGUES')),
            season: Number(config.get<string>('API_FOOTBALL_SEASON') ?? new Date().getFullYear()),
          }),
          inject: [ConfigService],
        },
        {
          provide: API_FOOTBALL_CLIENT,
          useFactory: (config: ConfigService) => {
            const key = config.get<string>('API_FOOTBALL_KEY');
            return key ? new ApiFootballClient(key) : null;
          },
          inject: [ConfigService],
        },
      ],
    };
  }
}
