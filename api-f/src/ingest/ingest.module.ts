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
import { FootballDataClient } from './football-data.client.js';
import { IngestScheduler } from './ingest.scheduler.js';
import {
  FOOTBALL_DATA_CLIENT,
  INGEST_CONFIG,
  IngestService,
} from './ingest.service.js';
import type { IngestConfig } from './ingest.service.js';

// Códigos de football-data.org (plan gratis): PD = La Liga, PL = Premier League,
// BL1 = Bundesliga, SA = Serie A, FL1 = Ligue 1, DED = Eredivisie, PPL = Primeira Liga,
// ELC = Championship, BSA = Brasileirão, CL = Champions League.
const DEFAULT_COMPETITIONS = 'PD';

export function parseCompetitions(value: string | undefined): string[] {
  const codes = (value || DEFAULT_COMPETITIONS)
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z0-9]{2,4}$/.test(code));
  return [...new Set(codes)];
}

/** Vacío o inválido = temporada actual de la API. */
export function parseSeason(value: string | undefined): number | undefined {
  const season = Number(value);
  return Number.isInteger(season) && season >= 2000 ? season : undefined;
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
            competitions: parseCompetitions(config.get<string>('FOOTBALL_DATA_COMPETITIONS')),
            season: parseSeason(config.get<string>('FOOTBALL_DATA_SEASON')),
          }),
          inject: [ConfigService],
        },
        {
          provide: FOOTBALL_DATA_CLIENT,
          useFactory: (config: ConfigService) => {
            const key = config.get<string>('FOOTBALL_DATA_API_KEY');
            return key ? new FootballDataClient(key) : null;
          },
          inject: [ConfigService],
        },
      ],
    };
  }
}
