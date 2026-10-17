import {
  competitionAliases,
  currentRound,
  isSameTeam,
  mapMatches,
  mapStandings,
  mapStatus,
  normalizeName,
  teamCode,
  teamKey,
  uniqueTeams,
} from './football-data.mappers.js';
import { MATCHES, STANDINGS } from './football-data.fixtures.js';

describe('mapStatus', () => {
  it.each([
    ['SCHEDULED', 'scheduled'],
    ['TIMED', 'scheduled'],
    ['IN_PLAY', 'live'],
    ['PAUSED', 'live'],
    ['FINISHED', 'finished'],
    ['AWARDED', 'finished'],
    ['POSTPONED', 'postponed'],
    ['SUSPENDED', 'postponed'],
    ['CANCELLED', 'cancelled'],
  ])('%s -> %s', (status, expected) => {
    expect(mapStatus(status)).toBe(expected);
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

describe('teamKey / isSameTeam', () => {
  it('ignora prefijos y sufijos que no distinguen al club', () => {
    expect(teamKey('Real Madrid CF')).toBe(teamKey('Real Madrid'));
    expect(teamKey('FC Barcelona')).toBe(teamKey('Barcelona'));
    expect(teamKey('Club Atlético de Madrid')).toBe(teamKey('Atlético Madrid'));
  });

  it('reconoce los equipos del seed con los nombres de la API', () => {
    const [match] = mapMatches(MATCHES);
    expect(isSameTeam('Real Madrid', match.home)).toBe(true);
    expect(isSameTeam('Atlético Madrid', match.away)).toBe(true);
    expect(isSameTeam('Barcelona', mapMatches(MATCHES)[1].away)).toBe(true);
  });

  it('no confunde equipos distintos', () => {
    const [match] = mapMatches(MATCHES);
    expect(isSameTeam('Real Sociedad', match.home)).toBe(false);
    expect(isSameTeam('Racing Club', match.away)).toBe(false);
  });
});

describe('competitionAliases', () => {
  it('La Liga del seed coincide con "Primera Division" de la API', () => {
    const aliases = competitionAliases('PD', 'Primera Division');
    expect(aliases.has(normalizeName('La Liga'))).toBe(true);
    expect(aliases.has(normalizeName('Primera Division'))).toBe(true);
    expect(aliases.has(normalizeName('Liga Profesional Argentina'))).toBe(false);
  });
});

describe('mapMatches', () => {
  it('mapea partido, jornada, estado, marcador, competición y equipos', () => {
    const mapped = mapMatches(MATCHES)[0];

    expect(mapped.externalId).toBe(9001);
    expect(mapped.leagueId).toBe(2014);
    expect(mapped.competitionCode).toBe('PD');
    expect(mapped.leagueName).toBe('La Liga'); // nombre de visualización, no "Primera Division"
    expect(mapped.country).toBe('Spain');
    expect(mapped.season).toBe(2026);
    expect(mapped.round).toBe('Jornada 9');
    expect(mapped.kickoff.toISOString()).toBe('2026-10-10T19:00:00.000Z');
    expect(mapped.status).toBe('finished');
    expect(mapped.score).toEqual({ home: 2, away: 0 });
    expect(mapped.home).toMatchObject({ externalId: 86, name: 'Real Madrid CF', tla: 'RMA' });
    expect(mapped.away).toMatchObject({ externalId: 78, shortName: 'Atleti' });
  });

  it('un partido sin jugar tiene marcador null y un aplazado queda postponed', () => {
    const mapped = mapMatches(MATCHES);
    expect(mapped[1].score).toEqual({ home: null, away: null });
    expect(mapped[1].status).toBe('scheduled'); // TIMED
    expect(mapped[2].status).toBe('postponed');
  });

  it('las fases de copa usan la etapa como ronda', () => {
    const response = structuredClone(MATCHES);
    response.matches![0].stage = 'LAST_16';
    expect(mapMatches(response)[0].round).toBe('Last 16');
  });

  it('sin season en el partido usa filters.season y, si no, deduce la temporada por la fecha', () => {
    const response = structuredClone(MATCHES);
    for (const m of response.matches!) delete m.season;
    expect(mapMatches(response)[0].season).toBe(2026);

    delete response.filters;
    response.matches![0].utcDate = '2027-03-05T19:00:00Z';
    expect(mapMatches(response)[0].season).toBe(2026); // marzo 2027 sigue en la 2026/27
  });

  it('toma la competición del partido si falta en la raíz de la respuesta', () => {
    const response = structuredClone(MATCHES);
    response.matches![0].competition = response.competition;
    delete response.competition;
    expect(mapMatches(response)[0].competitionCode).toBe('PD');
  });

  it('descarta partidos con fecha inválida o sin equipos', () => {
    const response = structuredClone(MATCHES);
    response.matches![0].utcDate = 'no-es-fecha';
    expect(mapMatches(response).map((m) => m.externalId)).toEqual([9002, 9003]);
  });

  it('una respuesta vacía o sin competición no rompe', () => {
    expect(mapMatches({})).toEqual([]);
    expect(mapMatches({ matches: MATCHES.matches })).toEqual([]);
  });
});

describe('uniqueTeams / currentRound', () => {
  const mapped = mapMatches(MATCHES);

  it('devuelve cada equipo una sola vez', () => {
    const teams = uniqueTeams(mapped);
    expect(teams.map((t) => t.externalId).sort((a, b) => a - b)).toEqual([78, 81, 86]);
  });

  it('la ronda actual es la del primer partido sin jugar', () => {
    expect(currentRound(mapped)).toBe('Jornada 10');
  });

  it('si todo se jugó, usa la ronda del último partido', () => {
    expect(currentRound([mapped[0]])).toBe('Jornada 9');
  });

  it('sin partidos no hay ronda', () => {
    expect(currentRound([])).toBeUndefined();
  });
});

describe('mapStandings', () => {
  it('une TOTAL, HOME y AWAY en una fila por equipo con local/visitante y forma', () => {
    const rows = mapStandings(STANDINGS);
    const madrid = rows.find((r) => r.teamExternalId === 86)!;

    expect(rows).toHaveLength(3);
    expect(madrid.rank).toBe(1);
    expect(madrid.form).toEqual(['W', 'W', 'D', 'W', 'W']); // "W,D,..." sin las comas
    expect(madrid.home).toEqual({ played: 6, goalsFor: 14, goalsAgainst: 3 });
    expect(madrid.away).toEqual({ played: 6, goalsFor: 10, goalsAgainst: 5 });
  });

  it('si un equipo sale en dos grupos TOTAL conserva la fila con más partidos jugados', () => {
    const duplicated = structuredClone(STANDINGS);
    const partial = structuredClone(STANDINGS.standings![0]);
    partial.table = [{ ...partial.table![0], position: 9, playedGames: 4 }];
    duplicated.standings!.push(partial);

    const madrid = mapStandings(duplicated).find((r) => r.teamExternalId === 86)!;
    expect(madrid.rank).toBe(1);
  });

  it('sin tablas HOME/AWAY los totales por lugar quedan en 0', () => {
    const onlyTotal = { standings: [STANDINGS.standings![0]] };
    const madrid = mapStandings(onlyTotal).find((r) => r.teamExternalId === 86)!;
    expect(madrid.home.played).toBe(0);
    expect(madrid.away.played).toBe(0);
  });

  it('una respuesta vacía no rompe', () => {
    expect(mapStandings({})).toEqual([]);
    expect(mapStandings({ standings: [] })).toEqual([]);
  });
});
