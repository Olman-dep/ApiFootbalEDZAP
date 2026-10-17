import { computeLeagueAverages, computeStrength } from './team-strength.js';
import type { TeamTotals } from './team-strength.js';

const team = (
  home: [number, number, number],
  away: [number, number, number],
): TeamTotals => ({
  home: { played: home[0], goalsFor: home[1], goalsAgainst: home[2] },
  away: { played: away[0], goalsFor: away[1], goalsAgainst: away[2] },
});

describe('computeLeagueAverages', () => {
  it('promedia goles de local y de visitante con todos los equipos', () => {
    const averages = computeLeagueAverages([
      team([10, 15, 10], [10, 10, 15]),
      team([10, 12, 8], [10, 9, 13]),
    ])!;

    expect(averages.avgHomeGoals).toBeCloseTo((15 + 12) / 20, 10);
    expect(averages.avgAwayGoals).toBeCloseTo((10 + 9) / 20, 10);
  });

  it('sin partidos jugados no hay promedios', () => {
    expect(computeLeagueAverages([team([0, 0, 0], [0, 0, 0])])).toBeNull();
    expect(computeLeagueAverages([])).toBeNull();
  });
});

describe('computeStrength', () => {
  const league = { avgHomeGoals: 1.5, avgAwayGoals: 1.1 }; // promedio por equipo = 1.3

  it('sin partidos jugados es 1.0 / 1.0', () => {
    expect(computeStrength(team([0, 0, 0], [0, 0, 0]), league)).toEqual({ attack: 1, defense: 1 });
  });

  it('un equipo promedio con muchos partidos queda cerca de 1', () => {
    // 100 partidos con 1.3 goles a favor y en contra por partido
    const strength = computeStrength(team([50, 65, 65], [50, 65, 65]), league);
    expect(strength.attack).toBeCloseTo(1, 5);
    expect(strength.defense).toBeCloseTo(1, 5);
  });

  it('un equipo goleador tiene attack > 1 y buena defensa tiene defense < 1', () => {
    const strength = computeStrength(team([30, 60, 15], [30, 45, 20]), league);
    expect(strength.attack).toBeGreaterThan(1);
    expect(strength.defense).toBeLessThan(1);
  });

  it('con pocos partidos se acerca a 1 (shrinkage) en vez de disparar la fuerza', () => {
    // 1 partido en casa, 3-0: crudo sería attack 3/1.3 = 2.31
    const few = computeStrength(team([1, 3, 0], [0, 0, 0]), league);
    const many = computeStrength(team([30, 90, 0], [0, 0, 0]), league);

    expect(few.attack).toBeGreaterThan(1);
    expect(few.attack).toBeLessThan(1.5);
    expect(many.attack).toBeGreaterThan(few.attack);
  });
});
