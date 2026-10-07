import { ConfigService } from '@nestjs/config';
import { MatchDataProviderFactory } from './data-source.provider.js';
import { MockProvider } from './mock/mock-data.js';

function makeFactory() {
  const provider = MatchDataProviderFactory as {
    useFactory: (config: ConfigService) => unknown;
  };
  return provider.useFactory;
}

describe('MatchDataProviderFactory', () => {
  it('returns a MockProvider when DATA_SOURCE is not set', () => {
    const config = { get: () => undefined } as unknown as ConfigService;

    const result = makeFactory()(config);

    expect(result).toBeInstanceOf(MockProvider);
  });

  it('returns a MockProvider when DATA_SOURCE is "mock"', () => {
    const config = {
      get: (key: string) => (key === 'DATA_SOURCE' ? 'mock' : undefined),
    } as unknown as ConfigService;

    const result = makeFactory()(config);

    expect(result).toBeInstanceOf(MockProvider);
  });
});
