import { isValidObjectId } from 'mongoose';
import type { Model, Types } from 'mongoose';
import type { Competition } from '../database/schemas/competition.schema.js';
import type { Team } from '../database/schemas/team.schema.js';
import type { TeamSeasonStats } from '../database/schemas/team-season-stats.schema.js';
import {
  DEFAULT_AVG_AWAY_GOALS,
  DEFAULT_AVG_HOME_GOALS,
  calculateExpectedGoals,
} from '../../ml/expected-goals.js';
import type { MatchDto } from './match-data-provider.interface.js';
import type {
  ExpectedGoalsResult,
  TeamStatsProvider,
} from './team-stats-provider.interface.js';

type WithId = { _id: Types.ObjectId };

export class MongoTeamStatsProvider implements TeamStatsProvider {
  constructor(
    private readonly teamModel: Model<Team>,
    private readonly statsModel: Model<TeamSeasonStats>,
    private readonly competitionModel: Model<Competition>,
  ) {}

  async getExpectedGoals(match: MatchDto): Promise<ExpectedGoalsResult | null> {
    if (!isValidObjectId(match.competitionId)) return null;

    // El DTO solo trae nombres de equipo: se buscan por nombre dentro de la competición.
    const teams = await this.teamModel
      .find({
        name: { $in: [match.homeTeam, match.awayTeam] },
        competitionIds: match.competitionId,
      })
      .lean<(Team & WithId)[]>();

    const homeTeam = teams.find((t) => t.name === match.homeTeam);
    const awayTeam = teams.find((t) => t.name === match.awayTeam);
    if (!homeTeam || !awayTeam) return null;

    const stats = await this.statsModel
      .find({
        teamId: { $in: [homeTeam._id, awayTeam._id] },
        competitionId: match.competitionId,
        season: match.season,
      })
      .lean<(TeamSeasonStats & WithId)[]>();

    const homeStats = stats.find((s) => s.teamId.equals(homeTeam._id));
    const awayStats = stats.find((s) => s.teamId.equals(awayTeam._id));
    if (!homeStats?.strength || !awayStats?.strength) return null;

    const competition = await this.competitionModel
      .findById(match.competitionId)
      .lean<(Competition & WithId) | null>();
    if (!competition) return null;

    return calculateExpectedGoals({
      home: homeStats.strength,
      away: awayStats.strength,
      avgHomeGoals: competition.avgHomeGoals ?? DEFAULT_AVG_HOME_GOALS,
      avgAwayGoals: competition.avgAwayGoals ?? DEFAULT_AVG_AWAY_GOALS,
    });
  }
}
