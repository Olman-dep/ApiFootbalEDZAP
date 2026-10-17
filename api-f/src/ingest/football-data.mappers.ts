// Formas (parciales) de las respuestas de football-data.org v4 que usamos.
export interface FdTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

export interface FdCompetition {
  id: number;
  name: string;
  code: string;
  emblem?: string | null;
  area?: { name?: string } | null;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status?: string;
  matchday?: number | null;
  stage?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } | null } | null;
  season?: { startDate?: string } | null;
  competition?: FdCompetition | null;
  area?: { name?: string } | null;
}

export interface FdMatchesResponse {
  filters?: { season?: string | number };
  competition?: FdCompetition | null;
  matches?: FdMatch[];
}

export interface FdTableRow {
  position?: number;
  team: { id: number; name: string };
  playedGames?: number;
  form?: string | null;
  goalsFor?: number;
  goalsAgainst?: number;
}

export interface FdStandingGroup {
  stage?: string;
  type?: string; // TOTAL | HOME | AWAY
  group?: string | null;
  table?: FdTableRow[];
}

export interface FdStandingsResponse {
  standings?: FdStandingGroup[];
}

// --- Resultados mapeados ---

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface MappedTeam {
  externalId: number;
  name: string;
  shortName?: string;
  tla?: string;
  logo?: string;
}

export interface MappedFixture {
  externalId: number;
  leagueId: number; // id numérico de la competición en football-data.org
  competitionCode: string; // PD, PL...
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

const LIVE = new Set(['IN_PLAY', 'PAUSED', 'LIVE']);
const FINISHED = new Set(['FINISHED', 'AWARDED']);
const POSTPONED = new Set(['POSTPONED', 'SUSPENDED']);

export function mapStatus(status: string | undefined): MatchStatus {
  if (!status) return 'scheduled';
  if (LIVE.has(status)) return 'live';
  if (FINISHED.has(status)) return 'finished';
  if (POSTPONED.has(status)) return 'postponed';
  if (status === 'CANCELLED') return 'cancelled';
  return 'scheduled'; // SCHEDULED, TIMED y cualquier estado desconocido
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

/** Código de 3 letras para equipos nuevos cuando la API no trae `tla`: "River Plate" -> "RIV". */
export function teamCode(name: string): string {
  const letters = normalizeName(name).replace(/[^a-z]/g, '').toUpperCase();
  return letters.slice(0, 3) || 'UNK';
}

// Palabras que no distinguen a un club ("Real Madrid CF" y "Real Madrid" son el mismo).
const NOISE = new Set([
  'fc', 'cf', 'cd', 'ud', 'sd', 'rc', 'rcd', 'ca', 'afc', 'sc', 'ac', 'as', 'sv', 'fk',
  'club', 'de', 'del', 'la', 'el', 'the',
]);

/** Clave para comparar equipos entre fuentes: "Club Atlético de Madrid" -> "atletico madrid". */
export function teamKey(name: string): string {
  return normalizeName(name)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((token) => token && !NOISE.has(token))
    .sort()
    .join(' ');
}

/** ¿El equipo guardado (por nombre) es el mismo que el de la API? Compara nombre y nombre corto. */
export function isSameTeam(storedName: string, team: MappedTeam): boolean {
  const stored = teamKey(storedName);
  if (!stored) return false;
  return [team.name, team.shortName]
    .filter((n): n is string => Boolean(n))
    .some((n) => teamKey(n) === stored);
}

// Nombres con los que mostramos las competiciones gratuitas, y alias para fusionar con el seed.
const DISPLAY_NAMES: Record<string, string> = {
  PD: 'La Liga',
  PL: 'Premier League',
  BL1: 'Bundesliga',
  SA: 'Serie A',
  FL1: 'Ligue 1',
  DED: 'Eredivisie',
  PPL: 'Primeira Liga',
  ELC: 'Championship',
  BSA: 'Campeonato Brasileiro Série A',
  CL: 'Champions League',
};

const EXTRA_ALIASES: Record<string, string[]> = {
  PD: ['laliga', 'primera division', 'la liga ea sports', 'laliga ea sports'],
  BSA: ['brasileirao', 'serie a brasil', 'campeonato brasileiro serie a'],
  CL: ['uefa champions league'],
};

export function competitionDisplayName(code: string, apiName: string): string {
  return DISPLAY_NAMES[code] ?? apiName;
}

/** Nombres normalizados con los que puede estar guardada la competición. */
export function competitionAliases(code: string, apiName: string): Set<string> {
  return new Set(
    [competitionDisplayName(code, apiName), apiName, ...(EXTRA_ALIASES[code] ?? [])].map(
      normalizeName,
    ),
  );
}

/** Temporada europea a partir de una fecha: agosto 2026 -> 2026, marzo 2027 -> 2026. */
function seasonFromDate(date: Date): number {
  return date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

function roundLabel(match: FdMatch): string {
  const stage = match.stage ?? 'REGULAR_SEASON';
  if (stage === 'REGULAR_SEASON') return match.matchday ? `Jornada ${match.matchday}` : '';
  const text = stage.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const mapTeam = (team: FdTeam): MappedTeam => ({
  externalId: team.id,
  name: team.name,
  shortName: team.shortName ?? undefined,
  tla: team.tla ?? undefined,
  logo: team.crest ?? undefined,
});

/** Convierte la respuesta de /competitions/{code}/matches. Descarta partidos incompletos. */
export function mapMatches(response: FdMatchesResponse): MappedFixture[] {
  const matches = response.matches ?? [];
  const competition = response.competition ?? matches.find((m) => m.competition)?.competition;
  if (!competition?.id || !competition.code) return [];

  const result: MappedFixture[] = [];
  for (const item of matches) {
    const kickoff = new Date(item.utcDate);
    if (!item.id || Number.isNaN(kickoff.getTime()) || !item.homeTeam?.id || !item.awayTeam?.id) {
      continue;
    }

    const startYear = item.season?.startDate ? new Date(item.season.startDate).getUTCFullYear() : NaN;
    const season = !Number.isNaN(startYear)
      ? startYear
      : Number(response.filters?.season) || seasonFromDate(kickoff);

    result.push({
      externalId: item.id,
      leagueId: competition.id,
      competitionCode: competition.code,
      leagueName: competitionDisplayName(competition.code, competition.name),
      country: competition.area?.name ?? item.area?.name,
      logo: competition.emblem ?? undefined,
      season,
      round: roundLabel(item),
      kickoff,
      status: mapStatus(item.status),
      home: mapTeam(item.homeTeam),
      away: mapTeam(item.awayTeam),
      score: {
        home: item.score?.fullTime?.home ?? null,
        away: item.score?.fullTime?.away ?? null,
      },
    });
  }
  return result;
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

const venue = (row: FdTableRow | undefined) => ({
  played: row?.playedGames ?? 0,
  goalsFor: row?.goalsFor ?? 0,
  goalsAgainst: row?.goalsAgainst ?? 0,
});

/**
 * Une las tablas TOTAL (posición y forma), HOME y AWAY en una fila por equipo.
 * Si un equipo aparece más de una vez en TOTAL (grupos) se conserva la fila con
 * más partidos jugados. Sin tablas HOME/AWAY los totales quedan en 0 y la
 * ingesta no calcula fuerza para esa competición.
 */
export function mapStandings(response: FdStandingsResponse): MappedStanding[] {
  const groups = response.standings ?? [];
  const rowsOf = (type: string) =>
    groups.filter((g) => (g.type ?? 'TOTAL') === type).flatMap((g) => g.table ?? []);

  const byVenue = (type: string) => {
    const map = new Map<number, FdTableRow>();
    for (const row of rowsOf(type)) {
      if (!row?.team?.id) continue;
      const previous = map.get(row.team.id);
      if (!previous || (previous.playedGames ?? 0) < (row.playedGames ?? 0)) map.set(row.team.id, row);
    }
    return map;
  };

  const total = byVenue('TOTAL');
  const home = byVenue('HOME');
  const away = byVenue('AWAY');

  return [...total.values()].map((row) => ({
    teamExternalId: row.team.id,
    teamName: row.team.name,
    rank: row.position,
    form: (row.form ?? '').split('').filter((c) => 'WDL'.includes(c)),
    home: venue(home.get(row.team.id)),
    away: venue(away.get(row.team.id)),
  }));
}
