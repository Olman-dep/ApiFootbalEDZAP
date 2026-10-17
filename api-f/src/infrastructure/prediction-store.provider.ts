import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { InMemoryPredictionStore } from './mock/in-memory-prediction.store.js';
import { MongoPredictionStore } from './providers/mongo-prediction.store.js';
import { Match, MatchSchema } from './database/schemas/match.schema.js';
import {
  Prediction,
  PredictionSchema,
} from './database/schemas/prediction.schema.js';

export const PREDICTION_STORE = 'PREDICTION_STORE';

export const PredictionStoreFactory: Provider = {
  provide: PREDICTION_STORE,
  useFactory: (config: ConfigService, connection?: Connection) => {
    switch (config.get<string>('DATA_SOURCE') ?? 'mock') {
      case 'mongo': {
        if (!connection) {
          throw new Error(
            'DATA_SOURCE=mongo requiere definir MONGODB_URI en el .env',
          );
        }
        const predictionModel =
          connection.models[Prediction.name] ??
          connection.model(Prediction.name, PredictionSchema);
        const matchModel =
          connection.models[Match.name] ??
          connection.model(Match.name, MatchSchema);

        return new MongoPredictionStore(
          predictionModel as Model<Prediction>,
          matchModel as Model<Match>,
        );
      }
      default:
        return new InMemoryPredictionStore();
    }
  },
  inject: [ConfigService, { token: getConnectionToken(), optional: true }],
};
