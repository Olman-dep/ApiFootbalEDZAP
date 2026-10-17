// Respuestas de ejemplo con la forma de API-Football v3, solo para los tests.
import type { ApiFixture, ApiStandingsResponse } from './api-football.mappers.js';

const league = {
  id: 128,
  name: 'Liga Profesional Argentina',
  country: 'Argentina',
  logo: 'https://media.api-sports.io/football/leagues/128.png',
  season: 2026,
};

const river = { id: 435, name: 'River Plate', logo: 'https://media.api-sports.io/football/teams/435.png' };
const boca = { id: 451, name: 'Boca Juniors', logo: 'https://media.api-sports.io/football/teams/451.png' };
const lanus = { id: 446, name: 'Lanus', logo: 'https://media.api-sports.io/football/teams/446.png' };

export const FIXTURES: ApiFixture[] = [
  {
    fixture: { id: 9001, date: '2026-10-10T20:00:00+00:00', status: { short: 'FT' } },
    league: { ...league, round: 'Regular Season - 9' },
    teams: { home: river, away: lanus },
    goals: { home: 2, away: 0 },
  },
  {
    fixture: { id: 9002, date: '2026-10-20T20:00:00+00:00', status: { short: 'NS' } },
    league: { ...league, round: 'Regular Season - 10' },
    teams: { home: river, away: boca },
    goals: { home: null, away: null },
  },
  {
    fixture: { id: 9003, date: '2026-10-21T20:00:00+00:00', status: { short: 'PST' } },
    league: { ...league, round: 'Regular Season - 10' },
    teams: { home: lanus, away: boca },
    goals: { home: null, away: null },
  },
];

const row = (
  team: { id: number; name: string },
  rank: number,
  form: string,
  home: [number, number, number],
  away: [number, number, number],
) => ({
  rank,
  team,
  form,
  all: {
    played: home[0] + away[0],
    goals: { for: home[1] + away[1], against: home[2] + away[2] },
  },
  home: { played: home[0], goals: { for: home[1], against: home[2] } },
  away: { played: away[0], goals: { for: away[1], against: away[2] } },
});

// Dos zonas, como en la liga argentina: cada equipo aparece en una sola.
export const STANDINGS: ApiStandingsResponse[] = [
  {
    league: {
      id: 128,
      standings: [
        [
          row(river, 1, 'WWDWW', [6, 12, 3], [6, 9, 5]),
          row(boca, 2, 'WLDWL', [6, 8, 5], [6, 6, 8]),
        ],
        [row(lanus, 1, 'LDLWD', [6, 7, 7], [6, 4, 9])],
      ],
    },
  },
];
