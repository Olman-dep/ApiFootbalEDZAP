import { Provider } from '@nestjs/common';
import { MockProvider } from './mock/mock-data.js';

export const MATCH_DATA_PROVIDER = 'MATCH_DATA_PROVIDER';

export const MatchDataProviderFactory: Provider = {
  provide: MATCH_DATA_PROVIDER,
  useFactory: () => {
    return new MockProvider();
  },
};