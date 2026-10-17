import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { MockTeamStatsProvider } from './mock/mock-team-stats.provider.js';
import { MongoTeamStatsProvider } from './providers/mongo-team-stats.provider.js';
import { Team, TeamSchema } from './database/schemas/team.schema.js';
import {
  TeamSeasonStats,
  TeamSeasonStatsSchema,
} from './database/schemas/team-season-stats.schema.js';
import {
  Competition,
  CompetitionSchema,
} from './database/schemas/competition.schema.js';

export const TEAM_STATS_PROVIDER = 'TEAM_STATS_PROVIDER';

export const TeamStatsProviderFactory: Provider = {
  provide: TEAM_STATS_PROVIDER,
  useFactory: (config: ConfigService, connection?: Connection) => {
    switch (config.get<string>('DATA_SOURCE') ?? 'mock') {
      case 'mongo': {
        if (!connection) {
          throw new Error(
            'DATA_SOURCE=mongo requiere definir MONGODB_URI en el .env',
          );
        }
        const teamModel =
          connection.models[Team.name] ?? connection.model(Team.name, TeamSchema);
        const statsModel =
          connection.models[TeamSeasonStats.name] ??
          connection.model(TeamSeasonStats.name, TeamSeasonStatsSchema);
        const competitionModel =
          connection.models[Competition.name] ??
          connection.model(Competition.name, CompetitionSchema);

        return new MongoTeamStatsProvider(
          teamModel as Model<Team>,
          statsModel as Model<TeamSeasonStats>,
          competitionModel as Model<Competition>,
        );
      }
      default:
        return new MockTeamStatsProvider();
    }
  },
  inject: [ConfigService, { token: getConnectionToken(), optional: true }],
};
