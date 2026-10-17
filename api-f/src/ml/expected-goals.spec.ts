import {
  DEFAULT_AVG_AWAY_GOALS,
  DEFAULT_AVG_HOME_GOALS,
  calculateExpectedGoals,
} from './expected-goals.js';

describe('calculateExpectedGoals', () => {
  it('con equipos promedio devuelve los promedios de la liga', () => {
    const result = calculateExpectedGoals({
      home: { attack: 1, defense: 1 },
      away: { attack: 1, defense: 1 },
      avgHomeGoals: 1.5,
      avgAwayGoals: 1.1,
    });

    expect(result.home).toBeCloseTo(1.5, 10);
    expect(result.away).toBeCloseTo(1.1, 10);
  });

  it('aplica attack(local) * defense(visitante) * avgHomeGoals y viceversa', () => {
    const result = calculateExpectedGoals({
      home: { attack: 1.4, defense: 0.8 },
      away: { attack: 0.9, defense: 1.2 },
      avgHomeGoals: 1.3,
      avgAwayGoals: 0.95,
    });

    expect(result.home).toBeCloseTo(1.4 * 1.2 * 1.3, 10);
    expect(result.away).toBeCloseTo(0.9 * 0.8 * 0.95, 10);
  });

  it('usa los promedios por defecto si no se informan', () => {
    const result = calculateExpectedGoals({
      home: { attack: 1, defense: 1 },
      away: { attack: 1, defense: 1 },
    });

    expect(result.home).toBeCloseTo(DEFAULT_AVG_HOME_GOALS, 10);
    expect(result.away).toBeCloseTo(DEFAULT_AVG_AWAY_GOALS, 10);
  });

  it('un mejor ataque local sube el lambda local y no el del visitante', () => {
    const base = calculateExpectedGoals({
      home: { attack: 1, defense: 1 },
      away: { attack: 1, defense: 1 },
    });
    const stronger = calculateExpectedGoals({
      home: { attack: 1.5, defense: 1 },
      away: { attack: 1, defense: 1 },
    });

    expect(stronger.home).toBeGreaterThan(base.home);
    expect(stronger.away).toBeCloseTo(base.away, 10);
  });
});
