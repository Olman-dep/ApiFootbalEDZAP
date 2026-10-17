export interface VenueTotals {
  played: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface TeamTotals {
  home: VenueTotals;
  away: VenueTotals;
}

export interface LeagueAverages {
  avgHomeGoals: number;
  avgAwayGoals: number;
}

export interface Strength {
  attack: number;
  defense: number;
}

// Partidos "virtuales" promedio que se mezclan con los reales para que pocos
// partidos jugados no disparen la fuerza de un equipo (0 partidos -> 1.0).
const SHRINKAGE_GAMES = 5;

/** Promedios de goles de local y visitante calculados con todos los equipos de la liga. */
export function computeLeagueAverages(teams: TeamTotals[]): LeagueAverages | null {
  let homeGames = 0;
  let homeGoals = 0;
  let awayGames = 0;
  let awayGoals = 0;

  for (const t of teams) {
    homeGames += t.home.played;
    homeGoals += t.home.goalsFor;
    awayGames += t.away.played;
    awayGoals += t.away.goalsFor;
  }

  if (homeGames === 0 || awayGames === 0) return null;
  return { avgHomeGoals: homeGoals / homeGames, avgAwayGoals: awayGoals / awayGames };
}

/**
 * Fuerza relativa a la liga (1.0 = promedio), con la misma convención del seed:
 *   attack  = goles a favor por partido  / promedio por equipo y partido
 *   defense = goles en contra por partido / promedio por equipo y partido
 * (defense es debilidad defensiva: más bajo = mejor defensa).
 */
export function computeStrength(team: TeamTotals, league: LeagueAverages): Strength {
  const played = team.home.played + team.away.played;
  if (played === 0) return { attack: 1, defense: 1 };

  const perTeamAverage = (league.avgHomeGoals + league.avgAwayGoals) / 2;
  const rawAttack =
    (team.home.goalsFor + team.away.goalsFor) / played / perTeamAverage;
  const rawDefense =
    (team.home.goalsAgainst + team.away.goalsAgainst) / played / perTeamAverage;

  const weight = played / (played + SHRINKAGE_GAMES);
  return {
    attack: 1 + weight * (rawAttack - 1),
    defense: 1 + weight * (rawDefense - 1),
  };
}
