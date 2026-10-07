import { MatchDataProvider, MatchDto } from '../providers/match-data-provider.interface.js';

function createPickSummary(
  homeWinProb: number,
  drawWinProb: number,
  awayWinProb: number,
): MatchDto['pickSummary'] {
  const pick = homeWinProb >= drawWinProb && homeWinProb >= awayWinProb ? 'home' : drawWinProb >= awayWinProb ? 'draw' : 'away';
  const pickCode = pick === 'home' ? 'H' : pick === 'draw' ? 'D' : 'A';
  return {
    pick,
    pickCode,
    odds: pick === 'home' ? 1.8 : pick === 'draw' ? 3.2 : 2.1,
    homeWinProb,
    drawWinProb,
    awayWinProb,
    hasValue: true,
  };
}

const today = new Date();
const todayStr = today.toISOString();
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);


const MOCK_MATCHES: MatchDto[] = [
  {
    id: '1',
    homeTeam: 'River Plate',
    awayTeam: 'Boca Juniors',
    date: todayStr,
    league: 'Liga Profesional Argentina',
    competitionId: 'liga-argentina',
    competition: 'Liga Profesional Argentina',
    season: 2026,
    round: 'Regular Season - 10',
    kickoff: todayStr,
    status: 'scheduled',
    score: { home: null, away: null },
    pickSummary: createPickSummary(0.55, 0.25, 0.2),
  },
  {
    id: '2',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    date: todayStr,
    league: 'La Liga',
    competitionId: 'la-liga',
    competition: 'La Liga',
    season: 2026,
    round: 'Matchday 12',
    kickoff: todayStr,
    status: 'scheduled',
    score: { home: null, away: null },
    pickSummary: createPickSummary(0.45, 0.3, 0.25),
  },
  {
    id: '3',
    homeTeam: 'River Plate',
    awayTeam: 'Boca Juniors',
    date: yesterday.toISOString(),
    league: 'Liga Profesional Argentina',
    competitionId: 'liga-argentina',
    competition: 'Liga Profesional Argentina',
    season: 2026,
    round: 'Regular Season - 9',
    kickoff: yesterday.toISOString(),
    status: 'finished',
    score: { home: 2, away: 1 },
    pickSummary: createPickSummary(0.5, 0.3, 0.2),
  },
  {
    id: '4',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    date: yesterday.toISOString(),
    league: 'La Liga',
    competitionId: 'la-liga',
    competition: 'La Liga',
    season: 2026,
    round: 'Matchday 11',
    kickoff: yesterday.toISOString(),
    status: 'live',
    score: { home: 1, away: 1 },
    pickSummary: createPickSummary(0.4, 0.35, 0.25),
  },
  {
    id: '5',
    homeTeam: 'River Plate',
    awayTeam: 'Barcelona',
    date: tomorrow.toISOString(),
    league: 'Liga Profesional Argentina',
    competitionId: 'liga-argentina',
    competition: 'Liga Profesional Argentina',
    season: 2026,
    round: 'Regular Season - 11',
    kickoff: tomorrow.toISOString(),
    status: 'scheduled',
    score: { home: null, away: null },
    pickSummary: createPickSummary(0.6, 0.25, 0.15),
  },
  {
    id: '6',
    homeTeam: 'Real Madrid',
    awayTeam: 'Boca Juniors',
    date: dayAfter.toISOString(),
    league: 'La Liga',
    competitionId: 'la-liga',
    competition: 'La Liga',
    season: 2026,
    round: 'Matchday 13',
    kickoff: dayAfter.toISOString(),
    status: 'scheduled',
    score: { home: null, away: null },
    pickSummary: createPickSummary(0.5, 0.3, 0.2),
  },
];

export class MockProvider implements MatchDataProvider {
  async getTodayMatches(): Promise<MatchDto[]> {
    const todayDate = new Date().toDateString();
    return MOCK_MATCHES.filter((match) => new Date(match.kickoff).toDateString() === todayDate);
  }

  async getMatches(): Promise<MatchDto[]> {
    return MOCK_MATCHES;
  }

  async getUpcomingMatches(): Promise<MatchDto[]> {
    const now = Date.now();
    return MOCK_MATCHES.filter((match) => match.status === 'scheduled' && new Date(match.kickoff).getTime() > now).sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
    );
  }

  async getMatchById(id: string): Promise<MatchDto | null> {
    const match = MOCK_MATCHES.find((m) => m.id === id);
    return match ?? null;
  }
}

export const TEAM_AVG_GOALS: Record<string, number> = {
  'River Plate': 1.8,
  'Boca Juniors': 1.3,
  'Real Madrid': 2.1,
  'Barcelona': 1.9,
};