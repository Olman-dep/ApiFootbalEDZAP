import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockProvider } from './mock/mock-data.js';

export const MATCH_DATA_PROVIDER = 'MATCH_DATA_PROVIDER';

export const MatchDataProviderFactory: Provider = {
  provide: MATCH_DATA_PROVIDER,
  useFactory: (config: ConfigService) => {
    switch (config.get<string>('DATA_SOURCE') ?? 'mock') {
      case 'mock':
        return new MockProvider();
      default:
        // api_football / scraping providers are not implemented yet; fall back
        // to mock so the credential-free path always works.
        return new MockProvider();
    }
  },
  inject: [ConfigService],
};
