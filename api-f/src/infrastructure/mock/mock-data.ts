import { MatchDataProvider, MatchDto } from '../providers/match-data-provider.interface.js';
const MOCK_MATCHES: MatchDto[] = [
  {
    id: '1',
    homeTeam: 'River Plate',
    awayTeam: 'Boca Juniors',
    date: new Date().toISOString(),
    league: 'Liga Profesional Argentina',
  },
  {
    id: '2',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    date: new Date().toISOString(),
    league: 'La Liga',
  },
];

export class MockProvider implements MatchDataProvider {
  async getTodayMatches(): Promise<MatchDto[]> {
    return MOCK_MATCHES;
  }

  
}

export const TEAM_AVG_GOALS: Record<string, number> = {
  'River Plate': 1.8,
  'Boca Juniors': 1.3,
  'Real Madrid': 2.1,
  'Barcelona': 1.9,
};