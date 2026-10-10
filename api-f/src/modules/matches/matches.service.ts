import { Inject, Injectable } from '@nestjs/common';
import { MATCH_DATA_PROVIDER } from '../../infrastructure/data-source.provider.js';
import type { MatchDataProvider, MatchDto } from '../../infrastructure/providers/match-data-provider.interface.js';

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCH_DATA_PROVIDER) private readonly provider: MatchDataProvider,
  ) {}

  async getTodayMatches(): Promise<MatchDto[]> {
    return this.provider.getTodayMatches();
  }
}