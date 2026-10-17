// Formas (parciales) de las respuestas de API-Football v3 que usamos.
export interface ApiFixture {
  fixture: { id: number; date: string; status?: { short?: string } };
  league: {
    id: number;
    name: string;
    country?: string;
    logo?: string;
    season: number;
    round?: string;
  };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals?: { home: number | null; away: number | null };
}

interface ApiVenueRecord {
  played?: number;
  goals?: { for?: number; against?: number };
}

export interface ApiStandingRow {
  rank?: number;
  team: { id: number; name: string };
  form?: string | null;
  all?: ApiVenueRecord;
  home?: ApiVenueRecord;
  away?: ApiVenueRecord;
}

export interface ApiStandingsResponse {
  league?: { id: number; standings?: ApiStandingRow[][] };
}

// --- Resultados mapeados ---

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface MappedTeam {
  externalId: number;
  name: string;
  logo?: string;
}

export interface MappedFixture {
  externalId: number;
  leagueId: number;
  leagueName: string;
  country?: string;
  logo?: string;
  season: number;
  round: string;
  kickoff: Date;
  status: MatchStatus;
  home: MappedTeam;
  away: MappedTeam;
  score: { home: number | null; away: number | null };
}

export interface MappedStanding {
  teamExternalId: number;
  teamName: string;
  rank?: number;
  form: string[];
  home: { played: number; goalsFor: number; goalsAgainst: number };
  away: { played: number; goalsFor: number; goalsAgainst: number };
}

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE']);
const FINISHED = new Set(['FT', 'AET', 'PEN']);
const CANCELLED = new Set(['CANC', 'ABD', 'AWD', 'WO']);

export function mapStatus(short: string | undefined): MatchStatus {
  if (!short) return 'scheduled';
  if (LIVE.has(short)) return 'live';
  if (FINISHED.has(short)) return 'finished';
  if (short === 'PST') return 'postponed';
  if (CANCELLED.has(short)) return 'cancelled';
  return 'scheduled'; // NS, TBD y cualquier estado desconocido
}

/** Minúsculas, sin tildes y sin espacios repetidos: "Atlético  Madrid" -> "atletico madrid". */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Código de 3 letras para equipos nuevos: "River Plate" -> "RIV". */
export function teamCode(name: string): string {
  const letters = normalizeName(name).replace(/[^a-z]/g, '').toUpperCase();
  return letters.slice(0, 3) || 'UNK';
}

export function mapFixture(item: ApiFixture): MappedFixture | null {
  const kickoff = new Date(item.fixture?.date);
  if (
    !item.fixture?.id ||
    Number.isNaN(kickoff.getTime()) ||
    !item.teams?.home?.id ||
    !item.teams?.away?.id
  ) {
    return null;
  }

  return {
    externalId: item.fixture.id,
    leagueId: item.league.id,
    leagueName: item.league.name,
    country: item.league.country,
    logo: item.league.logo,
    season: item.league.season,
    round: item.league.round ?? '',
    kickoff,
    status: mapStatus(item.fixture.status?.short),
    home: { externalId: item.teams.home.id, name: item.teams.home.name, logo: item.teams.home.logo },
    away: { externalId: item.teams.away.id, name: item.teams.away.name, logo: item.teams.away.logo },
    score: { home: item.goals?.home ?? null, away: item.goals?.away ?? null },
  };
}

/** Equipos únicos que aparecen en los partidos. */
export function uniqueTeams(fixtures: MappedFixture[]): MappedTeam[] {
  const byId = new Map<number, MappedTeam>();
  for (const f of fixtures) {
    byId.set(f.home.externalId, f.home);
    byId.set(f.away.externalId, f.away);
  }
  return [...byId.values()];
}

/** Ronda "actual": la del primer partido sin jugar, o la del último si ya todos se jugaron. */
export function currentRound(fixtures: MappedFixture[]): string | undefined {
  if (fixtures.length === 0) return undefined;
  const sorted = [...fixtures].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  const pending = sorted.find((f) => f.status === 'scheduled' || f.status === 'live');
  return (pending ?? sorted[sorted.length - 1]).round || undefined;
}

const venue = (v: ApiVenueRecord | undefined) => ({
  played: v?.played ?? 0,
  goalsFor: v?.goals?.for ?? 0,
  goalsAgainst: v?.goals?.against ?? 0,
});

/**
 * Aplana las tablas de posiciones (que pueden venir en varios grupos, p. ej.
 * zonas o una tabla general) a una fila por equipo. Si un equipo aparece más
 * de una vez se conserva la fila con más partidos jugados.
 */
export function mapStandings(response: ApiStandingsResponse[]): MappedStanding[] {
  const byTeam = new Map<number, MappedStanding & { total: number }>();

  for (const entry of response) {
    for (const group of entry.league?.standings ?? []) {
      for (const row of group) {
        if (!row?.team?.id) continue;
        const total = row.all?.played ?? 0;
        const previous = byTeam.get(row.team.id);
        if (previous && previous.total >= total) continue;

        byTeam.set(row.team.id, {
          teamExternalId: row.team.id,
          teamName: row.team.name,
          rank: row.rank,
          form: (row.form ?? '').split('').filter((c) => 'WDL'.includes(c)),
          home: venue(row.home),
          away: venue(row.away),
          total,
        });
      }
    }
  }

  return [...byTeam.values()].map(({ total: _total, ...standing }) => standing);
}
