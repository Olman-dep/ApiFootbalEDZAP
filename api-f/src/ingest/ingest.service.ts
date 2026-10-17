import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { Competition } from '../infrastructure/database/schemas/competition.schema.js';
import { IngestRun } from '../infrastructure/database/schemas/ingest-run.schema.js';
import { Match } from '../infrastructure/database/schemas/match.schema.js';
import { Team } from '../infrastructure/database/schemas/team.schema.js';
import { TeamSeasonStats } from '../infrastructure/database/schemas/team-season-stats.schema.js';
import {
  computeLeagueAverages,
  computeStrength,
} from '../ml/team-strength.js';
import type { ApiFootballClient } from './api-football.client.js';
import {
  currentRound,
  mapFixture,
  mapStandings,
  normalizeName,
  teamCode,
  uniqueTeams,
} from './api-football.mappers.js';
import type {
  MappedFixture,
  MappedStanding,
  MappedTeam,
} from './api-football.mappers.js';

export const INGEST_CONFIG = 'INGEST_CONFIG';
export const API_FOOTBALL_CLIENT = 'API_FOOTBALL_CLIENT';

export interface IngestConfig {
  leagues: number[];
  season: number;
}

export type IngestTrigger = 'cron' | 'startup';

type WithId = { _id: Types.ObjectId };
type TeamRef = { _id: Types.ObjectId; name: string; code: string };

interface LeagueOutcome {
  leagueId: number;
  season: number;
  fixtures: number;
  teams: number;
  stats: number;
  error?: string;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private running = false;

  constructor(
    @InjectModel(Competition.name) private readonly competitionModel: Model<Competition>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(TeamSeasonStats.name) private readonly statsModel: Model<TeamSeasonStats>,
    @InjectModel(IngestRun.name) private readonly runModel: Model<IngestRun>,
    @Inject(INGEST_CONFIG) private readonly config: IngestConfig,
    @Inject(API_FOOTBALL_CLIENT) private readonly client: ApiFootballClient | null,
  ) {}

  /** Una corrida completa. Devuelve null si ya hay otra en curso o falta la API key. */
  async runOnce(trigger: IngestTrigger = 'cron') {
    if (this.running) {
      this.logger.warn('Ya hay una ingesta en curso; se omite esta corrida.');
      return null;
    }
    if (!this.client) {
      this.logger.error('Falta API_FOOTBALL_KEY en el .env; no se puede ingestar.');
      return null;
    }

    this.running = true;
    const client = this.client;
    const requestsBefore = client.requestCount;
    const run = await this.runModel.create({ source: 'apiFootball', trigger });
    const leagues: LeagueOutcome[] = [];
    const errors: string[] = [];

    try {
      for (const leagueId of this.config.leagues) {
        const outcome = await this.ingestLeague(client, leagueId, this.config.season);
        leagues.push(outcome);
        if (outcome.error) errors.push(`liga ${leagueId}: ${outcome.error}`);
      }
    } finally {
      this.running = false;
    }

    const failed = leagues.filter((l) => l.error).length;
    const status = failed === 0 ? 'success' : failed === leagues.length ? 'failed' : 'partial';

    await this.runModel.updateOne(
      { _id: (run as unknown as WithId)._id },
      {
        $set: {
          status,
          finishedAt: new Date(),
          requests: client.requestCount - requestsBefore,
          requestsRemainingToday: client.requestsRemainingToday,
          leagues,
          errorMessages: errors,
        },
      },
    );

    this.logger.log(
      `Ingesta ${status}: ${leagues.length} liga(s), ${client.requestCount - requestsBefore} petición(es).`,
    );
    return { status, leagues, errors };
  }

  private async ingestLeague(
    client: ApiFootballClient,
    leagueId: number,
    season: number,
  ): Promise<LeagueOutcome> {
    const outcome: LeagueOutcome = { leagueId, season, fixtures: 0, teams: 0, stats: 0 };

    try {
      const fixtures = (await client.getFixtures(leagueId, season))
        .map(mapFixture)
        .filter((f): f is MappedFixture => f !== null);

      if (fixtures.length === 0) {
        outcome.error = `la API no devolvió partidos para la temporada ${season}`;
        return outcome;
      }

      const competitionId = await this.upsertCompetition(fixtures);
      const teams = await this.upsertTeams(uniqueTeams(fixtures), competitionId);
      outcome.teams = teams.size;
      outcome.fixtures = await this.upsertMatches(fixtures, competitionId, teams);

      const standings = mapStandings(await client.getStandings(leagueId, season));
      outcome.stats = await this.upsertStats(standings, competitionId, season, teams);
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Liga ${leagueId}: ${outcome.error}`);
    }

    return outcome;
  }

  // --- Competición: por externalId o, si no existe, por nombre (fusiona con el seed) ---
  private async upsertCompetition(fixtures: MappedFixture[]): Promise<Types.ObjectId> {
    const first = fixtures[0];

    let existing = await this.competitionModel
      .findOne({ 'externalIds.apiFootball': first.leagueId, season: first.season })
      .lean<WithId | null>();

    if (!existing) {
      const sameSeason = await this.competitionModel
        .find({ season: first.season })
        .lean<(WithId & { name: string })[]>();
      existing =
        sameSeason.find((c) => normalizeName(c.name) === normalizeName(first.leagueName)) ?? null;
    }

    const fields = {
      name: first.leagueName,
      country: first.country,
      logoUrl: first.logo,
      currentRound: currentRound(fixtures),
      'externalIds.apiFootball': first.leagueId,
    };

    if (existing) {
      await this.competitionModel.updateOne({ _id: existing._id }, { $set: fields });
      return existing._id;
    }

    const created = await this.competitionModel.create({
      name: first.leagueName,
      country: first.country,
      logoUrl: first.logo,
      season: first.season,
      currentRound: currentRound(fixtures),
      externalIds: { apiFootball: first.leagueId },
    });
    return (created as unknown as WithId)._id;
  }

  // --- Equipos: por externalId o por nombre dentro de la competición ---
  private async upsertTeams(
    teams: MappedTeam[],
    competitionId: Types.ObjectId,
  ): Promise<Map<number, TeamRef>> {
    const known = await this.teamModel
      .find({ competitionIds: competitionId })
      .lean<(WithId & { name: string; code: string; externalIds?: Record<string, number> })[]>();

    const result = new Map<number, TeamRef>();

    for (const team of teams) {
      let doc =
        known.find((t) => t.externalIds?.apiFootball === team.externalId) ??
        known.find((t) => normalizeName(t.name) === normalizeName(team.name));

      if (!doc) {
        const byExternalId = await this.teamModel
          .findOne({ 'externalIds.apiFootball': team.externalId })
          .lean<(WithId & { name: string; code: string }) | null>();
        doc = byExternalId ?? undefined;
      }

      if (doc) {
        await this.teamModel.updateOne(
          { _id: doc._id },
          {
            $set: { 'externalIds.apiFootball': team.externalId, ...(team.logo && { crestUrl: team.logo }) },
            $addToSet: { competitionIds: competitionId },
          },
        );
        result.set(team.externalId, { _id: doc._id, name: doc.name, code: doc.code });
      } else {
        const code = teamCode(team.name);
        const created = await this.teamModel.create({
          name: team.name,
          shortName: team.name,
          code,
          crestUrl: team.logo,
          externalIds: { apiFootball: team.externalId },
          competitionIds: [competitionId],
        });
        result.set(team.externalId, {
          _id: (created as unknown as WithId)._id,
          name: team.name,
          code,
        });
      }
    }

    return result;
  }

  // --- Partidos: upsert por externalIds.apiFootball. No toca pickSummary. ---
  private async upsertMatches(
    fixtures: MappedFixture[],
    competitionId: Types.ObjectId,
    teams: Map<number, TeamRef>,
  ): Promise<number> {
    const operations = fixtures.flatMap((f) => {
      const home = teams.get(f.home.externalId);
      const away = teams.get(f.away.externalId);
      if (!home || !away) return [];

      return [
        {
          updateOne: {
            filter: { 'externalIds.apiFootball': f.externalId },
            update: {
              $set: {
                competitionId,
                competitionName: f.leagueName,
                season: f.season,
                round: f.round,
                kickoff: f.kickoff,
                status: f.status,
                homeTeamId: home._id,
                awayTeamId: away._id,
                homeTeam: { name: home.name, code: home.code },
                awayTeam: { name: away.name, code: away.code },
                score: f.score,
              },
            },
            upsert: true,
          },
        },
      ];
    });

    if (operations.length > 0) {
      await this.matchModel.bulkWrite(operations as never);
    }
    return operations.length;
  }

  // --- Estadísticas de temporada + promedios de liga con TODOS los equipos ---
  private async upsertStats(
    standings: MappedStanding[],
    competitionId: Types.ObjectId,
    season: number,
    teams: Map<number, TeamRef>,
  ): Promise<number> {
    const averages = computeLeagueAverages(standings);
    if (!averages) return 0; // temporada sin partidos jugados: se conservan los valores previos

    await this.competitionModel.updateOne({ _id: competitionId }, { $set: averages });

    const operations = standings.flatMap((s) => {
      const team = teams.get(s.teamExternalId);
      if (!team) return [];
      const strength = computeStrength(s, averages);

      return [
        {
          updateOne: {
            filter: { teamId: team._id, competitionId, season },
            update: {
              $set: {
                rank: s.rank,
                form: s.form,
                'home.played': s.home.played,
                'home.goalsFor': s.home.goalsFor,
                'home.goalsAgainst': s.home.goalsAgainst,
                'away.played': s.away.played,
                'away.goalsFor': s.away.goalsFor,
                'away.goalsAgainst': s.away.goalsAgainst,
                strength,
              },
            },
            upsert: true,
          },
        },
      ];
    });

    if (operations.length > 0) {
      await this.statsModel.bulkWrite(operations as never);
    }
    return operations.length;
  }
}
