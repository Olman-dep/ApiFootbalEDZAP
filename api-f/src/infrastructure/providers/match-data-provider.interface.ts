export interface MatchDto {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  league: string;
  competitionId: string;
  competition: string;
  season: number;
  round: string;
  kickoff: string;
  status: 'scheduled' | 'live' | 'finished';
  score: { home: number | null; away: number | null };
  pickSummary: {
    pick: string;
    pickCode: string;
    odds: number;
    homeWinProb: number;
    drawWinProb: number;
    awayWinProb: number;
    hasValue: boolean;
  };
}

export interface MatchDataProvider {
  getTodayMatches(): Promise<MatchDto[]>;
  getMatches(): Promise<MatchDto[]>;
  getUpcomingMatches(): Promise<MatchDto[]>;
  getMatchById(id: string): Promise<MatchDto | null>;
}