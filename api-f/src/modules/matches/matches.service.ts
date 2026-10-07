import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MATCH_DATA_PROVIDER } from '../../infrastructure/data-source.provider.js';
import type { MatchDataProvider, MatchDto } from '../../infrastructure/providers/match-data-provider.interface.js';

export interface GetMatchesQuery {
  competitionId?: string;
  month?: string;
  filter?: 'all' | 'upcoming' | 'high_edge';
}

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCH_DATA_PROVIDER) private readonly provider: MatchDataProvider,
  ) {}

  async getTodayMatches(): Promise<MatchDto[]> {
    return this.provider.getTodayMatches();
  }

  async getMatches(query: GetMatchesQuery = {}): Promise<MatchDto[]> {
    const { competitionId, month, filter = 'all' } = query;

    if (filter && !['all', 'upcoming', 'high_edge'].includes(filter)) {
      throw new BadRequestException('Invalid filter value');
    }

    if (month !== undefined && month !== null) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new BadRequestException('Invalid month format. Expected YYYY-MM');
      }
      const [, monthStr] = month.split('-');
      const monthNum = parseInt(monthStr, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new BadRequestException('Invalid month format. Expected YYYY-MM');
      }
    }

    let matches = await this.provider.getMatches();

    if (competitionId) {
      matches = matches.filter((m) => m.competitionId === competitionId);
    }

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      matches = matches.filter((m) => {
        const d = new Date(m.kickoff);
        return d.getFullYear() === year && d.getMonth() + 1 === monthNum;
      });
    }

    const now = Date.now();
    if (filter === 'upcoming') {
      matches = matches.filter((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now);
    } else if (filter === 'high_edge') {
      matches = matches.filter((m) => m.pickSummary.hasValue === true);
    }

    return matches;
  }

  async getUpcomingMatches(): Promise<MatchDto[]> {
    const matches = await this.provider.getUpcomingMatches();
    return matches;
  }

  async getMatchById(id: string): Promise<MatchDto> {
    const match = await this.provider.getMatchById(id);
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }
}