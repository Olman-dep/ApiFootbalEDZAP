import {
  currentRound,
  mapFixture,
  mapStandings,
  mapStatus,
  normalizeName,
  teamCode,
  uniqueTeams,
} from './api-football.mappers.js';
import type { MappedFixture } from './api-football.mappers.js';
import { FIXTURES, STANDINGS } from './api-football.fixtures.js';

describe('mapStatus', () => {
  it.each([
    ['NS', 'scheduled'],
    ['TBD', 'scheduled'],
    ['1H', 'live'],
    ['HT', 'live'],
    ['2H', 'live'],
    ['FT', 'finished'],
    ['AET', 'finished'],
    ['PEN', 'finished'],
    ['PST', 'postponed'],
    ['CANC', 'cancelled'],
    ['AWD', 'cancelled'],
  ])('%s -> %s', (short, expected) => {
    expect(mapStatus(short)).toBe(expected);
  });

  it('un estado desconocido o ausente se trata como programado', () => {
    expect(mapStatus('XYZ')).toBe('scheduled');
    expect(mapStatus(undefined)).toBe('scheduled');
  });
});

describe('normalizeName / teamCode', () => {
  it('quita tildes y mayúsculas para comparar nombres', () => {
    expect(normalizeName('  Atlético   Madrid ')).toBe('atletico madrid');
    expect(normalizeName('Atletico Madrid')).toBe(normalizeName('Atlético Madrid'));
  });

  it('genera un código de 3 letras', () => {
    expect(teamCode('River Plate')).toBe('RIV');
    expect(teamCode('Atlético Madrid')).toBe('ATL');
    expect(teamCode('1')).toBe('UNK');
  });
});

describe('mapFixture', () => {
  it('mapea partido, ronda, estado, marcador y equipos', () => {
    const mapped = mapFixture(FIXTURES[0])!;

    expect(mapped.externalId).toBe(9001);
    expect(mapped.leagueId).toBe(128);
    expect(mapped.leagueName).toBe('Liga Profesional Argentina');
    expect(mapped.season).toBe(2026);
    expect(mapped.round).toBe('Regular Season - 9');
    expect(mapped.kickoff.toISOString()).toBe('2026-10-10T20:00:00.000Z');
    expect(mapped.status).toBe('finished');
    expect(mapped.score).toEqual({ home: 2, away: 0 });
    expect(mapped.home).toMatchObject({ externalId: 435, name: 'River Plate' });
    expect(mapped.away).toMatchObject({ externalId: 446, name: 'Lanus' });
  });

  it('un partido sin jugar tiene marcador null', () => {
    expect(mapFixture(FIXTURES[1])!.score).toEqual({ home: null, away: null });
  });

  it('descarta partidos con fecha inválida o sin equipos', () => {
    const bad = structuredClone(FIXTURES[0]);
    bad.fixture.date = 'no-es-fecha';
    expect(mapFixture(bad)).toBeNull();
  });
});

describe('uniqueTeams / currentRound', () => {
  const mapped = FIXTURES.map(mapFixture).filter((f): f is MappedFixture => f !== null);

  it('devuelve cada equipo una sola vez', () => {
    const teams = uniqueTeams(mapped);
    expect(teams.map((t) => t.externalId).sort((a, b) => a - b)).toEqual([435, 446, 451]);
  });

  it('la ronda actual es la del primer partido sin jugar', () => {
    expect(currentRound(mapped)).toBe('Regular Season - 10');
  });

  it('si todo se jugó, usa la ronda del último partido', () => {
    expect(currentRound([mapped[0]])).toBe('Regular Season - 9');
  });

  it('sin partidos no hay ronda', () => {
    expect(currentRound([])).toBeUndefined();
  });
});

describe('mapStandings', () => {
  it('aplana las zonas a una fila por equipo con local/visitante y forma', () => {
    const rows = mapStandings(STANDINGS);
    const river = rows.find((r) => r.teamExternalId === 435)!;

    expect(rows).toHaveLength(3);
    expect(river.rank).toBe(1);
    expect(river.form).toEqual(['W', 'W', 'D', 'W', 'W']);
    expect(river.home).toEqual({ played: 6, goalsFor: 12, goalsAgainst: 3 });
    expect(river.away).toEqual({ played: 6, goalsFor: 9, goalsAgainst: 5 });
  });

  it('si un equipo sale en dos tablas conserva la de más partidos jugados', () => {
    const duplicated = structuredClone(STANDINGS);
    const general = structuredClone(STANDINGS[0].league!.standings![0][0]);
    general.all!.played = 4; // tabla parcial con menos partidos
    general.rank = 9;
    duplicated[0].league!.standings!.push([general]);

    const river = mapStandings(duplicated).find((r) => r.teamExternalId === 435)!;
    expect(river.rank).toBe(1);
  });

  it('una respuesta vacía no rompe', () => {
    expect(mapStandings([])).toEqual([]);
    expect(mapStandings([{}])).toEqual([]);
  });
});
