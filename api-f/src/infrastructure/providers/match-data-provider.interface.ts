export interface MatchDto {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  league: string;
}

export interface MatchDataProvider {
  getTodayMatches(): Promise<MatchDto[]>;
}