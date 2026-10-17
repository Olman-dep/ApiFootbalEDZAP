import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { MockProvider } from './mock/mock-data.js';
import { MongoMatchProvider } from './providers/mongo-match.provider.js';
import { Match, MatchSchema } from './database/schemas/match.schema.js';

export const MATCH_DATA_PROVIDER = 'MATCH_DATA_PROVIDER';

export const MatchDataProviderFactory: Provider = {
  provide: MATCH_DATA_PROVIDER,
  useFactory: (config: ConfigService, connection?: Connection) => {
    switch (config.get<string>('DATA_SOURCE') ?? 'mock') {
      case 'mongo': {
        if (!connection) {
          throw new Error(
            'DATA_SOURCE=mongo requiere definir MONGODB_URI en el .env',
          );
        }
        const matchModel =
          connection.models[Match.name] ??
          connection.model(Match.name, MatchSchema);
        return new MongoMatchProvider(matchModel as Model<Match>);
      }
      case 'mock':
        return new MockProvider();
      default:
        // api_football / scraping providers are not implemented yet; fall back
        // to mock so the credential-free path always works.
        return new MockProvider();
    }
  },
  inject: [ConfigService, { token: getConnectionToken(), optional: true }],
};