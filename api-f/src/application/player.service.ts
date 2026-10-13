import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player, PlayerDocument } from '../infrastructure/database/schemas/player.schema.js';
import {
  PlayerSeasonStats,
  PlayerSeasonStatsDocument,
} from '../infrastructure/database/schemas/player-season-stats.schema.js';
import { Match, MatchDocument } from '../infrastructure/database/schemas/match.schema.js';

type PlayerLean = Player & { _id: Types.ObjectId };
type Avg = { shots: number; shotsOnTarget: number; minutes: number };

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private readonly playerModel: Model<PlayerDocument>,
    @InjectModel(PlayerSeasonStats.name)
    private readonly statsModel: Model<PlayerSeasonStatsDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
  ) {}

  /** GET /players/:playerId */
  async findById(playerId: string): Promise<PlayerLean> {
    this.assertObjectId(playerId);
    const player = await this.playerModel.findById(playerId).lean<PlayerLean>();
    if (!player) throw new NotFoundException(`Jugador ${playerId} no encontrado`);
    return player;
  }

  /** Plantilla actual de un equipo. */
  async findByTeam(teamId: string): Promise<PlayerLean[]> {
    return this.playerModel
      .find({ currentTeamId: this.toObjectId(teamId) })
      .sort({ position: 1, name: 1 })
      .lean<PlayerLean[]>();
  }

  /** GET /players/:playerId/props?matchId= */
  async getProps(playerId: string, matchId?: string) {
    const player = await this.findById(playerId);

 
    const avg = await this.getAverages(player._id);
    return {
      source: 'baseline',
      player: { ...this.toSummary(player), avg },
      props: this.buildBaselineProps(player, avg),
    };
  }

  /** Jugadores sanos del equipo, con sus stats de la temporada (para el motor). */
  async findAvailableByTeam(teamId: Types.ObjectId, season: number) {
    const players = await this.playerModel
      .find({ currentTeamId: teamId, injured: { $ne: true } })
      .lean<PlayerLean[]>();

    const stats = await this.statsModel
      .find({ playerId: { $in: players.map((p) => p._id) }, season })
      .lean();

    const byPlayer = new Map<string, typeof stats>();
    for (const s of stats) {
      const k = String(s.playerId);
      byPlayer.set(k, [...(byPlayer.get(k) ?? []), s]);
    }
    return players.map((p) => ({ ...p, stats: byPlayer.get(String(p._id)) ?? [] }));
  }

  // ---------- privados ----------

  /** Promedios por partido: suma todas las competiciones de la temporada más reciente. */
  private async getAverages(playerId: Types.ObjectId, season?: number): Promise<Avg> {
    const latest =
      season ??
      (await this.statsModel.findOne({ playerId }).sort({ season: -1 }).select('season').lean())
        ?.season;
    if (!latest) return { shots: 0, shotsOnTarget: 0, minutes: 0 };

    const rows = await this.statsModel.find({ playerId, season: latest }).lean();
    const t = rows.reduce(
      (a, r) => ({
        apps: a.apps + r.appearances,
        shots: a.shots + r.shots,
        sot: a.sot + r.shotsOnTarget,
        min: a.min + r.minutes,
      }),
      { apps: 0, shots: 0, sot: 0, min: 0 },
    );
    if (!t.apps) return { shots: 0, shotsOnTarget: 0, minutes: 0 };
    return { shots: t.shots / t.apps, shotsOnTarget: t.sot / t.apps, minutes: t.min / t.apps };
  }

  private async findNextMatch(teamId: Types.ObjectId) {
    return this.matchModel
      .findOne({
        status: 'scheduled',
        kickoff: { $gte: new Date() },
        $or: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      })
      .sort({ kickoff: 1 })
      .select('_id')
      .lean();
  }

  private buildBaselineProps(player: PlayerLean, avg: Avg) {
    if (player.injured) return [];
    const props: Array<{ market: string; line: number; label: string; prob: number }> = [];

    if (avg.shots > 0) {
      for (const line of [1, 2, 3]) {
        props.push({ market: 'shots', line, label: `${line}+ shots`, prob: this.probAtLeast(avg.shots, line) });
      }
    }
    if (avg.shotsOnTarget > 0) {
      for (const line of [1, 2]) {
        props.push({ market: 'shots_on_target', line, label: `${line}+ SOT`, prob: this.probAtLeast(avg.shotsOnTarget, line) });
      }
    }
    return props;
  }

  /** P(X >= k) con X ~ Poisson(lambda) */
  private probAtLeast(lambda: number, k: number): number {
    let cdf = 0;
    let term = Math.exp(-lambda);
    for (let i = 0; i < k; i++) {
      cdf += term;
      term = (term * lambda) / (i + 1);
    }
    return Number((1 - cdf).toFixed(4));
  }

  private toSummary(p: PlayerLean) {
    return { id: p._id, name: p.name, position: p.position, teamId: p.currentTeamId, injured: !!p.injured };
  }

  private toObjectId(id: string) {
    this.assertObjectId(id);
    return new Types.ObjectId(id);
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`ID inválido: ${id}`);
  }
}