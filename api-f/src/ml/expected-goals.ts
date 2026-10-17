// Promedios de goles por defecto cuando la competición no los define.
export const DEFAULT_AVG_HOME_GOALS = 1.45;
export const DEFAULT_AVG_AWAY_GOALS = 1.15;

export interface TeamStrength {
  // Fuerza ofensiva relativa a la liga (1.0 = promedio).
  attack: number;
  // Debilidad defensiva relativa a la liga (1.0 = promedio; más bajo = mejor defensa).
  defense: number;
}

export interface ExpectedGoalsInput {
  home: TeamStrength;
  away: TeamStrength;
  avgHomeGoals?: number;
  avgAwayGoals?: number;
}

export interface ExpectedGoals {
  home: number;
  away: number;
}

/**
 * Goles esperados (lambdas) de cada equipo:
 *   lambdaLocal     = attack(local)     * defense(visitante) * avgHomeGoals
 *   lambdaVisitante = attack(visitante) * defense(local)     * avgAwayGoals
 */
export function calculateExpectedGoals(input: ExpectedGoalsInput): ExpectedGoals {
  const avgHome = input.avgHomeGoals ?? DEFAULT_AVG_HOME_GOALS;
  const avgAway = input.avgAwayGoals ?? DEFAULT_AVG_AWAY_GOALS;

  return {
    home: input.home.attack * input.away.defense * avgHome,
    away: input.away.attack * input.home.defense * avgAway,
  };
}
