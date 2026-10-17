import { isValidObjectId } from 'mongoose';
import type { Model, Types } from 'mongoose';
import type { Match } from '../database/schemas/match.schema.js';
import type {
  MatchDataProvider,
  MatchDto,
} from './match-data-provider.interface.js';

type MatchLean = Match & { _id: Types.ObjectId };

const EMPTY_PICK: MatchDto['pickSummary'] = {
  pick: '',
  pickCode: '',
  odds: 0,
  homeWinProb: 0,
  drawWinProb: 0,
  awayWinProb: 0,
  hasValue: false,
};

export function toMatchDto(doc: MatchLean): MatchDto {
  const kickoff = new Date(doc.kickoff).toISOString();
  const ps = doc.pickSummary;

  return {
    id: doc._id.toString(),
    homeTeam: doc.homeTeam.name,
    awayTeam: doc.awayTeam.name,
    date: kickoff,
    league: doc.competitionName,
    competitionId: doc.competitionId.toString(),
    competition: doc.competitionName,
    season: doc.season,
    round: doc.round,
    kickoff,
    status: doc.status as MatchDto['status'],
    score: {
      home: doc.score?.home ?? null,
      away: doc.score?.away ?? null,
    },
    pickSummary: ps
      ? {
          pick: (ps.pick ?? '').toLowerCase(),
          pickCode: ps.pickCode ?? '',
          odds: ps.odds ?? 0,
          homeWinProb: ps.homeWinProb ?? 0,
          drawWinProb: ps.drawProb ?? 0,
          awayWinProb: ps.awayWinProb ?? 0,
          hasValue: ps.hasValue ?? false,
        }
      : { ...EMPTY_PICK },
  };
}

export class MongoMatchProvider implements MatchDataProvider {
  constructor(private readonly matchModel: Model<Match>) {}

  async getTodayMatches(): Promise<MatchDto[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const docs = await this.matchModel
      .find({ kickoff: { $gte: start, $lt: end } })
      .sort({ kickoff: 1 })
      .lean<MatchLean[]>();

    return docs.map(toMatchDto);
  }

  async getMatches(): Promise<MatchDto[]> {
    const docs = await this.matchModel
      .find()
      .sort({ kickoff: 1 })
      .lean<MatchLean[]>();

    return docs.map(toMatchDto);
  }

  async getUpcomingMatches(): Promise<MatchDto[]> {
    const docs = await this.matchModel
      .find({ status: 'scheduled', kickoff: { $gt: new Date() } })
      .sort({ kickoff: 1 })
      .lean<MatchLean[]>();

    return docs.map(toMatchDto);
  }

  async getMatchById(id: string): Promise<MatchDto | null> {
    if (!isValidObjectId(id)) return null;

    const doc = await this.matchModel.findById(id).lean<MatchLean>();
    return doc ? toMatchDto(doc) : null;
  }
}