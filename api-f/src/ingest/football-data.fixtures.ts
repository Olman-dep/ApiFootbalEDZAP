// Respuestas de ejemplo con la forma de football-data.org v4, solo para los tests.
import type { FdMatchesResponse, FdStandingsResponse, FdTableRow } from './football-data.mappers.js';

const competition = {
  id: 2014,
  name: 'Primera Division',
  code: 'PD',
  emblem: 'https://crests.football-data.org/PD.png',
  area: { name: 'Spain' },
};

const season = { startDate: '2026-08-15' };

const madrid = {
  id: 86,
  name: 'Real Madrid CF',
  shortName: 'Real Madrid',
  tla: 'RMA',
  crest: 'https://crests.football-data.org/86.png',
};
const barca = {
  id: 81,
  name: 'FC Barcelona',
  shortName: 'Barça',
  tla: 'FCB',
  crest: 'https://crests.football-data.org/81.png',
};
const atleti = {
  id: 78,
  name: 'Club Atlético de Madrid',
  shortName: 'Atleti',
  tla: 'ATL',
  crest: 'https://crests.football-data.org/78.png',
};

export const MATCHES: FdMatchesResponse = {
  filters: { season: '2026' },
  competition,
  matches: [
    {
      id: 9001,
      utcDate: '2026-10-10T19:00:00Z',
      status: 'FINISHED',
      matchday: 9,
      stage: 'REGULAR_SEASON',
      season,
      homeTeam: madrid,
      awayTeam: atleti,
      score: { fullTime: { home: 2, away: 0 } },
    },
    {
      id: 9002,
      utcDate: '2026-10-20T19:00:00Z',
      status: 'TIMED',
      matchday: 10,
      stage: 'REGULAR_SEASON',
      season,
      homeTeam: madrid,
      awayTeam: barca,
      score: { fullTime: { home: null, away: null } },
    },
    {
      id: 9003,
      utcDate: '2026-10-21T19:00:00Z',
      status: 'POSTPONED',
      matchday: 10,
      stage: 'REGULAR_SEASON',
      season,
      homeTeam: atleti,
      awayTeam: barca,
      score: { fullTime: { home: null, away: null } },
    },
  ],
};

const row = (
  team: { id: number; name: string },
  position: number,
  form: string,
  played: number,
  goalsFor: number,
  goalsAgainst: number,
): FdTableRow => ({ position, team, playedGames: played, form, goalsFor, goalsAgainst });

const t = (team: typeof madrid) => ({ id: team.id, name: team.name });

// Tablas TOTAL, HOME y AWAY como las devuelve la API (form viene separada por comas).
export const STANDINGS: FdStandingsResponse = {
  standings: [
    {
      stage: 'REGULAR_SEASON',
      type: 'TOTAL',
      group: null,
      table: [
        row(t(madrid), 1, 'W,W,D,W,W', 12, 24, 8),
        row(t(barca), 2, 'W,L,D,W,L', 12, 24, 10),
        row(t(atleti), 3, 'L,D,L,W,D', 12, 15, 15),
      ],
    },
    {
      stage: 'REGULAR_SEASON',
      type: 'HOME',
      group: null,
      table: [
        row(t(madrid), 1, '', 6, 14, 3),
        row(t(barca), 2, '', 6, 13, 4),
        row(t(atleti), 3, '', 6, 9, 6),
      ],
    },
    {
      stage: 'REGULAR_SEASON',
      type: 'AWAY',
      group: null,
      table: [
        row(t(madrid), 1, '', 6, 10, 5),
        row(t(barca), 2, '', 6, 11, 6),
        row(t(atleti), 3, '', 6, 6, 9),
      ],
    },
  ],
};
