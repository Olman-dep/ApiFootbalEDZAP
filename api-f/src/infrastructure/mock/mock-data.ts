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